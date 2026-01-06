import express, { Request, Response } from 'express';
import Notification from '../models/Notification';
import { auth, checkRole } from '../middleware/authMiddleware';

const router = express.Router();

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
