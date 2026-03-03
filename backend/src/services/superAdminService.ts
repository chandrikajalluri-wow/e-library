import User from '../models/User';
import Role from '../models/Role';
import Review from '../models/Review';
import Book from '../models/Book';
import ActivityLog from '../models/ActivityLog';
import Announcement from '../models/Announcement';
import Order from '../models/Order';
import Contact from '../models/Contact';
import Readlist from '../models/Readlist';
import Address from '../models/Address';
import Membership from '../models/Membership';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import AdminInvite, { IAdminInvite } from '../models/AdminInvite';
import { RoleName, ActivityAction, MembershipName, InviteStatus, NotificationType } from '../types/enums';
import { sendEmail } from '../utils/mailer';
const { getQueryReplyTemplate, getAdminInvitationTemplate } = require('../utils/emailTemplates');
import { revokeAllUserSessions } from '../utils/sessionManager';
import { notifySuperAdmins } from '../utils/notification';

const INVITE_EXPIRY_HOURS = 24;
const TOKEN_LENGTH = 32;

export const getAllUsers = async (query: any) => {
    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 15;
    const search = query.search as string || '';
    const role = query.role as string || 'all';
    const membershipFilter = query.membership as string || 'all';
    const status = query.status as string || 'all';

    const skip = (page - 1) * limit;
    const filter: any = {};

    if (status === 'verified') {
        filter.isVerified = true;
        filter.isDeleted = false;
    } else if (status === 'pending') {
        filter.isVerified = false;
        filter.isDeleted = false;
    } else if (status === 'deleted') {
        filter.isDeleted = true;
    }

    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
        ];
    }

    if (role !== 'all') {
        const targetRole = await Role.findOne({ name: role });
        if (targetRole) filter.role_id = targetRole._id;
    }

    if (membershipFilter !== 'all') {
        const userRole = await Role.findOne({ name: RoleName.USER });
        if (userRole) filter.role_id = userRole._id;

        const targetMembership = await Membership.findOne({
            name: { $regex: `^${membershipFilter}$`, $options: 'i' }
        });

        if (membershipFilter === 'premium' || membershipFilter === 'basic') {
            filter.membership_id = targetMembership ? targetMembership._id : '000000000000000000000000';
        } else if (membershipFilter === 'none') {
            const noneCriteria: any[] = [
                { membership_id: { $exists: false } },
                { membership_id: null },
                { isVerified: false }
            ];
            if (filter.$or) {
                const searchOr = filter.$or;
                delete filter.$or;
                filter.$and = [{ $or: searchOr }, { $or: noneCriteria }];
            } else {
                filter.$or = noneCriteria;
            }
        }
    }

    const totalUsers = await User.countDocuments(filter);
    const users = await User.find(filter)
        .populate('role_id')
        .populate('membership_id')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    return {
        users,
        totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
        currentPage: page
    };
};

export const manageAdmin = async (userId: string, action: string, performerId: string) => {
    const roleName = action === 'promote' ? RoleName.ADMIN : RoleName.USER;
    const targetRole = await Role.findOne({ name: roleName });
    if (!targetRole) throw new Error('Role not found');

    const user = await User.findByIdAndUpdate(userId, { role_id: targetRole._id }, { new: true });
    if (!user) throw new Error('User not found');

    await ActivityLog.create({
        user_id: performerId,
        action: `ADMIN_MGMT_${action.toUpperCase()}`,
        description: `${action === 'promote' ? 'Promoted' : 'Demoted'} user ${user.email} to ${roleName}`,
        timestamp: new Date()
    });

    return user;
};

export const deleteUser = async (targetId: string, performerId: string, force: boolean = false) => {
    const user = await User.findById(targetId).populate('membership_id');
    if (!user) throw new Error('User not found');

    if (!force) {
        const undeliveredOrders = await Order.find({
            user_id: user._id,
            status: { $in: ['pending', 'processing', 'shipped', 'return_requested', 'return_accepted'] }
        });

        if (undeliveredOrders.length > 0) {
            const obligations = [`${undeliveredOrders.length} undelivered orders`];
            const err: any = new Error('User has pending obligations');
            err.details = { obligations };
            throw err;
        }
    }

    user.password = undefined;
    user.googleId = undefined;
    user.profileImage = undefined;
    user.isDeleted = true;
    user.deletedAt = new Date();
    user.activeSessions = [];
    await revokeAllUserSessions(user._id.toString());
    (user as any).deletionScheduledAt = undefined;

    await user.save();

    await ActivityLog.create({
        user_id: performerId,
        action: ActivityAction.USER_DELETED,
        description: `Soft deleted user ${user.email} (Immediate)`,
        timestamp: new Date()
    });

    return true;
};

export const getAllReviews = async () => {
    return await Review.find()
        .populate('user_id', 'name email')
        .populate('book_id', 'title')
        .sort({ reviewed_at: -1 })
        .limit(100);
};

export const deleteReview = async (reviewId: string) => {
    const review = await Review.findByIdAndDelete(reviewId);
    if (!review) throw new Error('Review not found');
    return true;
};

export const getAllAnnouncements = async () => {
    return await Announcement.find().sort({ createdAt: -1 });
};

export const createAnnouncement = async (userId: string, data: any) => {
    const announcement = new Announcement({
        ...data,
        author: userId
    });
    return await announcement.save();
};

export const deleteAnnouncement = async (id: string) => {
    return await Announcement.findByIdAndDelete(id);
};

export const getSystemLogs = async () => {
    const logs = await ActivityLog.find()
        .populate({
            path: 'user_id',
            select: 'name email role_id',
            populate: { path: 'role_id', select: 'name' }
        })
        .sort({ timestamp: -1 })
        .limit(200);

    return logs.filter(log => {
        const user = log.user_id as any;
        const isAdmin = [RoleName.ADMIN, RoleName.SUPER_ADMIN].includes(user?.role_id?.name);
        const isInviteAction = ['ADMIN_INVITE_REJECTED', 'ADMIN_INVITE_SENT'].includes(log.action);
        return isAdmin || isInviteAction;
    });
};

export const getUsageMetrics = async () => {
    const userCount = await User.countDocuments();
    const adminRole = await Role.findOne({ name: RoleName.ADMIN });
    const adminCount = await User.countDocuments({ role_id: adminRole?._id });
    const bookCount = await Book.countDocuments();
    const logCount = await ActivityLog.countDocuments();

    const userDistribution = await User.aggregate([
        { $lookup: { from: 'roles', localField: 'role_id', foreignField: '_id', as: 'role' } },
        { $unwind: '$role' },
        { $group: { _id: '$role.name', count: { $sum: 1 } } }
    ]);

    const membershipDistribution = await User.aggregate([
        { $lookup: { from: 'memberships', localField: 'membership_id', foreignField: '_id', as: 'membership' } },
        { $unwind: { path: '$membership', preserveNullAndEmptyArrays: true } },
        { $group: { _id: { $ifNull: ['$membership.displayName', 'No Plan'] }, count: { $sum: 1 } } }
    ]);

    const bookDistribution = await Book.aggregate([
        { $lookup: { from: 'categories', localField: 'category_id', foreignField: '_id', as: 'category' } },
        { $unwind: '$category' },
        { $group: { _id: '$category.name', count: { $sum: 1 } } }
    ]);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const readlistTrends = await Readlist.aggregate([
        { $match: { addedAt: { $gte: sixMonthsAgo } } },
        {
            $group: {
                _id: { year: { $year: '$addedAt' }, month: { $month: '$addedAt' } },
                month: { $first: { $dateToString: { format: "%m/%Y", date: "$addedAt" } } },
                count: { $sum: 1 }
            }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    const realizedStatuses = ['delivered', 'completed', 'returned'];
    const orderTrends = await Order.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo }, status: { $in: realizedStatuses } } },
        {
            $group: {
                _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
                month: { $first: { $dateToString: { format: "%m/%Y", date: "$createdAt" } } },
                count: { $sum: 1 },
                revenue: { $sum: '$totalAmount' }
            }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    const totalOrders = await Order.countDocuments();
    const realizedOrderCount = await Order.countDocuments({ status: { $in: realizedStatuses } });
    const cancelledOrderCount = await Order.countDocuments({ status: 'cancelled' });

    const revenueResult = await Order.aggregate([
        { $match: { status: { $in: realizedStatuses } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    let totalRevenue = revenueResult[0]?.total || 0;

    const premiumMembership = await Membership.findOne({ name: MembershipName.PREMIUM });
    let premiumMemberCount = 0;
    if (premiumMembership) {
        premiumMemberCount = await User.countDocuments({ membership_id: premiumMembership._id, isDeleted: false });
        totalRevenue += (premiumMembership.price || 99) * premiumMemberCount;
    }

    const fulfillmentResult = await Order.aggregate([
        { $match: { status: 'delivered', deliveredAt: { $exists: true }, createdAt: { $exists: true } } },
        { $project: { duration: { $subtract: ['$deliveredAt', '$createdAt'] } } },
        { $group: { _id: null, avgDuration: { $avg: '$duration' } } }
    ]);

    return {
        version: '2026-02-20-v1',
        users: userCount,
        admins: adminCount,
        totalBooks: bookCount,
        totalActivity: logCount,
        totalOrders,
        totalRevenue,
        premiumMemberCount,
        avgFulfillmentTime: fulfillmentResult[0]?.avgDuration ? Math.round(fulfillmentResult[0].avgDuration / (1000 * 60 * 60)) : 0,
        averageOrderValue: realizedOrderCount > 0 ? Math.round(totalRevenue / realizedOrderCount) : 0,
        cancellationRate: totalOrders > 0 ? parseFloat(((cancelledOrderCount / totalOrders) * 100).toFixed(1)) : 0,
        realizedOrderCount,
        userDistribution,
        membershipDistribution,
        bookDistribution,
        readlistTrends,
        orderTrends
    };
};

export const getAdmins = async () => {
    const adminRole = await Role.findOne({ name: RoleName.ADMIN });
    if (!adminRole) throw new Error('Admin role not found');
    return await User.find({ role_id: adminRole._id }).select('name email');
};

export const getContactQueries = async () => {
    return await Contact.find().sort({ createdAt: -1 });
};

export const updateContactQueryStatus = async (id: string, status: string) => {
    return await Contact.findByIdAndUpdate(id, { status }, { new: true });
};

export const getReportedReviews = async () => {
    return await Review.find({ 'reports.0': { $exists: true } })
        .populate('user_id', 'name email')
        .populate('book_id', 'title')
        .populate('reports.user_id', 'name email')
        .sort({ 'reports.reported_at': -1 });
};

export const dismissReviewReports = async (id: string) => {
    return await Review.findByIdAndUpdate(id, { $set: { reports: [] } });
};

export const replyToContactQuery = async (id: string, replyText: string, performerId: string) => {
    const query = await Contact.findById(id);
    if (!query) throw new Error('Query not found');

    const subject = 'Response to your query - BookStack Support';
    const text = `Hi ${query.name},\n\nOur team has responded to your query:\n\n${replyText}\n\nOriginal Message:\n"${query.message}"\n\nBest regards,\nThe BookStack Team`;
    const { getQueryReplyTemplate } = require('../utils/emailTemplates');
    await sendEmail(query.email, subject, text, getQueryReplyTemplate(query.name, query.message, replyText));

    query.status = 'RESOLVED';
    await query.save();

    await ActivityLog.create({
        user_id: performerId,
        action: ActivityAction.USER_UPDATED,
        description: `Replied to contact query from ${query.email} and marked as RESOLVED`,
        timestamp: new Date()
    });

    return query;
};

export const getUserDetails = async (userId: string) => {
    const user = await User.findById(userId)
        .populate('role_id', 'name')
        .populate('membership_id', 'name')
        .select('-password -verificationToken');
    if (!user) throw new Error('User not found');

    const addresses = await Address.find({ user_id: userId }).sort({ isDefault: -1, createdAt: -1 });
    return { user, addresses };
};

// --- Admin Invite Logic ---

export const generateSecureToken = async (): Promise<{
    rawToken: string;
    hashedToken: string;
}> => {
    const rawToken = crypto.randomBytes(TOKEN_LENGTH).toString('hex');
    const hashedToken = await bcrypt.hash(rawToken, 10);
    return { rawToken, hashedToken };
};

export const createAdminInvite = async (
    targetUserId: string,
    invitedById: string
): Promise<{ message: string; email: string }> => {
    if (targetUserId === invitedById) {
        throw new Error('Cannot invite yourself');
    }

    const targetUser = await User.findById(targetUserId).populate('role_id');
    if (!targetUser) {
        throw new Error('Target user not found');
    }

    if (targetUser.isDeleted) {
        throw new Error('Cannot invite deleted user');
    }

    return createAdminInviteByEmail(targetUser.email, invitedById);
};

export const createAdminInviteByEmail = async (
    email: string,
    invitedById: string
): Promise<{ message: string; email: string }> => {
    const trimmedEmail = email.toLowerCase().trim();
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(trimmedEmail)) {
        throw new Error('Please provide a valid email address');
    }

    const existingUser = await User.findOne({ email: trimmedEmail }).populate('role_id');
    if (existingUser) {
        const userRole = (existingUser.role_id as any).name;
        if (userRole === RoleName.ADMIN || userRole === RoleName.SUPER_ADMIN) {
            throw new Error('User with this email is already an admin');
        }
    }

    const existingInvite = await AdminInvite.findOne({
        email: trimmedEmail,
        status: InviteStatus.PENDING,
    });

    if (existingInvite) {
        throw new Error('Invitation already sent to this email');
    }

    const { rawToken, hashedToken } = await generateSecureToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + INVITE_EXPIRY_HOURS);

    await AdminInvite.create({
        email: trimmedEmail,
        token_hash: hashedToken,
        invited_by: invitedById,
        status: InviteStatus.PENDING,
        expires_at: expiresAt,
    });

    const inviter = await User.findById(invitedById);
    const inviterName = inviter?.name || 'Super Admin';
    const acceptLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/accept-admin?token=${rawToken}`;
    const targetName = existingUser?.name || 'User';

    try {
        await sendEmail(
            trimmedEmail,
            'You\'ve been invited to become an Admin',
            `You have been invited by ${inviterName} to become an admin. Click the link to accept: ${acceptLink}`,
            getAdminInvitationTemplate(
                targetName,
                inviterName,
                acceptLink,
                expiresAt
            )
        );
    } catch (emailError) {
        console.error('Failed to send invitation email:', emailError);
    }

    await ActivityLog.create({
        user_id: invitedById,
        action: ActivityAction.ADMIN_INVITE_SENT,
        description: `Invited ${trimmedEmail} to become admin`,
    });

    return {
        message: 'Invitation sent successfully',
        email: trimmedEmail,
    };
};

export const verifyInviteToken = async (
    rawToken: string
): Promise<{
    email: string;
    inviterName: string;
    expiresAt: Date;
    isValid: boolean;
}> => {
    const pendingInvites = await AdminInvite.find({
        status: InviteStatus.PENDING,
    }).populate('invited_by');

    let matchedInvite: IAdminInvite | null = null;

    for (const invite of pendingInvites) {
        const isMatch = await bcrypt.compare(rawToken, invite.token_hash);
        if (isMatch) {
            matchedInvite = invite;
            break;
        }
    }

    if (!matchedInvite) {
        throw new Error('Invalid invitation link');
    }

    if (new Date() > matchedInvite.expires_at) {
        matchedInvite.status = InviteStatus.EXPIRED;
        await matchedInvite.save();
        throw new Error('Invitation has expired');
    }

    const inviter = matchedInvite.invited_by as any;
    const inviterName = inviter?.name || 'Super Admin';

    return {
        email: matchedInvite.email,
        inviterName,
        expiresAt: matchedInvite.expires_at,
        isValid: true,
    };
};

export const acceptInvite = async (
    rawToken: string,
    name: string,
    password?: string
): Promise<{ message: string; email: string }> => {
    const inviteDetails = await verifyInviteToken(rawToken);

    const pendingInvites = await AdminInvite.find({
        status: InviteStatus.PENDING,
        email: inviteDetails.email,
    });

    let matchedInvite: IAdminInvite | null = null;
    for (const invite of pendingInvites) {
        const isMatch = await bcrypt.compare(rawToken, invite.token_hash);
        if (isMatch) {
            matchedInvite = invite;
            break;
        }
    }

    if (!matchedInvite) {
        throw new Error('Invitation not found or already used');
    }

    const adminRole = await Role.findOne({ name: RoleName.ADMIN });
    if (!adminRole) {
        throw new Error('Admin role not found in system');
    }

    let user = await User.findOne({ email: matchedInvite.email });
    let isPromotion = !!user;

    let hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;

    if (user) {
        if (user.isDeleted) {
            throw new Error('User account has been deleted');
        }
        user.role_id = adminRole._id;
        user.name = name || user.name;
        if (hashedPassword) {
            user.password = hashedPassword;
        }
        user.isVerified = true;
        await user.save();
    } else {
        if (!password) {
            throw new Error('Password is required for new accounts');
        }
        user = await User.create({
            name,
            email: matchedInvite.email,
            password: hashedPassword,
            role_id: adminRole._id,
            isVerified: true
        });
    }

    matchedInvite.status = InviteStatus.ACCEPTED;
    matchedInvite.accepted_at = new Date();
    await matchedInvite.save();

    await ActivityLog.create({
        user_id: user._id,
        action: ActivityAction.ADMIN_INVITE_ACCEPTED,
        description: isPromotion
            ? `Accepted admin invitation and promoted from user to admin`
            : `Accepted admin invitation and created new admin account`,
    });

    return {
        message: isPromotion
            ? 'Account promoted to Admin successfully'
            : 'Admin account created successfully',
        email: user.email,
    };
};

export const declineInvite = async (
    rawToken: string
): Promise<{ message: string }> => {
    const inviteDetails = await verifyInviteToken(rawToken);

    const pendingInvites = await AdminInvite.find({
        status: InviteStatus.PENDING,
        email: inviteDetails.email,
    });

    let matchedInvite: IAdminInvite | null = null;
    for (const invite of pendingInvites) {
        const isMatch = await bcrypt.compare(rawToken, invite.token_hash);
        if (isMatch) {
            matchedInvite = invite;
            break;
        }
    }

    if (!matchedInvite) {
        throw new Error('Invitation not found or already processed');
    }

    matchedInvite.status = InviteStatus.REJECTED;
    await matchedInvite.save();

    const user = await User.findOne({ email: matchedInvite.email });
    await ActivityLog.create({
        user_id: user?._id || null,
        action: 'ADMIN_INVITE_REJECTED',
        description: `${matchedInvite.email} declined the admin invitation`,
    });

    await notifySuperAdmins(
        `Admin Invitation Declined: ${matchedInvite.email} has explicitly declined the invitation to join the admin team.`,
        NotificationType.SYSTEM
    );

    return { message: 'Invitation declined successfully' };
};

export const cleanupExpiredInvites = async (): Promise<number> => {
    const result = await AdminInvite.updateMany(
        {
            status: InviteStatus.PENDING,
            expires_at: { $lt: new Date() },
        },
        {
            $set: { status: InviteStatus.EXPIRED },
        }
    );

    console.log(`Marked ${result.modifiedCount} invites as expired`);
    return result.modifiedCount;
};
