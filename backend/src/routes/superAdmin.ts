import express, { Request, Response } from 'express';
import { auth, checkRole } from '../middleware/authMiddleware';
import User from '../models/User';
import Role, { IRole } from '../models/Role';
import Review from '../models/Review';
import ActivityLog from '../models/ActivityLog';
import Announcement from '../models/Announcement';

const router = express.Router();

// HELPER: Check if user is Super Admin
const isSuperAdmin = (req: any, res: Response, next: any) => {
    if (req.user && (req.user.role_id as IRole).name === 'super_admin') {
        next();
    } else {
        res.status(403).json({ error: 'Access denied: Super Admin only' });
    }
};

// --- User & Admin Management ---

// Get all users (including admins)
router.get('/users', auth, checkRole(['super_admin']), async (req: Request, res: Response) => {
    try {
        const users = await User.find().populate('role_id').populate('membership_id');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Create Admin (Promote User)
router.post('/manage-admin', auth, checkRole(['super_admin']), async (req: Request, res: Response) => {
    const { userId, action } = req.body; // action: 'promote' or 'demote'
    try {
        const roleName = action === 'promote' ? 'admin' : 'user';
        const targetRole = await Role.findOne({ name: roleName });
        if (!targetRole) return res.status(404).json({ error: 'Role not found' });

        const user = await User.findByIdAndUpdate(userId, { role_id: targetRole._id }, { new: true });
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Log the action
        await ActivityLog.create({
            user_id: (req as any).user._id,
            action: `ADMIN_MGMT_${action.toUpperCase()}`,
            description: `${action === 'promote' ? 'Promoted' : 'Demoted'} user ${user.email} to ${roleName}`,
            timestamp: new Date()
        });

        res.json({ message: `User successfully ${action === 'promote' ? 'promoted' : 'demoted'}`, user });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Remove User/Admin
router.delete('/user/:id', auth, checkRole(['super_admin']), async (req: Request, res: Response) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Log the action
        await ActivityLog.create({
            user_id: (req as any).user._id,
            action: 'USER_DELETED',
            description: `Deleted user ${user.email}`,
            timestamp: new Date()
        });

        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// --- Content Moderation ---

// Get All Reviews (for moderation)
router.get('/reviews', auth, checkRole(['super_admin']), async (req: Request, res: Response) => {
    try {
        const reviews = await Review.find()
            .populate('user_id', 'name email')
            .populate('book_id', 'title')
            .sort({ reviewed_at: -1 })
            .limit(100);
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete Review
router.delete('/review/:id', auth, checkRole(['super_admin', 'admin']), async (req: Request, res: Response) => {
    try {
        const review = await Review.findByIdAndDelete(req.params.id);
        if (!review) return res.status(404).json({ error: 'Review not found' });

        res.json({ message: 'Review removed successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// --- Announcements ---

// Get all announcements
router.get('/announcements', auth, async (req: Request, res: Response) => {
    try {
        const announcements = await Announcement.find().sort({ createdAt: -1 });
        res.json(announcements);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Create Announcement
router.post('/announcements', auth, checkRole(['super_admin']), async (req: Request, res: Response) => {
    const { title, content } = req.body;
    try {
        const announcement = new Announcement({
            title,
            content,
            author: (req as any).user._id
        });
        await announcement.save();
        res.json(announcement);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete Announcement
router.delete('/announcements/:id', auth, checkRole(['super_admin']), async (req: Request, res: Response) => {
    try {
        await Announcement.findByIdAndDelete(req.params.id);
        res.json({ message: 'Announcement deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// --- System Monitoring & Logs ---

// Get detailed system logs (enhanced)
router.get('/system-logs', auth, checkRole(['super_admin']), async (req: Request, res: Response) => {
    try {
        const logs = await ActivityLog.find().populate('user_id', 'name email').sort({ timestamp: -1 }).limit(200);
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get Usage Metrics
router.get('/metrics', auth, checkRole(['super_admin']), async (req: Request, res: Response) => {
    try {
        const userCount = await User.countDocuments();
        const adminCount = await User.countDocuments({ role_id: await Role.findOne({ name: 'admin' }).then(r => r?._id) });
        const logCount = await ActivityLog.countDocuments();

        res.json({
            users: userCount,
            admins: adminCount,
            totalActivity: logCount,
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get all admins (simple list for dropdown)
router.get('/admins', auth, checkRole(['super_admin']), async (req: Request, res: Response) => {
    try {
        const adminRole = await Role.findOne({ name: 'admin' });
        if (!adminRole) return res.status(404).json({ error: 'Admin role not found' });

        const admins = await User.find({ role_id: adminRole._id }).select('name email');
        res.json(admins);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
