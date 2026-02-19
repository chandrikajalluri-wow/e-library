import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import Order from '../models/Order';
import Book from '../models/Book';
import ActivityLog from '../models/ActivityLog';
import User from '../models/User';
import Address from '../models/Address';
import Membership from '../models/Membership';
import Readlist from '../models/Readlist';
import { NotificationType, MembershipName, BookStatus, OrderStatus } from '../types/enums';
import { sendNotification, notifySuperAdmins, notifyAdmins } from '../utils/notification';
import { sendEmail } from '../utils/mailer';
import { RoleName, ActivityAction } from '../types/enums';
import { getOrderStatusUpdateTemplate } from '../utils/emailTemplates';
import { generateInvoicePdfBase64 } from '../utils/pdfGenerator';

export const placeOrder = async (req: AuthRequest, res: Response) => {
    const { items, selectedAddressId } = req.body;

    try {
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
        }

        if (!selectedAddressId) {
            return res.status(400).json({ error: 'Delivery address is required' });
        }

        const address = await Address.findById(selectedAddressId);
        if (!address || address.user_id.toString() !== req.user!._id.toString()) {
            return res.status(404).json({ error: 'Address not found' });
        }

        const user = await User.findById(req.user!._id).populate('membership_id');
        if (!user) return res.status(404).json({ error: 'User not found' });

        const membership = user.membership_id as any;
        const totalItemsInOrder = items.reduce((sum, item) => sum + item.quantity, 0);

        // Basic validation for books and stock (similar to borrow checkout)
        const bookIds = items.map((item: any) => item.book_id);
        const books = await Book.find({ _id: { $in: bookIds } });
        const bookMap = new Map(books.map(b => [b._id.toString(), b]));

        let subtotal = 0;
        const orderItems = [];

        for (const item of items) {
            const book = bookMap.get(item.book_id);
            if (!book) return res.status(404).json({ error: `Book not found: ${item.book_id}` });

            if (book.noOfCopies < item.quantity) {
                return res.status(400).json({ error: `Insufficient stock for "${book.title}"` });
            }

            // Premium check removed to allow everyone to purchase premium books
            /* if (book.isPremium && !membership.canAccessPremiumBooks) {
                return res.status(403).json({
                    error: `"${book.title}" is a premium book. Upgrade to Premium membership to purchase.`
                });
            } */

            subtotal += book.price * item.quantity;
            orderItems.push({
                book_id: book._id,
                quantity: item.quantity,
                priceAtOrder: book.price
            });
        }

        const isPremium = membership?.name === MembershipName.PREMIUM;
        const deliveryFee = (subtotal >= 500 || isPremium) ? 0 : 50;
        const totalAmount = subtotal + deliveryFee;

        const estimatedDeliveryDate = new Date();
        estimatedDeliveryDate.setHours(estimatedDeliveryDate.getHours() + (isPremium ? 24 : 96)); // 24h for Premium, 4 days (96h) for Basic

        const newOrder = new Order({
            user_id: req.user!._id,
            items: orderItems,
            address_id: selectedAddressId,
            totalAmount,
            deliveryFee,
            paymentMethod: 'Cash on Delivery',
            status: 'pending',
            estimatedDeliveryDate
        });

        await newOrder.save();

        // Update book stock and create borrow records (since borrowing is the core logic)
        for (const item of items) {
            const book = bookMap.get(item.book_id)!;
            book.noOfCopies -= item.quantity;
            if (book.noOfCopies === 0) {
                book.status = BookStatus.OUT_OF_STOCK;
            }
            await book.save();
        }

        // Readlist addition moved to updateOrderStatus (DELIVERED status)

        // Send notification to user
        await sendNotification(
            NotificationType.ORDER,
            `Order confirmed: ${totalItemsInOrder} book(s) will be delivered to ${address.city}`,
            req.user!._id as any,
            null as any,
            newOrder._id.toString()
        );

        // Notify Admins
        await notifyAdmins(
            `New Order: ${user.name} placed order #${newOrder._id.toString().slice(-8).toUpperCase()} for ${totalItemsInOrder} item(s)`,
            NotificationType.ORDER,
            bookIds,
            newOrder._id.toString()
        );

        res.status(201).json({
            message: 'Order placed successfully',
            order: newOrder
        });

    } catch (err: any) {
        console.error('Order error:', err);
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
};
// Admin: Get All Orders
export const getAllOrders = async (req: AuthRequest, res: Response) => {
    try {
        const { status, search, startDate, endDate, sort, membership, page, limit, reason } = req.query;

        let filter: any = {};

        // Reason filter
        if (reason && reason !== 'all') {
            if (reason === 'Others') {
                filter.returnReason = { $nin: ['Damaged Book', 'Pages Missing', 'Print Error'] };
            } else {
                filter.returnReason = reason;
            }
        }

        // Status filter
        if (status && status !== 'all') {
            if (typeof status === 'string' && status.includes(',')) {
                filter.status = { $in: status.split(',') };
            } else {
                filter.status = status;
            }
        }

        // Date range filter
        if (startDate && endDate) {
            filter.createdAt = {
                $gte: new Date(startDate as string),
                $lte: new Date(endDate as string)
            };
        }

        // Base user filter logic for search and membership
        let userIds: any[] = [];
        let hasUserFilter = false;

        // Search by User Name
        if (search) {
            const users = await User.find({
                name: { $regex: search, $options: 'i' }
            }).select('_id');
            userIds = users.map(user => user._id);
            hasUserFilter = true;
        }

        // Membership filter (DB-level)
        if (membership && membership !== 'all') {
            const membershipDoc = await Membership.findOne({ name: membership });
            if (membershipDoc) {
                const usersWithMembership = await User.find({ membership_id: membershipDoc._id }).select('_id');
                const membershipUserIds = usersWithMembership.map(u => u._id.toString());

                if (hasUserFilter) {
                    // Intersection of search results and membership results
                    userIds = userIds.filter(id => membershipUserIds.includes(id.toString()));
                } else {
                    userIds = membershipUserIds;
                }
                hasUserFilter = true;
            }
        }

        if (hasUserFilter) {
            filter.user_id = { $in: userIds };
        }

        // Search by Order ID (Add to $or if search is present)
        if (search) {
            filter.$or = [
                { user_id: filter.user_id },
                {
                    $expr: {
                        $regexMatch: {
                            input: { $toString: "$_id" },
                            regex: search,
                            options: "i"
                        }
                    }
                }
            ];
            delete filter.user_id; // Moved into $or
        }

        // Sorting
        let sortOption: any = { createdAt: -1 };
        if (sort === 'oldest') {
            sortOption = { createdAt: 1 };
        } else if (sort === 'total_asc') {
            sortOption = { totalAmount: 1 };
        } else if (sort === 'total_desc') {
            sortOption = { totalAmount: -1 };
        }

        // Pagination
        const pageNum = parseInt(page as string) || 1;
        const limitNum = parseInt(limit as string) || 10;
        const skip = (pageNum - 1) * limitNum;

        const totalOrders = await Order.countDocuments(filter);
        const totalPages = Math.ceil(totalOrders / limitNum);

        // Fetch counts for stats (within the same filter)
        const counts = {
            total: totalOrders,
            pending: await Order.countDocuments({ ...filter, status: 'pending' }),
            processing: await Order.countDocuments({ ...filter, status: 'processing' }),
            shipped: await Order.countDocuments({ ...filter, status: 'shipped' }),
            delivered: await Order.countDocuments({ ...filter, status: 'delivered' }),
            cancelled: await Order.countDocuments({ ...filter, status: 'cancelled' }),
        };

        const orders = await Order.find(filter)
            .populate({
                path: 'user_id',
                select: 'name email phone membership_id',
                populate: { path: 'membership_id', select: 'name displayName' }
            })
            .populate({
                path: 'items.book_id',
                select: 'title cover_image_url price addedBy',
                populate: { path: 'addedBy', select: 'name' }
            })
            .populate('address_id')
            .sort(sortOption)
            .skip(skip)
            .limit(limitNum);

        res.status(200).json({
            orders,
            totalOrders,
            totalPages,
            currentPage: pageNum,
            limit: limitNum,
            counts
        });
    } catch (error: any) {
        console.error('Get all orders error:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
};

const isStatusTransitionAllowed = (current: string, next: string): boolean => {
    const sequence = [
        OrderStatus.PENDING,
        OrderStatus.PROCESSING,
        OrderStatus.SHIPPED,
        OrderStatus.DELIVERED
    ];

    const currentIndex = sequence.indexOf(current as OrderStatus);
    const nextIndex = sequence.indexOf(next as OrderStatus);

    // If both are in the standard sequence
    if (currentIndex !== -1 && nextIndex !== -1) {
        return nextIndex === currentIndex + 1;
    }

    // Special cases
    if (next === OrderStatus.CANCELLED) {
        return current === OrderStatus.PENDING || current === OrderStatus.PROCESSING;
    }

    if (current === OrderStatus.RETURN_REQUESTED) {
        return next === OrderStatus.RETURN_ACCEPTED || next === OrderStatus.RETURN_REJECTED || next === OrderStatus.REFUND_INITIATED;
    }

    if (current === OrderStatus.RETURN_ACCEPTED) {
        return next === OrderStatus.RETURNED || next === OrderStatus.REFUND_INITIATED;
    }

    if (current === OrderStatus.RETURNED) {
        return next === OrderStatus.PROCESSING || next === OrderStatus.REFUND_INITIATED;
    }

    if (current === OrderStatus.REFUND_INITIATED) {
        return next === OrderStatus.REFUNDED;
    }

    return false;
};

// Admin: Update Order Status
export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = Object.values(OrderStatus) as string[];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const order = await Order.findById(id).populate('user_id', 'name email');
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const previousStatus = order.status;

        // Enforce sequential status updates
        if (previousStatus !== status && !isStatusTransitionAllowed(previousStatus, status)) {
            return res.status(400).json({
                error: `Invalid status transition from ${previousStatus} to ${status}. Standard orders must follow the sequential flow: Pending → Processing → Shipped → Delivered. Cancellation is allowed from Pending or Processing.`
            });
        }

        // All admins now update all orders

        // Prevent transition to REFUNDED if refundDetails are missing
        if (status === OrderStatus.REFUNDED && !order.refundDetails?.accountNumber) {
            return res.status(400).json({ error: 'Cannot mark as Refunded. This user has not submitted bank details yet. Please wait for the user to provide their account info.' });
        }

        order.status = status;

        // Revert stock for CANCELLED/RETURNED
        if ((status === OrderStatus.CANCELLED || status === OrderStatus.RETURNED) && previousStatus !== status) {
            for (const item of order.items) {
                const book = await Book.findById(item.book_id);
                if (book) {
                    book.noOfCopies += item.quantity;
                    if (book.status === BookStatus.OUT_OF_STOCK && book.noOfCopies > 0) {
                        book.status = BookStatus.AVAILABLE;
                    }
                    await book.save();
                }
            }

            if (status === OrderStatus.RETURNED || status === OrderStatus.CANCELLED) {
                // Remove permanent Readlist entries
                await Readlist.deleteMany({
                    user_id: order.user_id,
                    book_id: { $in: order.items.map(i => i.book_id) },
                    dueDate: null
                });
            }
        }

        if (status === OrderStatus.DELIVERED && (!order.deliveredAt || previousStatus !== OrderStatus.DELIVERED)) {
            order.deliveredAt = new Date();
            const user = await User.findById(order.user_id).populate('membership_id');
            const membership = user?.membership_id as any;
            const accessDuration = membership?.accessDuration || 14;
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + accessDuration);

            for (const item of order.items) {
                await Readlist.findOneAndUpdate(
                    { user_id: order.user_id, book_id: item.book_id },
                    {
                        status: 'active',
                        addedAt: new Date(),
                        dueDate: dueDate, // Apply membership-based duration
                        source: 'order'
                    },
                    { upsert: true }
                );
            }
        }

        // Send In-App Notification for standard status updates
        if ([OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED, OrderStatus.CANCELLED].includes(status as OrderStatus) && previousStatus !== status) {
            const statusLabels: Record<string, string> = {
                [OrderStatus.PROCESSING]: 'is being processed',
                [OrderStatus.SHIPPED]: 'has been shipped',
                [OrderStatus.DELIVERED]: 'has been delivered',
                [OrderStatus.CANCELLED]: 'has been cancelled'
            };

            await sendNotification(
                NotificationType.ORDER,
                `Your order #${order._id.toString().slice(-8).toUpperCase()} ${statusLabels[status] || status}.`,
                order.user_id as any,
                null as any,
                order._id.toString()
            );
        }

        // Send In-App Notification for Return Decisions (now Exchange)
        if ((status === OrderStatus.RETURNED || status === OrderStatus.RETURN_REJECTED) && previousStatus !== status) {
            const isApproved = status === OrderStatus.RETURNED;
            const message = isApproved
                ? `Your exchange request for Order #${order._id.toString().slice(-8).toUpperCase()} has been APPROVED.`
                : `Your exchange request for Order #${order._id.toString().slice(-8).toUpperCase()} has been REJECTED.`;

            await sendNotification(
                NotificationType.ORDER,
                message,
                order.user_id as any,
                null as any,
                order._id.toString()
            );
        }

        // Handle Refund Notifications
        if ((status === OrderStatus.REFUND_INITIATED || status === OrderStatus.REFUNDED) && previousStatus !== status) {
            const message = status === OrderStatus.REFUND_INITIATED
                ? `Refund initiated for Order #${order._id.toString().slice(-8).toUpperCase()}. Please provide your bank details for processing.`
                : `Refund completed for Order #${order._id.toString().slice(-8).toUpperCase()} and amount has been credited.`;

            await sendNotification(
                NotificationType.ORDER,
                message,
                order.user_id as any,
                null as any,
                order._id.toString()
            );
        }

        await order.save();

        await new ActivityLog({
            user_id: req.user!._id,
            action: status === OrderStatus.RETURN_REQUESTED ? ActivityAction.EXCHANGE_REQUEST_UPDATED : ActivityAction.ORDER_STATUS_UPDATED,
            description: `Order #${order._id} status updated to ${status} by ${req.user!.name}`,
        }).save();

        // Send Email Notification
        const populatedOrder = await Order.findById(order._id)
            .populate('items.book_id', 'title')
            .populate('address_id');

        const user = order.user_id as any;
        const emailSubject = `Your Order Status Update - #${order._id.toString().slice(-8).toUpperCase()}`;
        const emailText = `
Hi ${user.name},

Your order #${order._id.toString().slice(-8).toUpperCase()} status has been updated to: ${status.toUpperCase().replace(/_/g, ' ')}.

Thank you for choosing BookStack!

— BookStack Team
        `;

        const attachments = [];
        if (['shipped', 'delivered'].includes(status.toLowerCase())) {
            try {
                const pdfBase64 = await generateInvoicePdfBase64(populatedOrder || order);
                attachments.push({
                    name: `Invoice_${order._id.toString().slice(-8).toUpperCase()}.pdf`,
                    content: pdfBase64
                });
            } catch (pdfErr) {
                console.error('Failed to generate invoice PDF:', pdfErr);
            }
        }

        sendEmail(
            user.email,
            emailSubject,
            emailText,
            getOrderStatusUpdateTemplate(user.name, populatedOrder || order, status),
            attachments
        ).catch(err =>
            console.error('Failed to send order status email:', err)
        );

        res.status(200).json({ message: 'Order status updated successfully', order });
    } catch (error: any) {
        console.error('Update order status error:', error);
        res.status(500).json({ error: 'Failed to update order status' });
    }
};

// User: Submit Refund Bank Details
export const submitRefundDetails = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { accountName, bankName, accountNumber, ifscCode } = req.body;
        const userId = req.user!._id;

        if (!accountName || !bankName || !accountNumber || !ifscCode) {
            return res.status(400).json({ error: 'All bank details are required' });
        }

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Check ownership
        if (order.user_id.toString() !== userId.toString()) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Check status
        if (order.status !== OrderStatus.REFUND_INITIATED) {
            return res.status(400).json({ error: 'Refund not initiated for this order' });
        }

        order.refundDetails = {
            accountName,
            bankName,
            accountNumber,
            ifscCode,
            submittedAt: new Date()
        };

        await order.save();

        // Notify Admins
        await notifyAdmins(
            `Refund Details Submitted: User ${req.user!.name} provided bank info for Order #${order._id.toString().slice(-8).toUpperCase()}`,
            NotificationType.ORDER,
            order.items.map(i => i.book_id.toString()),
            order._id.toString()
        );

        res.status(200).json({ message: 'Refund details submitted successfully', order });
    } catch (error: any) {
        console.error('Submit refund details error:', error);
        res.status(500).json({ error: 'Failed to submit refund details' });
    }
};


// Admin: Bulk Update Order Status
export const bulkUpdateOrderStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { orderIds, status } = req.body;

        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            return res.status(400).json({ error: 'No orders selected' });
        }

        const validStatuses = Object.values(OrderStatus) as string[];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // All admins now bulk update all orders

        let query: any = { _id: { $in: orderIds } };

        // Fetch orders to check their current status and handle side effects
        const orders = await Order.find(query).populate('user_id', 'name email');

        let modifiedCount = 0;
        let skippedCount = 0;

        for (const order of orders) {
            const previousStatus = order.status;

            // Skip if no change or invalid transition
            if (previousStatus === status || !isStatusTransitionAllowed(previousStatus, status)) {
                skippedCount++;
                continue;
            }

            // Prevent transition to REFUNDED if refundDetails are missing
            if (status === OrderStatus.REFUNDED && !order.refundDetails?.accountNumber) {
                skippedCount++;
                continue;
            }

            // Apply side effects as in updateOrderStatus
            order.status = status;

            if (status === OrderStatus.RETURNED || status === OrderStatus.CANCELLED) {
                // Remove permanent Readlist entries
                await Readlist.deleteMany({
                    user_id: order.user_id,
                    book_id: { $in: order.items.map(i => i.book_id) },
                    dueDate: null
                });
            }

            // Handle DELIVERED
            if (status === OrderStatus.DELIVERED && (!order.deliveredAt || previousStatus !== OrderStatus.DELIVERED)) {
                order.deliveredAt = new Date();
                const user = await User.findById(order.user_id).populate('membership_id');
                const membership = user?.membership_id as any;
                const accessDuration = membership?.accessDuration || 14;
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + accessDuration);

                for (const item of order.items) {
                    await Readlist.findOneAndUpdate(
                        { user_id: order.user_id, book_id: item.book_id },
                        {
                            status: 'active',
                            addedAt: new Date(),
                            dueDate: dueDate,
                            source: 'order'
                        },
                        { upsert: true }
                    );
                }
            }

            await new ActivityLog({
                user_id: req.user!._id,
                action: status === OrderStatus.RETURN_REQUESTED ? ActivityAction.EXCHANGE_REQUEST_UPDATED : ActivityAction.ORDER_STATUS_UPDATED,
                description: `Order #${order._id} status updated to ${status} by ${req.user!.name}`,
            }).save();

            await order.save();

            // Send In-App Notification
            const statusLabels: Record<string, string> = {
                [OrderStatus.PROCESSING]: 'is being processed',
                [OrderStatus.SHIPPED]: 'has been shipped',
                [OrderStatus.DELIVERED]: 'has been delivered',
                [OrderStatus.CANCELLED]: 'has been cancelled',
                [OrderStatus.RETURNED]: 'exchange has been approved',
                [OrderStatus.RETURN_REJECTED]: 'exchange has been rejected'
            };

            await sendNotification(
                NotificationType.ORDER,
                `Your order #${order._id.toString().slice(-8).toUpperCase()} ${statusLabels[status] || status}.`,
                order.user_id as any,
                null as any,
                order._id.toString()
            );

            modifiedCount++;
        }

        res.status(200).json({
            message: `Successfully updated ${modifiedCount} orders to ${status}. ${skippedCount} orders were skipped due to invalid status transitions.`,
            modifiedCount,
            skippedCount
        });
    } catch (error: any) {
        console.error('Bulk update order status error:', error);
        res.status(500).json({ error: 'Failed to perform bulk update' });
    }
};

// Admin: Get Order By ID
export const getOrderById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const order = await Order.findById(id)
            .populate('user_id', 'name email phone')
            .populate({
                path: 'items.book_id',
                select: 'title cover_image_url price addedBy',
                populate: { path: 'addedBy', select: 'name' }
            })
            .populate('address_id');

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // All admins now view all orders/items

        res.status(200).json(order);
    } catch (error: any) {
        console.error('Get order by ID error:', error);
        res.status(500).json({ error: 'Failed to fetch order details' });
    }
};

// User: Get My Orders
export const getMyOrders = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!._id;
        const { status, sort } = req.query;

        let query: any = { user_id: userId };

        if (status && status !== 'all') {
            if (typeof status === 'string' && status.includes(',')) {
                query.status = { $in: status.split(',') };
            } else {
                query.status = status;
            }
        }

        // Determine sort object
        let sortObj: any = { createdAt: -1 }; // Default: Newest
        if (sort === 'oldest') sortObj = { createdAt: 1 };
        else if (sort === 'price_high') sortObj = { totalAmount: -1 };
        else if (sort === 'price_low') sortObj = { totalAmount: 1 };

        const orders = await Order.find(query)
            .populate({
                path: 'items.book_id',
                select: 'title cover_image_url price author addedBy',
                populate: { path: 'addedBy', select: 'name' }
            })
            .populate('address_id')
            .sort(sortObj);

        res.status(200).json(orders);
    } catch (error: any) {
        console.error('Get my orders error:', error);
        res.status(500).json({ error: 'Failed to fetch your orders' });
    }
};

// User: Cancel My Own Order
export const cancelOwnOrder = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!._id;

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Check ownership
        if (order.user_id.toString() !== userId.toString()) {
            return res.status(403).json({ error: 'Unauthorized to cancel this order' });
        }

        // Check status
        if (!['pending', 'processing'].includes(order.status)) {
            return res.status(400).json({ error: `Cannot cancel order in ${order.status} status` });
        }

        // Revert stock
        for (const item of order.items) {
            const book = await Book.findById(item.book_id);
            if (book) {
                book.noOfCopies += item.quantity;
                // If status was OUT_OF_STOCK, it might be available now
                if (book.status === BookStatus.OUT_OF_STOCK && book.noOfCopies > 0) {
                    book.status = BookStatus.AVAILABLE;
                }
                await book.save();
            }
        }

        // Update order status
        order.status = 'cancelled' as OrderStatus;
        await order.save();

        // Send Notification
        await sendNotification(
            NotificationType.ORDER,
            `Order cancelled: Your order #${order._id.toString().slice(-8).toUpperCase()} has been cancelled and stock has been reverted.`,
            userId as any,
            null as any,
            order._id.toString()
        );

        res.status(200).json({ message: 'Order cancelled successfully', order });
    } catch (error: any) {
        console.error('Cancel order error:', error);
        res.status(500).json({ error: 'Failed to cancel order' });
    }
};

// User: Get single Order By ID (for invoice/details)
export const getMyOrderById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!._id;

        const order = await Order.findById(id)
            .populate({
                path: 'items.book_id',
                select: 'title cover_image_url price author addedBy',
                populate: { path: 'addedBy', select: 'name' }
            })
            .populate('address_id');

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Check ownership
        if (order.user_id.toString() !== userId.toString()) {
            return res.status(403).json({ error: 'Unauthorized to view this order' });
        }

        res.status(200).json(order);
    } catch (error: any) {
        console.error('Get my order by ID error:', error);
        res.status(500).json({ error: 'Failed to fetch order details' });
    }
};

// User: Request Return Order (Now Exchange)
export const requestReturnOrder = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const userId = req.user!._id;

        if (!reason) {
            return res.status(400).json({ error: 'Reason for exchange is required' });
        }

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Check ownership
        if (order.user_id.toString() !== userId.toString()) {
            return res.status(403).json({ error: 'Unauthorized to request exchange for this order' });
        }

        // Check status - can only exchange if delivered
        if (order.status !== OrderStatus.DELIVERED) {
            return res.status(400).json({ error: `Cannot request exchange for order with status: ${order.status}` });
        }

        // Check 7-day window
        const deliveryDateStr = order.deliveredAt || (order as any).updatedAt || order.createdAt;
        if (!deliveryDateStr) {
            return res.status(400).json({ error: 'Delivery date not found. Please contact support.' });
        }

        const deliveredAt = new Date(deliveryDateStr);
        const now = new Date();
        const diffInDays = (now.getTime() - deliveredAt.getTime()) / (1000 * 3600 * 24);

        if (diffInDays > 7) {
            return res.status(400).json({ error: 'Exchange window has expired (7 days from delivery)' });
        }

        // Update status and reason
        order.status = OrderStatus.RETURN_REQUESTED;
        order.returnReason = reason;

        // Handle Image Upload
        if (req.file) {
            order.exchangeImageUrl = (req.file as any).path; // Cloudinary URL
        }

        await order.save();

        // Notify Admins
        // await notifySuperAdmins(`New Exchange Request for Order #${order._id.toString().slice(-8).toUpperCase()} from ${req.user!.name}`);

        // Notify User
        await sendNotification(
            NotificationType.ORDER,
            `Exchange request submitted for Order #${order._id.toString().slice(-8).toUpperCase()}. Awaiting admin approval.`,
            userId as any,
            null as any,
            order._id.toString()
        );

        res.status(200).json({ message: 'Exchange request submitted successfully', order });
    } catch (error: any) {
        console.error('Request exchange error:', error);
        res.status(500).json({ error: 'Failed to submit exchange request' });
    }
};

// Admin/User: Get Order Invoice PDF
export const getOrderInvoice = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const order = await Order.findById(id)
            .populate('user_id', 'name email')
            .populate('items.book_id', 'title cover_image_url price author addedBy')
            .populate('address_id');

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const userRole = (req.user!.role_id as any).name;
        const currentUserId = req.user!._id.toString();

        // Check permission (User can only see own, Admin can see all, SUPER_ADMIN can see all)
        if (userRole !== RoleName.SUPER_ADMIN && userRole !== RoleName.ADMIN && order.user_id._id.toString() !== currentUserId) {
            return res.status(403).json({ error: 'Unauthorized to view this invoice' });
        }

        let orderToGenerate = order.toObject();

        // If ADMIN (Seller), filter items and recalculate totals for the PDF
        if (userRole === RoleName.ADMIN) {
            const filteredItems = orderToGenerate.items.filter((item: any) =>
                item.book_id && item.book_id.addedBy && item.book_id.addedBy.toString() === currentUserId
            );

            if (filteredItems.length === 0) {
                return res.status(403).json({ error: 'Unauthorized to view this invoice' });
            }

            orderToGenerate.items = filteredItems;
            // Recalculate subtotal and total for the seller-specific invoice
            const subtotal = filteredItems.reduce((sum: number, item: any) => sum + (item.priceAtOrder * item.quantity), 0);
            orderToGenerate.totalAmount = subtotal + order.deliveryFee;
        }

        const pdfBase64 = await generateInvoicePdfBase64(orderToGenerate);
        const pdfBuffer = Buffer.from(pdfBase64, 'base64');

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=Invoice_${orderToGenerate._id.toString().toUpperCase()}.pdf`,
            'Content-Length': pdfBuffer.length
        });

        res.send(pdfBuffer);
    } catch (error: any) {
        console.error(`[InvoiceError] Failed to generate invoice for order ${req.params.id}:`, error);
        res.status(500).json({ error: 'Failed to generate invoice: ' + error.message });
    }
};
