import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import Order from '../models/Order';
import Book from '../models/Book';
import ActivityLog from '../models/ActivityLog';
import User from '../models/User';
import Address from '../models/Address';
import Membership from '../models/Membership';
import Borrow from '../models/Borrow';
import Readlist from '../models/Readlist';
import { NotificationType, BorrowStatus, MembershipName, BookStatus, OrderStatus } from '../types/enums';
import { sendNotification, notifySuperAdmins, notifyAdmins } from '../utils/notification';
import { sendEmail } from '../utils/mailer';
import { RoleName } from '../types/enums';

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

        const deliveryFee = subtotal > 50 ? 0 : 50;
        const totalAmount = subtotal + deliveryFee;

        const estimatedDeliveryDate = new Date();
        const isPremium = membership?.name === MembershipName.PREMIUM;
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
            null as any
        );

        // Notify Admins
        await notifyAdmins(
            `New Order: ${user.name} placed order #${newOrder._id.toString().slice(-8).toUpperCase()} for ${totalItemsInOrder} item(s)`,
            NotificationType.ORDER
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
        const { status, search, startDate, endDate, sort, membership } = req.query;

        // Build filter object
        let filter: any = {};

        if (status && status !== 'all') {
            filter.status = status;
        }

        if (startDate && endDate) {
            filter.createdAt = {
                $gte: new Date(startDate as string),
                $lte: new Date(endDate as string)
            };
        }

        // Search by User Name or Order ID
        if (search) {
            const users = await User.find({
                name: { $regex: search, $options: 'i' }
            }).select('_id');

            const userIds = users.map(user => user._id);

            filter.$or = [
                { _id: search }, // Allow searching strictly by Order ID
                { user_id: { $in: userIds } } // Or by User Name
            ];

            // If the search term is not a valid ObjectId, only search by user name
            const isValidObjectId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);
            if (!isValidObjectId(search as string)) {
                filter.$or = [{ user_id: { $in: userIds } }];
            }
        }

        let sortOption: any = { createdAt: -1 };
        if (sort === 'oldest') {
            sortOption = { createdAt: 1 };
        } else if (sort === 'total_asc') {
            sortOption = { totalAmount: 1 };
        } else if (sort === 'total_desc') {
            sortOption = { totalAmount: -1 };
        }

        // Fetch orders and populate user
        let orders = await Order.find(filter)
            .populate({
                path: 'user_id',
                select: 'name email phone membership_id',
                populate: { path: 'membership_id', select: 'name displayName' }
            })
            .populate('items.book_id', 'title cover_image_url price')
            .populate('address_id')
            .sort(sortOption);

        // Filter by membership in memory if provided (since it's a deep population filter)
        if (membership && membership !== 'all') {
            orders = orders.filter((order: any) => {
                const userMembership = order.user_id?.membership_id?.name;
                return userMembership === membership;
            });
        }

        res.status(200).json(orders);
    } catch (error: any) {
        console.error('Get all orders error:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
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
        order.status = status;

        // Revert stock/borrows for CANCELLED/RETURNED
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

            if (status === OrderStatus.RETURNED) {
                await Borrow.updateMany(
                    { order_id: order._id },
                    { $set: { status: BorrowStatus.RETURNED, returned_date: new Date() } }
                );
                // Also remove permanent Readlist entries
                await Readlist.deleteMany({
                    user_id: order.user_id,
                    book_id: { $in: order.items.map(i => i.book_id) },
                    dueDate: null
                });
            } else if (status === OrderStatus.CANCELLED) {
                await Borrow.deleteMany({ order_id: order._id });
                // Also remove permanent Readlist entries
                await Readlist.deleteMany({
                    user_id: order.user_id,
                    book_id: { $in: order.items.map(i => i.book_id) },
                    dueDate: null
                });
            }
        }

        // Handle RETURN_REJECTED: Revert borrow status from return_requested back to borrowed
        if (status === OrderStatus.RETURN_REJECTED && previousStatus === OrderStatus.RETURN_REQUESTED) {
            const borrows = await Borrow.find({ order_id: order._id });
            for (const borrow of borrows) {
                const isOverdue = borrow.return_date < new Date();
                borrow.status = isOverdue ? BorrowStatus.OVERDUE : BorrowStatus.BORROWED;
                await borrow.save();
            }
        }

        if (status === OrderStatus.DELIVERED && previousStatus !== OrderStatus.DELIVERED) {
            const user = await User.findById(order.user_id).populate('membership_id');
            const membership = user?.membership_id as any;
            const borrowDuration = membership?.borrowDuration || 14;
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + borrowDuration);

            for (const item of order.items) {
                await Readlist.findOneAndUpdate(
                    { user_id: order.user_id, book_id: item.book_id },
                    {
                        status: 'active',
                        addedAt: new Date(),
                        dueDate: dueDate // Apply membership-based duration
                    },
                    { upsert: true }
                );
            }
        }

        await order.save();

        // Send In-App Notification for Return Decisions
        if (status === OrderStatus.RETURNED || status === OrderStatus.RETURN_REJECTED) {
            const isApproved = status === OrderStatus.RETURNED;
            const message = isApproved
                ? `Your return request for Order #${order._id.toString().slice(-8).toUpperCase()} has been APPROVED.`
                : `Your return request for Order #${order._id.toString().slice(-8).toUpperCase()} has been REJECTED.`;

            await sendNotification(
                NotificationType.BORROW,
                message,
                order.user_id as any,
                null as any
            );
        }
        await new ActivityLog({
            user_id: req.user!._id,
            action: `Order Status Updated`,
            description: `Order #${order._id} status updated to ${status} by ${req.user!.name}`,
        }).save();

        const userRole = (req.user!.role_id as any).name;
        // if (userRole === RoleName.ADMIN) {
        //     await notifySuperAdmins(`Admin ${req.user!.name} updated order #${order._id} status to ${status.toUpperCase()}`);
        // }

        // Send Email Notification
        const user = order.user_id as any;
        const emailSubject = `Your Order Status Update - #${order._id}`;
        const emailText = `
Hi ${user.name},

Your order #${order._id} status has been updated to: ${status.toUpperCase().replace(/_/g, ' ')}.

Thank you for choosing BookStack!

— BookStack Team
        `;

        sendEmail(user.email, emailSubject, emailText).catch(err =>
            console.error('Failed to send order status email:', err)
        );

        res.status(200).json({ message: 'Order status updated successfully', order });
    } catch (error: any) {
        console.error('Update order status error:', error);
        res.status(500).json({ error: 'Failed to update order status' });
    }
};

// Admin: Bulk Update Order Status
export const bulkUpdateOrderStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { orderIds, status } = req.body;

        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            return res.status(400).json({ error: 'No orders selected' });
        }

        const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const result = await Order.updateMany(
            { _id: { $in: orderIds } },
            { $set: { status: status } }
        );

        // Optionally send emails for each, but for bulk it might be noisy. 
        // For now, just update the DB.

        res.status(200).json({
            message: `Successfully updated ${result.modifiedCount} orders to ${status}`,
            modifiedCount: result.modifiedCount
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
            .populate('user_id', 'name email')
            .populate('items.book_id', 'title cover_image_url price')
            .populate('address_id');

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

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

        const orders = await Order.find({ user_id: userId })
            .populate('items.book_id', 'title cover_image_url price author')
            .populate('address_id')
            .sort({ createdAt: -1 });

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

        // Revert stock and delete borrow records
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

        // Delete associated borrow records
        await Borrow.deleteMany({ order_id: order._id });

        // Update order status
        order.status = 'cancelled';
        await order.save();

        // Send Notification
        await sendNotification(
            NotificationType.BORROW,
            `Order cancelled: Your order #${order._id.toString().slice(-8).toUpperCase()} has been cancelled and stock has been reverted.`,
            userId as any,
            null as any
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
            .populate('items.book_id', 'title cover_image_url price author')
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

// User: Request Return Order
export const requestReturnOrder = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const userId = req.user!._id;

        if (!reason) {
            return res.status(400).json({ error: 'Reason for return is required' });
        }

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Check ownership
        if (order.user_id.toString() !== userId.toString()) {
            return res.status(403).json({ error: 'Unauthorized to return this order' });
        }

        // Check status - can only return if delivered
        if (order.status !== OrderStatus.DELIVERED) {
            return res.status(400).json({ error: `Cannot return order with status: ${order.status}` });
        }

        // Update status and reason
        order.status = OrderStatus.RETURN_REQUESTED;
        order.returnReason = reason;
        await order.save();

        // Update associated borrow records (optional: could mark them as return_requested too)
        await Borrow.updateMany(
            { order_id: order._id },
            { $set: { status: BorrowStatus.RETURN_REQUESTED } }
        );

        // Notify Admins
        // await notifySuperAdmins(`New Return Request for Order #${order._id.toString().slice(-8).toUpperCase()} from ${req.user!.name}`);

        // Notify User
        await sendNotification(
            NotificationType.BORROW,
            `Return request submitted for Order #${order._id.toString().slice(-8).toUpperCase()}. Awaiting admin approval.`,
            userId as any,
            null as any
        );

        res.status(200).json({ message: 'Return request submitted successfully', order });
    } catch (error: any) {
        console.error('Request return error:', error);
        res.status(500).json({ error: 'Failed to submit return request' });
    }
};
