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
import Readlist from '../models/Readlist';
import Address from '../models/Address';
import { RoleName, ActivityAction, NotificationType, MembershipName } from '../types/enums';
import { sendEmail } from '../utils/mailer';
import { getDeletionScheduledTemplate } from '../utils/emailTemplates';

export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await User.find({ isDeleted: { $ne: true } }).populate('role_id').populate('membership_id');
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
    const { force } = req.body;

    try {
        const user = await User.findById(req.params.id).populate('membership_id');
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (force === true) {
            user.name = 'Deleted User';
            user.email = `deleted_${Date.now()}_${user._id}@example.com`;
            user.password = undefined;
            user.googleId = undefined;
            user.profileImage = undefined;
            user.isDeleted = true;
            user.deletedAt = new Date();
            user.activeSessions = [];
            user.deletionScheduledAt = undefined;

            await user.save();

            await ActivityLog.create({
                user_id: (req as any).user._id,
                action: ActivityAction.USER_DELETED,
                description: `Soft deleted user ${user.email} (Immediate)`,
                timestamp: new Date()
            });

            return res.json({ message: 'User deactivated and anonymized (Force)' });
        }

        // Check for active reading activity
        const activeReads = await Readlist.find({
            user_id: user._id,
            status: 'active'
        }).populate('book_id', 'title');

        // Check for undelivered orders
        const undeliveredOrders = await Order.find({
            user_id: user._id,
            status: { $in: ['pending', 'processing', 'shipped', 'return_requested', 'return_accepted'] }
        });

        // Check for active premium membership
        const hasActivePremium = user.membership_id &&
            (user.membership_id as any).name === MembershipName.PREMIUM &&
            user.membershipExpiryDate &&
            user.membershipExpiryDate > new Date();

        if (activeReads.length > 0 || undeliveredOrders.length > 0 || hasActivePremium) {
            const obligations: string[] = [];
            if (activeReads.length > 0) obligations.push(`${activeReads.length} active reading sessions`);
            if (undeliveredOrders.length > 0) obligations.push(`${undeliveredOrders.length} undelivered orders`);
            if (hasActivePremium) obligations.push('Active Premium Membership');

            return res.status(409).json({
                error: 'User has pending obligations',
                details: {
                    obligations
                }
            });
        }

        const deletionDate = new Date();
        deletionDate.setDate(deletionDate.getDate() + 7);

        user.deletionScheduledAt = deletionDate;
        await user.save();

        await Notification.create({
            user_id: user._id,
            message: `Your account has been scheduled for deletion on ${deletionDate.toDateString()}.`,
            type: NotificationType.SYSTEM
        });

        try {
            await sendEmail(
                user.email,
                'Account Scheduled for Deletion',
                `Hello ${user.name},\n\nYour account is scheduled for deletion on ${deletionDate.toDateString()}.`,
                getDeletionScheduledTemplate(user.name, deletionDate.toDateString())
            );
        } catch (emailErr) {
            console.error('Failed to send deletion email', emailErr);
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

export const revokeUserDeletion = async (req: Request, res: Response) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (!user.deletionScheduledAt) {
            return res.status(400).json({ error: 'User deletion is not scheduled' });
        }

        user.deletionScheduledAt = undefined;
        await user.save();

        await ActivityLog.create({
            user_id: (req as any).user._id,
            action: ActivityAction.USER_UPDATED,
            description: `Revoked scheduled deletion for user ${user.email}`,
            timestamp: new Date()
        });

        res.json({ message: 'User deletion revoked successfully' });
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
            return [RoleName.ADMIN, RoleName.SUPER_ADMIN].includes(user?.role_id?.name);
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
        const bookCount = await Book.countDocuments();
        const logCount = await ActivityLog.countDocuments();

        console.log(`[getUsageMetrics] Users: ${userCount}, Admins: ${adminCount}, Books: ${bookCount}`);

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

        // Membership Distribution
        const membershipDistribution = await User.aggregate([
            {
                $lookup: {
                    from: 'memberships',
                    localField: 'membership_id',
                    foreignField: '_id',
                    as: 'membership'
                }
            },
            {
                $unwind: {
                    path: '$membership',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $group: {
                    _id: { $ifNull: ['$membership.displayName', 'No Plan'] },
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

        // Readlist Trends (Last 6 Months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const readlistTrends = await Readlist.aggregate([
            {
                $match: {
                    addedAt: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: { $month: '$addedAt' },
                    month: { $first: { $dateToString: { format: "%Y-%m", date: "$addedAt" } } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { month: 1 } }
        ]);

        const realizedStatuses = ['delivered', 'completed', 'returned'];

        // Order Trends (Last 6 Months) with Realized Revenue
        const orderTrends = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: sixMonthsAgo },
                    status: { $in: realizedStatuses }
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
            { $match: { status: { $in: realizedStatuses } } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        const totalRevenue = revenueResult[0]?.total || 0;

        res.json({
            version: '2026-02-03-v1', // Updated debug version tag
            users: userCount,
            admins: adminCount,
            totalBooks: bookCount,
            totalActivity: logCount,
            totalOrders,
            totalRevenue,
            userDistribution,
            membershipDistribution,
            bookDistribution,
            readlistTrends,
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
export const replyToContactQuery = async (req: Request, res: Response) => {
    try {
        const { replyText } = req.body;
        const { id } = req.params;

        if (!replyText) {
            return res.status(400).json({ error: 'Reply text is required' });
        }

        const query = await Contact.findById(id);
        if (!query) {
            return res.status(404).json({ error: 'Query not found' });
        }

        // Send email to user
        const { getQueryReplyTemplate } = require('../utils/emailTemplates');
        const subject = 'Response to your query - BookStack Support';
        const text = `Hi ${query.name},\n\nOur team has responded to your query:\n\n${replyText}\n\nOriginal Message:\n"${query.message}"\n\nBest regards,\nThe BookStack Team`;

        await sendEmail(query.email, subject, text, getQueryReplyTemplate(query.name, query.message, replyText));

        // Update status to RESOLVED
        query.status = 'RESOLVED';
        await query.save();

        // Log the activity
        await ActivityLog.create({
            user_id: (req as any).user._id,
            action: ActivityAction.USER_UPDATED,
            description: `Replied to contact query from ${query.email} and marked as RESOLVED`,
            timestamp: new Date()
        });

        res.json({ message: 'Reply sent and query marked as resolved', query });
    } catch (err) {
        console.error('Reply to contact query error:', err);
        res.status(500).json({ error: 'Failed to send reply' });
    }
};

export const getUserDetails = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id)
            .populate('role_id', 'name')
            .populate('membership_id', 'name')
            .select('-password -verificationToken');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const addresses = await Address.find({ user_id: id }).sort({ isDefault: -1, createdAt: -1 });

        res.json({
            user,
            addresses
        });
    } catch (err) {
        console.error('Get user details error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * Invite a user to become an admin
 * POST /api/super-admin/invite-admin/:userId
 */
export const inviteAdmin = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const inviterId = (req as any).user._id.toString();

        // Import the service
        const adminInviteService = require('../services/adminInviteService');

        // Call the service to create the invitation
        const result = await adminInviteService.createAdminInvite(userId, inviterId);

        return res.status(201).json({
            message: result.message,
            email: result.email,
        });
    } catch (error: any) {
        console.error('Error inviting admin:', error);

        // Handle specific error messages
        const errorMessage = error.message || 'Failed to send invitation';

        if (errorMessage === 'Cannot invite yourself') {
            return res.status(400).json({ error: 'Cannot invite yourself' });
        }

        if (errorMessage === 'Target user not found') {
            return res.status(404).json({ error: 'User not found' });
        }

        if (errorMessage === 'Cannot invite deleted user') {
            return res.status(400).json({ error: 'Cannot invite deleted user' });
        }

        if (errorMessage === 'User is already an admin') {
            return res.status(400).json({ error: 'User is already an admin' });
        }

        if (errorMessage === 'Invitation already sent to this user') {
            return res.status(400).json({ error: 'Invitation already sent to this user' });
        }

        return res.status(500).json({ error: errorMessage });
    }
};
