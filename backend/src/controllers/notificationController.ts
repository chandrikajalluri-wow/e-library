import { Request, Response } from 'express';
import Notification from '../models/Notification';
import { AuthRequest } from '../middleware/authMiddleware';
import { RoleName, NotificationType } from '../types/enums';

export const getMyNotifications = async (req: AuthRequest, res: Response) => {
    try {
        const { type, is_read, startDate, endDate } = req.query;
        let filter: any = { user_id: req.user!._id };

        if (type && type !== 'all') {
            const types = (type as string).split(',');
            if (types.length > 1) {
                filter.type = { $in: types };
            } else {
                filter.type = type;
            }
        }

        if (is_read !== undefined && is_read !== 'all') {
            filter.is_read = is_read === 'true';
        }

        if (startDate && endDate) {
            filter.timestamp = {
                $gte: new Date(startDate as string),
                $lte: new Date(endDate as string)
            };
        }

        const notifications = await Notification.find(filter)
            .populate('book_id', 'title cover_image_url')
            .sort({ timestamp: -1 })
            .limit(100); // 
        res.json(notifications);
    } catch (err) {
        console.error('Get my notifications error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const markMyNotificationAsRead = async (req: AuthRequest, res: Response) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, user_id: req.user!._id },
            { is_read: true },
            { new: true }
        );
        if (!notification) return res.status(404).json({ error: 'Notification not found' });
        res.json(notification);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

export const markAllMyNotificationsAsRead = async (req: AuthRequest, res: Response) => {
    try {
        await Notification.updateMany(
            { user_id: req.user!._id, is_read: false },
            { is_read: true }
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

export const getAllNotifications = async (req: Request, res: Response) => {
    try {
        const adminRelevantTypes = [
            NotificationType.BORROW,
            NotificationType.RETURN,
            NotificationType.WISHLIST,
            NotificationType.ORDER,
            NotificationType.BOOK_REQUEST,
            NotificationType.STOCK_ALERT
        ];

        const notifications = await Notification.find({ type: { $in: adminRelevantTypes } })
            .populate({
                path: 'user_id',
                select: 'name email role_id',
                populate: {
                    path: 'role_id',
                    select: 'name'
                }
            })
            .populate('book_id', 'title cover_image_url')
            .sort({ timestamp: -1 })
            .limit(50);

        const userSideNotifications = notifications.filter(notif => {
            const user = notif.user_id as any;
            return user?.role_id?.name === RoleName.USER;
        });

        res.json(userSideNotifications);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

export const markNotificationAsReadAdmin = async (req: Request, res: Response) => {
    try {
        const notification = await Notification.findByIdAndUpdate(
            req.params.id,
            { is_read: true },
            { new: true }
        );
        res.json(notification);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

export const markAllNotificationsAsReadAdmin = async (req: Request, res: Response) => {
    try {
        await Notification.updateMany({ is_read: false }, { is_read: true });
        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

import Book from '../models/Book';
import User from '../models/User';
import { notifyAdmins } from '../utils/notification';

export const notifyStockAlert = async (req: AuthRequest, res: Response) => {
    try {
        const { book_id } = req.body;
        if (!book_id) return res.status(400).json({ error: 'Book ID is required' });

        const book = await Book.findById(book_id);
        if (!book) return res.status(404).json({ error: 'Book not found' });

        if (book.noOfCopies > 0) {
            return res.status(400).json({ error: 'Book is still in stock' });
        }

        const user = await User.findById(req.user!._id);

        await notifyAdmins(
            `Low Stock Alert: ${user?.name || 'A user'} added "${book.title}" to their cart, but it is out of stock.`,
            NotificationType.STOCK_ALERT,
            book._id as any,
            book._id.toString()
        );

        res.json({ message: 'Stock alert sent to admin' });
    } catch (err) {
        console.error('Stock alert error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};
