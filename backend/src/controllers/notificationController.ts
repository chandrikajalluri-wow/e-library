import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import * as notificationService from '../services/notificationService';

export const getMyNotifications = async (req: AuthRequest, res: Response) => {
    try {
        const notifications = await notificationService.getMyNotifications(req.user!._id, req.query);
        res.json(notifications);
    } catch (err) {
        console.error('Get my notifications error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const markMyNotificationAsRead = async (req: AuthRequest, res: Response) => {
    try {
        const notification = await notificationService.markAsRead(req.params.id, req.user!._id);
        res.json(notification);
    } catch (err: any) {
        res.status(err.message === 'Notification not found' ? 404 : 500).json({ error: err.message });
    }
};

export const markAllMyNotificationsAsRead = async (req: AuthRequest, res: Response) => {
    try {
        await notificationService.markAllAsRead(req.user!._id);
        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

export const getAllNotifications = async (req: AuthRequest, res: Response) => {
    try {
        const notifications = await notificationService.getAllNotificationsAdmin(req.user!._id, req.query);
        res.json(notifications);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

export const markNotificationAsReadAdmin = async (req: Request, res: Response) => {
    try {
        const notification = await notificationService.markAsReadAdmin(req.params.id);
        res.json(notification);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

export const markAllNotificationsAsReadAdmin = async (req: AuthRequest, res: Response) => {
    try {
        await notificationService.markAllAsReadAdmin(req.user!._id);
        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

export const notifyStockAlert = async (req: AuthRequest, res: Response) => {
    try {
        const { book_id } = req.body;
        if (!book_id) return res.status(400).json({ error: 'Book ID is required' });
        await notificationService.notifyStockAlert(req.user!._id, book_id);
        res.json({ message: 'Stock alert sent to admin' });
    } catch (err: any) {
        console.error('Stock alert error:', err);
        res.status(err.message.includes('not found') ? 404 : 400).json({ error: err.message });
    }
};

