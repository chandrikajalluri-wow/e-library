import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import Order from '../models/Order';
import Book from '../models/Book';
import User from '../models/User';
import Address from '../models/Address';
import Membership from '../models/Membership';
import Borrow from '../models/Borrow';
import { NotificationType, BorrowStatus, MembershipName, BookStatus } from '../types/enums';
import { sendNotification, notifySuperAdmins } from '../utils/notification';
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

            subtotal += book.price * item.quantity;
            orderItems.push({
                book_id: book._id,
                quantity: item.quantity,
                priceAtOrder: book.price
            });
        }

        const deliveryFee = subtotal > 50 ? 0 : 50;
        const totalAmount = subtotal + deliveryFee;

        const newOrder = new Order({
            user_id: req.user!._id,
            items: orderItems,
            address_id: selectedAddressId,
            totalAmount,
            deliveryFee,
            paymentMethod: 'Cash on Delivery',
            status: 'pending'
        });

        await newOrder.save();

        // Update book stock and create borrow records (since borrowing is the core logic)
        for (const item of items) {
            const book = bookMap.get(item.book_id)!;
            book.noOfCopies -= item.quantity;
            if (book.noOfCopies === 0) {
                book.status = BookStatus.ISSUED;
            }
            await book.save();

            // Create borrow record for tracking
            const returnDate = new Date();
            returnDate.setDate(returnDate.getDate() + (membership?.borrowDuration || 14));

            for (let i = 0; i < item.quantity; i++) {
                await new Borrow({
                    user_id: req.user!._id,
                    book_id: book._id,
                    return_date: returnDate,
                    order_id: newOrder._id
                }).save();
            }
        }

        // Send notification
        await sendNotification(
            NotificationType.BORROW,
            `Order confirmed: ${totalItemsInOrder} book(s) will be delivered to ${address.city}`,
            req.user!._id as any,
            null as any
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
        const { status, search, startDate, endDate, sort } = req.query;

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
        }

        const orders = await Order.find(filter)
            .populate('user_id', 'name email')
            .populate('items.book_id', 'title cover_image_url')
            .populate('address_id')
            .sort(sortOption);

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

        const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const order = await Order.findById(id).populate('user_id', 'name email');
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        order.status = status;
        await order.save();

        const userRole = (req.user!.role_id as any).name;
        if (userRole === RoleName.ADMIN) {
            await notifySuperAdmins(`Admin ${req.user!.name} updated order #${order._id} status to ${status.toUpperCase()}`);
        }

        // Send Email Notification
        const user = order.user_id as any;
        const emailSubject = `Your Order Status Update - #${order._id}`;
        const emailText = `
Hi ${user.name},

Your order #${order._id} status has been updated to: ${status.toUpperCase()}.

Thank you for choosing BookStack!

— BookStack Team
        `;

        // Fire and forget email (don't block response)
        sendEmail(user.email, emailSubject, emailText).catch(err =>
            console.error('Failed to send order status email:', err)
        );

        res.status(200).json({ message: 'Order status updated successfully', order });
    } catch (error: any) {
        console.error('Update order status error:', error);
        res.status(500).json({ error: 'Failed to update order status' });
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
                // If status was ISSUED, it might be available now
                if (book.status === BookStatus.ISSUED && book.noOfCopies > 0) {
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
