import { Request, Response } from 'express';
import Notification from '../models/Notification';
import { AuthRequest } from '../middleware/authMiddleware';

export const getMyNotifications = async (req: AuthRequest, res: Response) => {
    try {
        const notifications = await Notification.find({ user_id: req.user!._id })
            .populate('book_id', 'title cover_image_url')
            .sort({ timestamp: -1 })
            .limit(20);
        res.json(notifications);
    } catch (err) {
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
        const notifications = await Notification.find()
            .populate('user_id', 'name email')
            .populate('book_id', 'title')
            .sort({ timestamp: -1 })
            .limit(50);
        res.json(notifications);
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
