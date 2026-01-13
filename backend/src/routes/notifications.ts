import express, { Request, Response } from 'express';
import Notification from '../models/Notification';
import { auth, checkRole, AuthRequest } from '../middleware/authMiddleware';

const router = express.Router();

// Get current user's notifications
router.get('/my', auth, async (req: AuthRequest, res: Response) => {
    try {
        const notifications = await Notification.find({ user_id: req.user!._id })
            .populate('book_id', 'title cover_image_url')
            .sort({ timestamp: -1 })
            .limit(20);
        res.json(notifications);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Mark my notification as read
router.put('/read/:id', auth, async (req: AuthRequest, res: Response) => {
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
});

// Mark all my notifications as read
router.put('/read-all/my', auth, async (req: AuthRequest, res: Response) => {
    try {
        await Notification.updateMany(
            { user_id: req.user!._id, is_read: false },
            { is_read: true }
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin Routes below...
// Get all notifications (Admin)
router.get('/', auth, checkRole(['admin']), async (req: Request, res: Response) => {
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
});

// Mark notification as read (Admin)
router.put('/:id/read', auth, checkRole(['admin']), async (req: Request, res: Response) => {
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
});

// Mark all as read (Admin)
router.put('/read-all', auth, checkRole(['admin']), async (req: Request, res: Response) => {
    try {
        await Notification.updateMany({ is_read: false }, { is_read: true });
        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
