import { Request, Response } from 'express';
import User from '../models/User';
import Role from '../models/Role';
import Review from '../models/Review';
import ActivityLog from '../models/ActivityLog';
import Announcement from '../models/Announcement';
import { RoleName, ActivityAction } from '../types/enums';

export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await User.find().populate('role_id').populate('membership_id');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

export const manageAdmin = async (req: Request, res: Response) => {
    const { userId, action } = req.body;
    try {
        const roleName = action === 'promote' ? RoleName.ADMIN : RoleName.USER;
        const targetRole = await Role.findOne({ name: roleName });
        if (!targetRole) return res.status(404).json({ error: 'Role not found' });

        const user = await User.findByIdAndUpdate(userId, { role_id: targetRole._id }, { new: true });
        if (!user) return res.status(404).json({ error: 'User not found' });

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
};

export const deleteUser = async (req: Request, res: Response) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        await ActivityLog.create({
            user_id: (req as any).user._id,
            action: ActivityAction.USER_DELETED,
            description: `Deleted user ${user.email}`,
            timestamp: new Date()
        });

        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

export const getAllReviews = async (req: Request, res: Response) => {
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
};

export const deleteReview = async (req: Request, res: Response) => {
    try {
        const review = await Review.findByIdAndDelete(req.params.id);
        if (!review) return res.status(404).json({ error: 'Review not found' });

        res.json({ message: 'Review removed successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

export const getAllAnnouncements = async (req: Request, res: Response) => {
    try {
        const announcements = await Announcement.find().sort({ createdAt: -1 });
        res.json(announcements);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

export const createAnnouncement = async (req: Request, res: Response) => {
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
};

export const deleteAnnouncement = async (req: Request, res: Response) => {
    try {
        await Announcement.findByIdAndDelete(req.params.id);
        res.json({ message: 'Announcement deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

export const getSystemLogs = async (req: Request, res: Response) => {
    try {
        const logs = await ActivityLog.find().populate('user_id', 'name email').sort({ timestamp: -1 }).limit(200);
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

export const getUsageMetrics = async (req: Request, res: Response) => {
    try {
        const userCount = await User.countDocuments();
        const adminCount = await User.countDocuments({ role_id: await Role.findOne({ name: RoleName.ADMIN }).then(r => r?._id) });
        const logCount = await ActivityLog.countDocuments();

        res.json({
            users: userCount,
            admins: adminCount,
            totalActivity: logCount,
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

export const getAdmins = async (req: Request, res: Response) => {
    try {
        const adminRole = await Role.findOne({ name: RoleName.ADMIN });
        if (!adminRole) return res.status(404).json({ error: 'Admin role not found' });

        const admins = await User.find({ role_id: adminRole._id }).select('name email');
        res.json(admins);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};
