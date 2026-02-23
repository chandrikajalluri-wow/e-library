import User from '../models/User';
import Membership from '../models/Membership';
import Wishlist from '../models/Wishlist';
import BookRequest from '../models/BookRequest';
import AuthToken from '../models/AuthToken';
import Book from '../models/Book';
import Order from '../models/Order';
import Readlist from '../models/Readlist';
import ActivityLog from '../models/ActivityLog';
import Category from '../models/Category';
import { sendEmail } from '../utils/mailer';
import { sendNotification, notifyAdmins } from '../utils/notification';
import {
    NotificationType,
    MembershipName,
    RequestStatus,
    RoleName,
    ActivityAction
} from '../types/enums';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

// --- Profile & Account ---

export const getMe = async (userId: string) => {
    const user = await User.findById(userId)
        .select('-password')
        .populate('membership_id')
        .populate('role_id');

    if (!user) throw new Error('User not found');

    const userObj: any = user.toObject();
    userObj.role = (user.role_id as any)?.name;

    const completedReadlist = await Readlist.countDocuments({ user_id: userId, status: 'completed' });
    userObj.booksRead = completedReadlist;

    return userObj;
};

export const getDashboardStats = async (userId: string, streakCount: number = 0) => {
    const wishlistCount = await Wishlist.countDocuments({ user_id: userId });
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const readlistCount = await Readlist.countDocuments({
        user_id: userId,
        addedAt: { $gte: monthStart }
    });

    const completedReadlist = await Readlist.countDocuments({ user_id: userId, status: 'completed' });

    const now = new Date();
    const activeReads = await Readlist.countDocuments({
        user_id: userId,
        status: 'active',
        dueDate: { $gt: now }
    });

    return {
        borrowedCount: readlistCount,
        wishlistCount,
        streakCount: streakCount,
        booksRead: completedReadlist,
        activeReads
    };
};

export const updateProfile = async (userId: string, profileData: any, profileImagePath?: string) => {
    const { name, phone, favoriteGenres, readingTarget } = profileData;

    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    if (name) user.name = name;
    if (phone) user.phone = phone;

    if (favoriteGenres !== undefined) {
        const genresArray = Array.isArray(favoriteGenres)
            ? favoriteGenres
            : typeof favoriteGenres === 'string'
                ? JSON.parse(favoriteGenres)
                : [];

        if (genresArray.length > 3) {
            throw new Error('You can select at most 3 favorite genres');
        }
        user.favoriteGenres = genresArray;
    }

    if (readingTarget !== undefined) user.readingTarget = Number(readingTarget);
    if (profileImagePath) user.profileImage = profileImagePath;

    await user.save();

    return {
        name: user.name,
        email: user.email,
        phone: user.phone,
        profileImage: user.profileImage,
        favoriteGenres: user.favoriteGenres,
        readingTarget: user.readingTarget,
        membershipStartDate: user.membershipStartDate,
        membershipExpiryDate: user.membershipExpiryDate,
        theme: user.theme
    };
};

export const renewMembership = async (userId: string) => {
    const user = await User.findById(userId).populate('membership_id');
    if (!user) throw new Error('User not found');

    const membership = user.membership_id as any;
    if (!membership || membership.name === MembershipName.BASIC) {
        throw new Error('Basic membership cannot be renewed. Please upgrade to a paid plan.');
    }

    const now = new Date();
    let newExpiry = new Date(user.membershipExpiryDate || now);

    if (newExpiry < now) {
        newExpiry = new Date(now);
    }

    newExpiry.setDate(newExpiry.getDate() + 30);

    user.membershipExpiryDate = newExpiry;
    if (!user.membershipStartDate) {
        user.membershipStartDate = now;
    }

    await user.save();
    return user.membershipExpiryDate;
};

export const changePassword = async (userId: string, currentPassword: string, newPassword: string) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    if (!user.password) {
        throw new Error('This account does not have a password (signed up via social login).');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) throw new Error('Incorrect current password');

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
        throw new Error('Password must be at least 8 characters long and include an uppercase letter, a number, and a special character.');
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    return true;
};

export const deleteAccount = async (userId: string, password?: string) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    if (!user.password) {
        throw new Error('Account deletion failed. Please contact support (Social account).');
    }

    const isMatch = await bcrypt.compare(password || '', user.password);
    if (!isMatch) throw new Error('Invalid password. Account deletion aborted.');

    const activeReads = await Readlist.find({ user_id: user._id, status: 'active' });
    if (activeReads.length > 0) {
        throw new Error('You cannot delete your account while you have active reading sessions. Please finish or remove them first.');
    }

    await mongoose.model('Wishlist').deleteMany({ user_id: user._id });
    await mongoose.model('Review').deleteMany({ user_id: user._id });
    await mongoose.model('Notification').deleteMany({ user_id: user._id });
    await mongoose.model('ActivityLog').deleteMany({ user_id: user._id });
    await mongoose.model('BookRequest').deleteMany({ user_id: user._id });
    await AuthToken.deleteMany({ user_id: user._id });

    // Perform Soft Delete
    user.password = undefined;
    user.googleId = undefined;
    user.profileImage = undefined;
    user.isDeleted = true;
    user.deletedAt = new Date();
    user.activeSessions = [];

    await user.save();
    return true;
};

// --- Book Requests ---

export const requestBook = async (userId: string, title: string, author: string, reason: string) => {
    const user = await User.findById(userId).populate('membership_id');
    if (!user) throw new Error('User not found');

    const membership = user.membership_id as any;
    if (!membership) throw new Error('No membership plan assigned');

    if (!membership.canRequestBooks) {
        throw new Error('Book requests are available for Premium members. Upgrade your membership to request new books.');
    }

    const newRequest = new BookRequest({
        user_id: userId,
        title,
        author,
        reason,
    });

    await newRequest.save();

    await sendNotification(
        NotificationType.BOOK_REQUEST,
        `Your request for "${title}" has been submitted.`,
        userId as any,
        undefined,
        newRequest._id.toString()
    );

    await notifyAdmins(
        `New Book Request: ${user.name} suggested "${title}" by ${author}`,
        NotificationType.BOOK_REQUEST,
        undefined,
        newRequest._id.toString()
    );

    return newRequest;
};

export const getMyBookRequests = async (userId: string) => {
    return await BookRequest.find({ user_id: userId })
        .populate('book_id', 'title author coverImage description')
        .sort({ createdAt: -1 });
};

export const getAllBookRequests = async (sort?: string) => {
    let sortOption: any = { createdAt: -1 };
    if (sort === 'oldest') sortOption = { createdAt: 1 };

    const requests = await BookRequest.find()
        .populate({
            path: 'user_id',
            select: 'name email membership_id',
            populate: {
                path: 'membership_id',
                select: 'name displayName'
            }
        })
        .populate('book_id', 'title')
        .sort(sortOption);

    return requests;
};

export const updateBookRequestStatus = async (requestId: string, status: string, adminUser: any, bookId?: string) => {
    if (!Object.values(RequestStatus).includes(status as any)) {
        throw new Error('Invalid status');
    }

    const request = await BookRequest.findById(requestId).populate('user_id', 'name email');
    if (!request) throw new Error('Request not found');

    const oldStatus = request.status;
    request.status = status as any;
    if (bookId) {
        request.book_id = bookId as any;
    }
    await request.save();

    if (status === RequestStatus.APPROVED && oldStatus !== RequestStatus.APPROVED) {
        const user = request.user_id as any;
        if (user && user.email) {
            const subject = 'Book Request Approved';
            const text = `Hi ${user.name},\n\nYour request for the book "${request.title}" by ${request.author} has been approved.\n\nRegards,\nBookStack Administration`;
            try {
                await sendEmail(user.email, subject, text);
            } catch (emailErr) {
                console.error('Failed to send approval email:', emailErr);
            }
        }
    }

    await new ActivityLog({
        user_id: adminUser._id,
        action: ActivityAction.BOOK_REQUEST_STATUS_UPDATED,
        description: `Book request for "${request.title}" status updated to ${status} by ${adminUser.name}`,
    }).save();

    return request;
};

// --- Sessions ---

export const getSessions = async (userId: string) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const sessions = user.activeSessions || [];
    const uniqueSessions: any[] = [];
    const deviceMap = new Map();

    const sortedSessions = [...sessions].sort((a, b) =>
        new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime()
    );

    for (const session of sortedSessions) {
        if (!deviceMap.has(session.device)) {
            deviceMap.set(session.device, true);
            uniqueSessions.push(session);
        }
    }

    return {
        sessions: uniqueSessions,
        lastLogin: user.lastLogin
    };
};

export const revokeSession = async (userId: string, token: string) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    user.activeSessions = (user.activeSessions || []).filter(s => s.token !== token);
    await user.save();
    return true;
};

export const logoutAll = async (userId: string) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    user.activeSessions = [];
    await user.save();
    return true;
};

// --- Cart ---

export const getCart = async (userId: string) => {
    const user = await User.findById(userId).populate('cart.book_id');
    if (!user) throw new Error('User not found');
    return user.cart || [];
};

export const syncCart = async (userId: string, cartItems: any[]) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    user.cart = cartItems.map((item: any) => ({
        book_id: item.book._id,
        quantity: item.quantity
    }));

    await user.save();
    return user.cart;
};

export const clearCart = async (userId: string) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    user.cart = [];
    await user.save();
    return true;
};

// --- Readlist ---

export const getReadlist = async (userId: string) => {
    // Legacy migration logic
    const userDoc = await mongoose.connection.db.collection('users').findOne({ _id: new mongoose.Types.ObjectId(userId) });
    const legacyReadlist = userDoc?.readlist;

    if (Array.isArray(legacyReadlist) && legacyReadlist.length > 0) {
        for (const item of legacyReadlist) {
            try {
                let bookId = null;
                let itemStatus = 'active';
                let addedAt = new Date();
                let completedAt = null;
                let dueDate = null;

                if (item && item.book) {
                    bookId = item.book;
                    itemStatus = item.status || 'active';
                    addedAt = item.addedAt || addedAt;
                    completedAt = item.completedAt;
                    dueDate = item.dueDate || (new Date(new Date(addedAt).getTime() + (14 * 24 * 60 * 60 * 1000)));
                } else if (item) {
                    bookId = item;
                }

                if (bookId && mongoose.Types.ObjectId.isValid(bookId.toString())) {
                    await Readlist.findOneAndUpdate(
                        { user_id: userId, book_id: bookId },
                        {
                            status: itemStatus,
                            addedAt: addedAt,
                            completedAt: completedAt,
                            dueDate: dueDate
                        },
                        { upsert: true }
                    );
                }
            } catch (migrateErr) {
                console.error('Migration error for item:', item, migrateErr);
            }
        }

        await mongoose.connection.db.collection('users').updateOne(
            { _id: new mongoose.Types.ObjectId(userId) },
            { $unset: { readlist: 1 } }
        );
    }

    const readlistItems = await Readlist.find({ user_id: userId })
        .populate('book_id')
        .sort({ addedAt: -1 });

    const validReadlistItems = readlistItems.filter(item => item.book_id !== null);

    return validReadlistItems.map(item => ({
        _id: item._id,
        book: item.book_id,
        status: item.status,
        addedAt: item.addedAt,
        dueDate: item.dueDate,
        completedAt: item.completedAt
    }));
};

export const checkBookAccess = async (userId: string, bookId: string) => {
    const nowTime = new Date().getTime();

    const readlistItem = await Readlist.findOne({
        user_id: userId,
        book_id: bookId,
        status: 'active'
    }).sort({ addedAt: -1 });

    const hasValidReadlist = readlistItem && readlistItem.dueDate && new Date(readlistItem.dueDate).getTime() > nowTime;
    const isExpired = !!readlistItem && !hasValidReadlist;

    return {
        hasAccess: !!hasValidReadlist,
        inReadlist: !!readlistItem,
        hasBorrow: false,
        hasPurchased: false,
        isExpired,
        dueDate: readlistItem?.dueDate || null
    };
};

export const addToReadlist = async (userId: string, bookId: string) => {
    let user = await User.findById(userId).populate('membership_id');
    if (!user) throw new Error('User not found');

    let membership = user.membership_id as any;
    if (!membership) {
        const basicMembership = await Membership.findOne({ name: MembershipName.BASIC });
        if (basicMembership) {
            user.membership_id = basicMembership._id;
            await user.save();
            membership = basicMembership;
        }
    }

    if (!membership) throw new Error('Membership plan not found');

    const book = await Book.findById(bookId);
    if (!book) throw new Error('Book not found');

    if (book.isPremium && membership.name === MembershipName.BASIC) {
        const err: any = new Error(`"${book.title}" is a Premium book. Please upgrade your membership to read it, or you can purchase it directly.`);
        err.requiresUpgrade = true;
        throw err;
    }

    let monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    if (user.membershipStartDate && membership.name === MembershipName.PREMIUM) {
        const start = new Date(user.membershipStartDate);
        const now = new Date();
        const startDay = start.getDate();
        let currentCycleStart = new Date(now.getFullYear(), now.getMonth(), startDay);
        if (currentCycleStart.getMonth() !== now.getMonth()) {
            currentCycleStart = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }
        if (currentCycleStart > now) {
            currentCycleStart = new Date(now.getFullYear(), now.getMonth() - 1, startDay);
            if (currentCycleStart.getMonth() === now.getMonth()) {
                currentCycleStart = new Date(now.getFullYear(), now.getMonth(), 0);
            }
        }
        monthStart = currentCycleStart;
    }

    const monthlyCount = await Readlist.countDocuments({
        user_id: userId,
        addedAt: { $gte: monthStart },
        source: { $ne: 'order' }
    });

    let limit = membership.monthlyLimit || 0;
    if (limit === 0 && membership.name === MembershipName.BASIC) limit = 3;

    if (monthlyCount >= limit) {
        const isBasic = membership.name === MembershipName.BASIC;
        throw new Error(isBasic
            ? `You have reached your monthly limit of ${limit} books. Wait until next month or upgrade your plan.`
            : `You have reached your monthly limit of ${limit} books. Please wait until next month to add more.`);
    }

    const existingEntry = await Readlist.findOne({ user_id: userId, book_id: bookId }).sort({ addedAt: -1 });

    const accessDuration = membership.accessDuration || 14;
    const newDueDate = new Date();
    newDueDate.setDate(newDueDate.getDate() + accessDuration);

    if (existingEntry) {
        const isReadlistActive = existingEntry.dueDate && new Date(existingEntry.dueDate) > new Date() && existingEntry.status === 'active';
        if (isReadlistActive) throw new Error('Book is already active in your readlist');

        existingEntry.status = 'active';
        existingEntry.addedAt = new Date();
        existingEntry.dueDate = newDueDate;
        await existingEntry.save();
    } else {
        const newEntry = new Readlist({
            user_id: userId,
            book_id: bookId,
            status: 'active',
            addedAt: new Date(),
            dueDate: newDueDate
        });
        await newEntry.save();
    }

    await ActivityLog.create({
        user_id: userId,
        action: 'ADD_TO_READLIST',
        description: `Added book to readlist: ${book.title}`,
        book_id: bookId as any,
        timestamp: new Date()
    });

    return true;
};

export const getReadingProgress = async (userId: string, bookId: string) => {
    const progress = await Readlist.findOne({ user_id: userId, book_id: bookId }).sort({ addedAt: -1 });
    if (!progress) throw new Error('No reading progress found for this book');
    return {
        last_page: progress.last_page,
        bookmarks: progress.bookmarks,
        status: progress.status
    };
};

export const updateReadingProgress = async (userId: string, bookId: string, progressData: any) => {
    const { last_page, bookmarks, status } = progressData;
    const progress = await Readlist.findOne({ user_id: userId, book_id: bookId }).sort({ addedAt: -1 });
    if (!progress) throw new Error('No reading progress found for this book');

    if (last_page !== undefined) progress.last_page = last_page;
    if (bookmarks !== undefined) progress.bookmarks = bookmarks;
    if (status !== undefined) progress.status = status;

    if (status === 'completed' && !progress.completedAt) {
        progress.completedAt = new Date();
    }

    await progress.save();
    return progress;
};

// --- Admin Stats & Management ---

export const getAdminDashboardStats = async (addedBy?: string) => {
    const totalBooks = await Book.countDocuments({});
    const totalCategories = await Category.countDocuments({});

    const [totalReads, activeReads] = await Promise.all([
        Readlist.countDocuments({}),
        Readlist.countDocuments({ status: 'active' })
    ]);

    let totalOrders = 0;
    let totalRevenue = 0;
    let completedOrders = 0;
    let pendingOrders = 0;

    const realizedStatuses = ['delivered', 'completed', 'returned'];
    const pendingStatuses = ['pending', 'processing', 'shipped'];

    if (addedBy) {
        const adminLogs = await ActivityLog.find({
            user_id: addedBy,
            action: { $regex: /Added new book/i }
        }).select('book_id');

        const adminBookIdsFromLogs = adminLogs.map(log => log.book_id?.toString()).filter(id => !!id);
        const adminBooks = await Book.find({ addedBy }).select('_id');
        const adminBookIdsFromBooks = adminBooks.map(b => b._id.toString());

        const adminBookIds = Array.from(new Set([...adminBookIdsFromLogs, ...adminBookIdsFromBooks]));

        const orders = await Order.find({ 'items.book_id': { $in: adminBookIds } });
        totalOrders = orders.length;

        orders.forEach(order => {
            const adminItems = order.items.filter(item => adminBookIds.includes(item.book_id.toString()));
            const adminRevenue = adminItems.reduce((sum, item) => sum + (item.priceAtOrder * item.quantity), 0);

            if (realizedStatuses.includes(order.status)) {
                totalRevenue += adminRevenue;
                completedOrders++;
            } else if (pendingStatuses.includes(order.status)) {
                pendingOrders++;
            }
        });
    } else {
        const orders = await Order.find({});
        totalOrders = orders.length;

        const premiumMembership = await Membership.findOne({ name: new RegExp(`^${MembershipName.PREMIUM}$`, 'i') });
        if (premiumMembership) {
            const premiumMemberCount = await User.countDocuments({
                membership_id: premiumMembership._id,
                isDeleted: false
            });
            totalRevenue += (premiumMembership.price || 99) * premiumMemberCount;
        }

        orders.forEach(order => {
            if (realizedStatuses.includes(order.status)) {
                totalRevenue += (order.totalAmount || 0);
                completedOrders++;
            } else if (pendingStatuses.includes(order.status)) {
                pendingOrders++;
            }
        });
    }

    const pendingSuggestions = await BookRequest.countDocuments({ status: RequestStatus.PENDING });

    const getMostFrequent = async (Model: any, field: string) => {
        const result = await Model.aggregate([
            { $group: { _id: `$${field}`, count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 1 }
        ]);
        return result.length > 0 ? result[0] : null;
    };

    const mostReadMatch = await getMostFrequent(Readlist, 'book_id');
    const mostWishlistedMatch = await getMostFrequent(Wishlist, 'book_id');
    const mostActiveMatch = await getMostFrequent(Readlist, 'user_id');
    const topBuyerMatch = await getMostFrequent(Order, 'user_id');

    const mostReadBook = mostReadMatch ?
        (await Book.findById(mostReadMatch._id).select('title'))?.title + ` (${mostReadMatch.count})` || 'N/A' : 'N/A';
    const mostWishlistedBook = mostWishlistedMatch ?
        (await Book.findById(mostWishlistedMatch._id).select('title'))?.title + ` (${mostWishlistedMatch.count})` || 'N/A' : 'N/A';
    const mostActiveUser = mostActiveMatch ?
        (await User.findById(mostActiveMatch._id).select('name'))?.name + ` (${mostActiveMatch.count})` || 'N/A' : 'N/A';
    const topBuyer = topBuyerMatch ?
        (await User.findById(topBuyerMatch._id).select('name'))?.name + ` (${topBuyerMatch.count})` || 'N/A' : 'N/A';

    return {
        totalBooks,
        totalCategories,
        totalReads,
        activeReads,
        totalOrders,
        totalRevenue,
        pendingOrders,
        completedOrders,
        pendingSuggestions,
        mostReadBook,
        mostWishlistedBook,
        mostActiveUser,
        topBuyer
    };
};

export const getAllReadlistEntries = async (filters: any, pagination: { page: number; limit: number }) => {
    const { membership, status } = filters;
    const skip = (pagination.page - 1) * pagination.limit;
    const query: any = {};

    if (status && status !== 'all') {
        query.status = status;
    }

    if (membership && membership !== 'all') {
        const targetMembership = await Membership.findOne({ name: new RegExp(membership as string, 'i') });
        if (targetMembership) {
            const users = await User.find({ membership_id: targetMembership._id }).select('_id');
            query.user_id = { $in: users.map((u: any) => u._id) };
        } else if (membership === MembershipName.BASIC) {
            const users = await User.find({ membership_id: { $exists: false } }).select('_id');
            query.user_id = { $in: users.map((u: any) => u._id) };
        }
    }

    const readlistEntries = await Readlist.find(query)
        .populate({
            path: 'user_id',
            select: 'name email membership_id',
            populate: {
                path: 'membership_id',
                select: 'name displayName'
            }
        })
        .populate('book_id', 'title')
        .sort({ addedAt: -1 })
        .skip(skip)
        .limit(pagination.limit);

    const total = await Readlist.countDocuments(query);

    return {
        readlist: readlistEntries,
        total,
        page: pagination.page,
        pages: Math.ceil(total / pagination.limit),
    };
};
