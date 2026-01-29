import { Request, Response } from 'express';
import User from '../models/User';
import Role from '../models/Role';
import Review from '../models/Review';
import Book from '../models/Book';
import Borrow from '../models/Borrow';
import ActivityLog from '../models/ActivityLog';
import Announcement from '../models/Announcement';
import Notification from '../models/Notification';
import Order from '../models/Order';
import Contact from '../models/Contact';
import { RoleName, ActivityAction, NotificationType } from '../types/enums';
import { sendEmail } from '../utils/mailer';

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
    const { force } = req.body; // Expect JSON body { force: boolean }

    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // If Force Delete is requested
        if (force === true) {
            await User.findByIdAndDelete(req.params.id);

            await ActivityLog.create({
                user_id: (req as any).user._id,
                action: ActivityAction.USER_DELETED,
                description: `Force deleted user ${user.email} (Immediate)`,
                timestamp: new Date()
            });

            return res.json({ message: 'User permanently deleted (Force)' });
        }

        // --- Standard Conditional Logic ---

        // 1. Check for Active Borrows (Not returned)
        const pendingBorrows = await Borrow.find({
            user_id: user._id,
            returned_at: { $exists: false }
        }).populate('book_id', 'title');

        // 2. Check for Unpaid Fines
        const unpaidFines = await Borrow.find({
            user_id: user._id,
            isFinePaid: false,
            fine_amount: { $gt: 0 }
        }).populate('book_id', 'title');

        // If dependencies exist
        if (pendingBorrows.length > 0 || unpaidFines.length > 0) {
            return res.status(409).json({
                error: 'User has pending obligations',
                details: {
                    pendingBorrows: pendingBorrows.map(b => ({ book: (b.book_id as any).title, dueDate: b.return_date })),
                    unpaidFines: unpaidFines.map(b => ({ book: (b.book_id as any).title, amount: b.fine_amount }))
                }
            });
        }

        // If Clean: Schedule Deletion
        const deletionDate = new Date();
        deletionDate.setDate(deletionDate.getDate() + 7);

        user.deletionScheduledAt = deletionDate;
        await user.save();

        // Notify User
        await Notification.create({
            user_id: user._id,
            message: `Your account has been scheduled for deletion on ${deletionDate.toDateString()}. Please contact support if this is a mistake.`,
            type: NotificationType.SYSTEM
        });

        // Send Email
        try {
            await sendEmail(
                user.email,
                'Account Scheduled for Deletion',
                `Hello ${user.name},\n\nYour account has been flagged for deletion and is scheduled to be permanently removed on ${deletionDate.toDateString()}.\n\nIf you believe this is an error, please contact the library administration immediately.\n\nRegards,\nE-Library Team`
            );
        } catch (emailErr) {
            console.error('Failed to send deletion email', emailErr);
            // Continue even if email fails
        }

        await ActivityLog.create({
            user_id: (req as any).user._id,
            action: ActivityAction.USER_DELETED,
            description: `Scheduled deletion for user ${user.email}`,
            timestamp: new Date()
        });

        res.json({ message: `User scheduled for deletion on ${deletionDate.toDateString()}` });

    } catch (err) {
        console.error(err);
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
    const { title, content, type, targetPage } = req.body;
    try {
        const announcement = new Announcement({
            title,
            content,
            type,
            targetPage,
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
        const logs = await ActivityLog.find()
            .populate({
                path: 'user_id',
                select: 'name email role_id',
                populate: {
                    path: 'role_id',
                    select: 'name'
                }
            })
            .sort({ timestamp: -1 })
            .limit(200);

        const adminLogs = logs.filter(log => {
            const user = log.user_id as any;
            return user?.role_id?.name === RoleName.ADMIN;
        });

        res.json(adminLogs);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

export const getUsageMetrics = async (req: Request, res: Response) => {
    try {
        const userCount = await User.countDocuments();
        const adminCount = await User.countDocuments({ role_id: await Role.findOne({ name: RoleName.ADMIN }).then(r => r?._id) });
        const logCount = await ActivityLog.countDocuments();

        // User Distribution by Role
        const userDistribution = await User.aggregate([
            {
                $lookup: {
                    from: 'roles',
                    localField: 'role_id',
                    foreignField: '_id',
                    as: 'role'
                }
            },
            { $unwind: '$role' },
            {
                $group: {
                    _id: '$role.name',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Book Distribution by Category
        const bookDistribution = await Book.aggregate([
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category_id',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            { $unwind: '$category' },
            {
                $group: {
                    _id: '$category.name',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Borrow Trends (Last 6 Months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const borrowTrends = await Borrow.aggregate([
            {
                $match: {
                    issued_date: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: { $month: '$issued_date' },
                    month: { $first: { $dateToString: { format: "%Y-%m", date: "$issued_date" } } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { month: 1 } }
        ]);

        // Order Trends (Last 6 Months)
        const orderTrends = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: { $month: '$createdAt' },
                    month: { $first: { $dateToString: { format: "%Y-%m", date: "$createdAt" } } },
                    count: { $sum: 1 },
                    revenue: { $sum: '$totalAmount' }
                }
            },
            { $sort: { month: 1 } }
        ]);

        const totalOrders = await Order.countDocuments();
        const revenueResult = await Order.aggregate([
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        const totalRevenue = revenueResult[0]?.total || 0;

        res.json({
            version: '2026-01-28-v1', // Debug version tag
            users: userCount,
            admins: adminCount,
            totalActivity: logCount,
            totalOrders,
            totalRevenue,
            userDistribution,
            bookDistribution,
            borrowTrends,
            orderTrends
        });
    } catch (err) {
        console.error(err);
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

export const getContactQueries = async (req: Request, res: Response) => {
    try {
        const queries = await Contact.find().sort({ createdAt: -1 });
        res.json(queries);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

export const updateContactQueryStatus = async (req: Request, res: Response) => {
    try {
        const { status } = req.body;
        const query = await Contact.findByIdAndUpdate(req.params.id, { status }, { new: true });
        res.json(query);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

export const getReportedReviews = async (req: Request, res: Response) => {
    try {
        const reviews = await Review.find({ 'reports.0': { $exists: true } })
            .populate('user_id', 'name email')
            .populate('book_id', 'title')
            .populate('reports.user_id', 'name email')
            .sort({ 'reports.reported_at': -1 });
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

export const dismissReviewReports = async (req: Request, res: Response) => {
    try {
        await Review.findByIdAndUpdate(req.params.id, { $set: { reports: [] } });
        res.json({ message: 'Reports dismissed' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};
