import Notification from '../models/Notification';
import { NotificationType, RoleName } from '../types/enums';
import Book from '../models/Book';
import User from '../models/User';
import { notifyAdmins } from '../utils/notification';

export const getMyNotifications = async (userId: string, query: any) => {
    const { type, is_read, startDate, endDate, sort } = query;
    let filter: any = { user_id: userId };

    if (type && type !== 'all') {
        const types = (type as string).split(',');
        filter.type = types.length > 1 ? { $in: types } : type;
    }

    if (is_read !== undefined && is_read !== 'all') {
        filter.is_read = is_read === 'true';
    }

    if (startDate && endDate) {
        filter.timestamp = { $gte: new Date(startDate as string), $lte: new Date(endDate as string) };
    }

    let sortObj: any = { timestamp: -1 };
    if (sort === 'oldest') sortObj = { timestamp: 1 };

    return await Notification.find(filter)
        .populate('book_id', 'title cover_image_url')
        .sort(sortObj)
        .limit(100);
};

export const markAsRead = async (notificationId: string, userId: string) => {
    const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, user_id: userId },
        { is_read: true },
        { new: true }
    );
    if (!notification) throw new Error('Notification not found');
    return notification;
};

export const markAllAsRead = async (userId: string) => {
    return await Notification.updateMany({ user_id: userId, is_read: false }, { is_read: true });
};

export const getAllNotificationsAdmin = async (userId: string, query: any) => {
    const { type, is_read, startDate, endDate, sort } = query;

    const adminRelevantTypes = [
        NotificationType.BORROW,
        NotificationType.RETURN,
        NotificationType.WISHLIST,
        NotificationType.ORDER,
        NotificationType.BOOK_REQUEST,
        NotificationType.STOCK_ALERT,
        NotificationType.SYSTEM,
        NotificationType.REVIEW_REPORT,
        NotificationType.CONTACT_QUERY,
        NotificationType.BOOK_CREATED,
        NotificationType.BOOK_UPDATED,
        NotificationType.CATEGORY_CREATED,
        NotificationType.CATEGORY_UPDATED
    ];

    let filter: any = {
        user_id: userId,
        type: { $in: adminRelevantTypes }
    };

    if (type && type !== 'all') {
        const types = (type as string).split(',');
        filter.type = types.length > 1 ? { $in: types } : type;
    }

    if (is_read !== undefined && is_read !== 'all') {
        filter.is_read = is_read === 'true';
    }

    if (startDate && endDate) {
        filter.timestamp = { $gte: new Date(startDate as string), $lte: new Date(endDate as string) };
    }

    let sortObj: any = { timestamp: -1 };
    if (sort === 'oldest') sortObj = { timestamp: 1 };

    const notifications = await Notification.find(filter)
        .populate({
            path: 'user_id',
            select: 'name email role_id',
            populate: { path: 'role_id', select: 'name' }
        })
        .populate('book_id', 'title cover_image_url')
        .sort(sortObj)
        .limit(200);

    return notifications;
};

export const markAsReadAdmin = async (notificationId: string) => {
    return await Notification.findByIdAndUpdate(notificationId, { is_read: true }, { new: true });
};

export const markAllAsReadAdmin = async (userId: string) => {
    return await Notification.updateMany({ user_id: userId, is_read: false }, { is_read: true });
};

export const notifyStockAlert = async (userId: string, bookId: string) => {
    const book = await Book.findById(bookId);
    if (!book) throw new Error('Book not found');
    if (book.noOfCopies > 0) throw new Error('Book is still in stock');

    const user = await User.findById(userId);

    await notifyAdmins(
        `Low Stock Alert: ${user?.name || 'A user'} added "${book.title}" to their cart, but it is out of stock.`,
        NotificationType.STOCK_ALERT,
        book._id as any,
        book._id.toString()
    );

    return true;
};
