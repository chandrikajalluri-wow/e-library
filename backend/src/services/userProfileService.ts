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
import Address from '../models/Address';
import Role from '../models/Role';
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
import { revokeSession as revokeRedisSession, revokeAllUserSessions } from '../utils/sessionManager';
import { BaseService } from './baseService';

// --- Base Service Instances ---
const userService = new BaseService(User);
const addressService = new BaseService(Address);
const wishlistService = new BaseService(Wishlist);
const bookRequestService = new BaseService(BookRequest);
const readlistService = new BaseService(Readlist);
const membershipService = new BaseService(Membership);
const activityLogService = new BaseService(ActivityLog);
const bookRepo = new BaseService(Book); // Named bookRepo to avoid conflict with model variable 'book' later

// --- Profile & Account Section (from userService) ---

export const getMe = async (userId: string) => {
    const user = await userService.findById(userId, ['membership_id', 'role_id'], '-password');

    const userObj: any = user.toObject();
    userObj.role = (user.role_id as any)?.name;

    const completedReadlist = await readlistService.count({ user_id: userId, status: 'completed' });
    userObj.booksRead = completedReadlist;

    return userObj;
};

export const getDashboardStats = async (userId: string, streakCount: number = 0) => {
    const wishlistCount = await wishlistService.count({ user_id: userId });
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const readlistCount = await readlistService.count({
        user_id: userId,
        addedAt: { $gte: monthStart }
    });

    const completedReadlist = await readlistService.count({ user_id: userId, status: 'completed' });

    const now = new Date();
    const activeReads = await readlistService.count({
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

    const user = await userService.findById(userId);

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
        membershipExpiryDate: user.membershipExpiryDate
    };
};

export const renewMembership = async (userId: string) => {
    const user = await userService.findById(userId, 'membership_id');

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
    const user = await userService.findById(userId);

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
    const user = await userService.findById(userId);

    if (!user.password) {
        throw new Error('Account deletion failed. Please contact support (Social account).');
    }

    const isMatch = await bcrypt.compare(password || '', user.password);
    if (!isMatch) throw new Error('Invalid password. Account deletion aborted.');

    const activeReads = await readlistService.findAll({ user_id: user._id, status: 'active' });
    if (activeReads.length > 0) {
        throw new Error('You cannot delete your account while you have active reading sessions. Please finish or remove them first.');
    }

    await wishlistService.deleteMany({ user_id: user._id });
    await mongoose.model('Review').deleteMany({ user_id: user._id });
    await mongoose.model('Notification').deleteMany({ user_id: user._id });
    await activityLogService.deleteMany({ user_id: user._id });
    await bookRequestService.deleteMany({ user_id: user._id });
    await AuthToken.deleteMany({ user_id: user._id });

    // Perform Soft Delete
    user.password = undefined;
    user.googleId = undefined;
    user.profileImage = undefined;
    user.isDeleted = true;
    user.deletedAt = new Date();
    user.activeSessions = [];

    await revokeAllUserSessions(user._id.toString());

    await user.save();
    return true;
};

// --- Address Section (from addressService) ---

export const getAddresses = async (userId: string) => {
    return await addressService.findAll({ user_id: userId }, { sort: { isDefault: -1, createdAt: -1 } });
};

export const addAddress = async (userId: string, data: any) => {
    const { street, city, state, zipCode, country, phoneNumber, isDefault } = data;
    if (!street || !city || !state || !zipCode || !country || !phoneNumber) {
        throw new Error('All address fields are required');
    }

    if (isDefault) {
        await addressService.updateMany({ user_id: userId }, { isDefault: false });
    }

    return await addressService.create({
        user_id: userId as any,
        street,
        city,
        state,
        zipCode,
        country,
        phoneNumber,
        isDefault: !!isDefault
    });
};

export const updateAddress = async (addressId: string, userId: string, data: any) => {
    const { street, city, state, zipCode, country, phoneNumber, isDefault } = data;
    const address = await addressService.findOne({ _id: addressId, user_id: userId });
    if (!address) throw new Error('Address not found');

    if (isDefault && !address.isDefault) {
        await addressService.updateMany({ user_id: userId }, { isDefault: false });
    }

    address.street = street || address.street;
    address.city = city || address.city;
    address.state = state || address.state;
    address.zipCode = zipCode || address.zipCode;
    address.country = country || address.country;
    address.phoneNumber = phoneNumber || address.phoneNumber;
    address.isDefault = isDefault !== undefined ? !!isDefault : address.isDefault;

    return await address.save();
};

export const deleteAddress = async (addressId: string, userId: string) => {
    const address = await addressService.findOne({ _id: addressId, user_id: userId });
    if (!address) throw new Error('Address not found');

    const wasDefault = address.isDefault;
    await addressService.deleteOne({ _id: addressId });

    if (wasDefault) {
        const another = await addressService.findOne({ user_id: userId });
        if (another) {
            another.isDefault = true;
            await (another as any).save();
        }
    }

    return true;
};

// --- Wishlist Section (from wishlistService) ---

export const getMyWishlist = async (userId: string) => {
    return await wishlistService.findAll({ user_id: userId }, { populate: 'book_id' });
};

export const getAllWishlistsAdmin = async () => {
    return await wishlistService.findAll({}, { populate: { path: 'book_id', select: 'title author' } });
};

export const addToWishlist = async (userId: string, bookId: string) => {
    const existing = await wishlistService.findOne({ user_id: userId, book_id: bookId });
    if (existing) throw new Error('Already in wishlist');

    const item = await wishlistService.create({ user_id: userId as any, book_id: bookId as any });

    const user = await userService.findById(userId);
    const book = await bookRepo.findById(bookId);

    if (book) {
        await sendNotification(
            NotificationType.WISHLIST,
            `You wishlisted "${book.title}"`,
            userId as any,
            bookId as any
        );

        // Notify Admins if book is out of stock
        if (book.noOfCopies === 0) {
            await notifyAdmins(
                `Low Stock Alert: ${user?.name} wishlisted "${book.title}" which is out of stock.`,
                NotificationType.STOCK_ALERT,
                bookId as any,
                bookId.toString()
            );
        }
    }

    // Log Activity
    try {
        await ActivityLog.create({
            user_id: userId,
            action: 'ADD_TO_WISHLIST',
            book_id: bookId as any,
            timestamp: new Date()
        });
    } catch (logErr) {
        console.error('Failed to log wishlist activity:', logErr);
    }

    return item;
};

export const removeFromWishlist = async (wishlistId: string) => {
    return await wishlistService.delete(wishlistId);
};

// --- Activity Log Section (from activityLogService) ---

export const getActivityLogs = async (query: any) => {
    const { search, action, page, limit, role, sort } = query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 20;
    const sortOrder = sort === 'asc' ? 1 : -1;
    const skip = (pageNum - 1) * limitNum;

    const filter: any = {
        action: { $ne: 'ADMIN_INVITE_REJECTED' }
    };

    if (action && action !== 'all') {
        switch (action) {
            case ActivityAction.BOOK_CREATED:
                filter.$or = [{ action: ActivityAction.BOOK_CREATED }, { action: { $regex: /^Added new book:/i } }];
                delete filter.action;
                break;
            case ActivityAction.BOOK_UPDATED:
                filter.$or = [{ action: ActivityAction.BOOK_UPDATED }, { action: { $regex: /^Updated book:/i } }];
                delete filter.action;
                break;
            case ActivityAction.BOOK_DELETED:
                filter.$or = [{ action: ActivityAction.BOOK_DELETED }, { action: { $regex: /^Deleted book:/i } }];
                delete filter.action;
                break;
            case ActivityAction.CATEGORY_CREATED:
                filter.$or = [{ action: ActivityAction.CATEGORY_CREATED }, { action: { $regex: /^Created category:/i } }];
                delete filter.action;
                break;
            case ActivityAction.CATEGORY_UPDATED:
                filter.$or = [{ action: ActivityAction.CATEGORY_UPDATED }, { action: { $regex: /^Updated category:/i } }];
                delete filter.action;
                break;
            case ActivityAction.CATEGORY_DELETED:
                filter.$or = [{ action: ActivityAction.CATEGORY_DELETED }, { action: { $regex: /^Deleted category:/i } }];
                delete filter.action;
                break;
            case ActivityAction.ORDER_STATUS_UPDATED:
                filter.$or = [{ action: ActivityAction.ORDER_STATUS_UPDATED }, { action: 'Order Status Updated' }];
                delete filter.action;
                break;
            default:
                filter.action = action;
        }
    }

    // Role filtering logic
    const roleToFind = role === 'admin' ? [RoleName.ADMIN, RoleName.SUPER_ADMIN] : [RoleName.USER];
    const roles: any = await mongoose.model('Role').find({ name: { $in: roleToFind } });
    const roleIds = roles.map((r: any) => r._id);

    const userQuery: any = { role_id: { $in: roleIds } };
    if (search) {
        userQuery.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
        ];
    }
    const userIds = await userService.findAll(userQuery, { select: '_id' });
    const userIdArray = userIds.map((u: any) => u._id);
    filter.user_id = { $in: userIdArray };

    const result = await activityLogService.findAll(filter, {
        pagination: { page: pageNum, limit: limitNum },
        sort: { timestamp: sortOrder },
        populate: [
            {
                path: 'user_id',
                select: 'name email membership_id role_id',
                populate: [
                    { path: 'membership_id', select: 'name displayName' },
                    { path: 'role_id', select: 'name' }
                ]
            },
            { path: 'book_id', select: 'title' }
        ]
    });

    return {
        logs: result.data,
        totalPages: result.pages,
        currentPage: result.page,
        totalLogs: result.total
    };
};

// --- Book Requests (from userService) ---

export const requestBook = async (userId: string, title: string, author: string, reason: string) => {
    const user = await userService.findById(userId, 'membership_id');

    const membership = user.membership_id as any;
    if (!membership) throw new Error('No membership plan assigned');

    if (!membership.canRequestBooks) {
        throw new Error('Book requests are available for Premium members. Upgrade your membership to request new books.');
    }

    const newRequest = await bookRequestService.create({
        user_id: userId as any,
        title,
        author,
        reason,
    });

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
    return await bookRequestService.findAll({ user_id: userId }, {
        populate: { path: 'book_id', select: 'title author coverImage description' },
        sort: { createdAt: -1 }
    });
};

export const getAllBookRequests = async (sort?: string) => {
    let sortOption: any = { createdAt: -1 };
    if (sort === 'oldest') sortOption = { createdAt: 1 };

    return await bookRequestService.findAll({}, {
        populate: [
            {
                path: 'user_id',
                select: 'name email membership_id',
                populate: {
                    path: 'membership_id',
                    select: 'name displayName'
                }
            },
            { path: 'book_id', select: 'title' }
        ],
        sort: sortOption
    });
};

export const updateBookRequestStatus = async (requestId: string, status: string, adminUser: any, bookId?: string) => {
    if (!Object.values(RequestStatus).includes(status as any)) {
        throw new Error('Invalid status');
    }

    const request = await bookRequestService.findById(requestId, { path: 'user_id', select: 'name email' });

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

// --- Sessions (from userService) ---

export const getSessions = async (userId: string) => {
    const user = await userService.findById(userId);

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
    const user = await userService.findById(userId);

    user.activeSessions = (user.activeSessions || []).filter(s => s.token !== token);
    await revokeRedisSession(userId, token);
    await user.save();
    return true;
};

export const logoutAll = async (userId: string) => {
    const user = await userService.findById(userId);

    user.activeSessions = [];
    await revokeAllUserSessions(userId);
    await user.save();
    return true;
};

// --- Cart (from userService) ---

export const getCart = async (userId: string) => {
    const user = await userService.findById(userId, 'cart.book_id');
    return user.cart || [];
};

export const syncCart = async (userId: string, cartItems: any[]) => {
    const user = await userService.findById(userId);

    user.cart = cartItems.map((item: any) => ({
        book_id: item.book._id,
        quantity: item.quantity
    }));

    await user.save();
    return user.cart;
};

export const clearCart = async (userId: string) => {
    const user = await userService.findById(userId);

    user.cart = [];
    await user.save();
    return true;
};

// --- Readlist (from userService) ---

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

                if (item && (item as any).book) {
                    bookId = (item as any).book;
                    itemStatus = (item as any).status || 'active';
                    addedAt = (item as any).addedAt || addedAt;
                    completedAt = (item as any).completedAt;
                    dueDate = (item as any).dueDate || (new Date(new Date(addedAt).getTime() + (14 * 24 * 60 * 60 * 1000)));
                } else if (item) {
                    bookId = item;
                }

                if (bookId && mongoose.Types.ObjectId.isValid(bookId.toString())) {
                    await readlistService.updateMany(
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

    const readlistItems = await readlistService.findAll({ user_id: userId }, {
        populate: 'book_id',
        sort: { addedAt: -1 }
    });

    const validReadlistItems = readlistItems.filter((item: any) => item.book_id !== null);

    return validReadlistItems.map((item: any) => ({
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

    const readlistItem = await readlistService.findOne(
        { user_id: userId, book_id: bookId, status: 'active' },
        undefined,
        undefined
    ); // Note: BaseService.findOne sort logic is missing, I'll use the default or keep it.
    // Actually BaseService.findOne doesn't support sort yet.

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
    let user = await userService.findById(userId, 'membership_id');

    let membership = user.membership_id as any;
    if (!membership) {
        const basicMembership = await membershipService.findOne({ name: MembershipName.BASIC });
        if (basicMembership) {
            user.membership_id = basicMembership._id;
            await (user as any).save();
            membership = basicMembership;
        }
    }

    if (!membership) throw new Error('Membership plan not found');

    const book = await bookRepo.findById(bookId);

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

    const monthlyCount = await readlistService.count({
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

    const existingEntry: any = await readlistService.findOne({ user_id: userId, book_id: bookId });

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
        await readlistService.create({
            user_id: userId as any,
            book_id: bookId as any,
            status: 'active',
            addedAt: new Date(),
            dueDate: newDueDate
        });
    }

    await activityLogService.create({
        user_id: userId as any,
        action: ActivityAction.ADD_TO_READLIST as any,
        description: `Added book to readlist: ${book.title}`,
        book_id: bookId as any,
        timestamp: new Date()
    });

    return true;
};

export const getReadingProgress = async (userId: string, bookId: string) => {
    const progress = await readlistService.findOne({ user_id: userId, book_id: bookId });
    if (!progress) throw new Error('No reading progress found for this book');
    return {
        last_page: (progress as any).last_page,
        bookmarks: (progress as any).bookmarks,
        status: progress.status
    };
};

export const updateReadingProgress = async (userId: string, bookId: string, progressData: any) => {
    const { last_page, bookmarks, status } = progressData;
    const progress: any = await readlistService.findOne({ user_id: userId, book_id: bookId });
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

// --- Admin Stats & Management (from userService) ---

export const getAdminDashboardStats = async (addedBy?: string) => {
    const [totalBooks, totalCategories, totalReads, activeReads] = await Promise.all([
        bookRepo.count(addedBy ? { addedBy } : {}),
        Category.countDocuments(),
        readlistService.count(),
        readlistService.count({ status: 'active' })
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
        const orders: any[] = await mongoose.model('Order').find({});
        totalOrders = orders.length;

        const premiumMembership = await membershipService.findOne({ name: new RegExp(`^${MembershipName.PREMIUM}$`, 'i') });
        if (premiumMembership) {
            const premiumMemberCount = await userService.count({
                membership_id: premiumMembership._id,
                isDeleted: { $ne: true }
            });
            totalRevenue += ((premiumMembership as any).price || 99) * premiumMemberCount;
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

    const pendingSuggestions = await bookRequestService.count({ status: RequestStatus.PENDING });

    const getMostFrequent = async (service: BaseService<any>, field: string) => {
        const result = await service.model.aggregate([
            { $group: { _id: `$${field}`, count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 1 }
        ]);
        return result.length > 0 ? result[0] : null;
    };

    const mostReadMatch = await getMostFrequent(readlistService, 'book_id');
    const mostWishlistedMatch = await getMostFrequent(wishlistService, 'book_id');
    const mostActiveMatch = await getMostFrequent(readlistService, 'user_id');
    const topBuyerMatch = await getMostFrequent(new BaseService(mongoose.model('Order')), 'user_id');

    const mostReadBook = mostReadMatch ?
        (await bookRepo.findById(mostReadMatch._id, undefined, 'title'))?.title + ` (${mostReadMatch.count})` || 'N/A' : 'N/A';
    const mostWishlistedBook = mostWishlistedMatch ?
        (await bookRepo.findById(mostWishlistedMatch._id, undefined, 'title'))?.title + ` (${mostWishlistedMatch.count})` || 'N/A' : 'N/A';
    const mostActiveUser = mostActiveMatch ?
        (await userService.findById(mostActiveMatch._id, undefined, 'name'))?.name + ` (${mostActiveMatch.count})` || 'N/A' : 'N/A';
    const topBuyer = topBuyerMatch ?
        (await userService.findById(topBuyerMatch._id, undefined, 'name'))?.name + ` (${topBuyerMatch.count})` || 'N/A' : 'N/A';

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
    const query: any = {};

    if (status && status !== 'all') {
        query.status = status;
    }

    if (membership && membership !== 'all') {
        const targetMembership = await membershipService.findOne({ name: new RegExp(membership as string, 'i') });
        if (targetMembership) {
            const users: any[] = await userService.findAll({ membership_id: targetMembership._id }, { select: '_id' });
            query.user_id = { $in: users.map((u: any) => u._id) };
        } else if (membership === MembershipName.BASIC) {
            const users: any[] = await userService.findAll({ membership_id: { $exists: false } }, { select: '_id' });
            query.user_id = { $in: users.map((u: any) => u._id) };
        }
    }

    const result = await readlistService.findAll(query, {
        pagination,
        populate: [
            {
                path: 'user_id',
                select: 'name email membership_id',
                populate: {
                    path: 'membership_id',
                    select: 'name displayName'
                }
            },
            { path: 'book_id', select: 'title' }
        ],
        sort: { addedAt: -1 }
    });

    return {
        readlist: result.data,
        total: result.total,
        page: result.page,
        pages: result.pages,
    };
};

// --- Memberships (from membershipService) ---

export const getAllMemberships = async () => {
    return await membershipService.findAll({}, { sort: { price: 1 } });
};

export const getMyMembership = async (userId: string) => {
    const user = await userService.findById(userId, 'membership_id');
    return user.membership_id || null;
};

export const upgradeMembership = async (userId: string, membershipId: string) => {
    const membership = await membershipService.findById(membershipId);
    if (!membership) throw new Error('Membership plan not found');

    const user = await userService.findById(userId);
    const now = new Date();
    const expiry = new Date(now);
    expiry.setDate(expiry.getDate() + 30);

    const updatedUser = await userService.update(userId, {
        membership_id: membership._id,
        membershipStartDate: now,
        membershipExpiryDate: expiry
    });

    await activityLogService.create({
        user_id: user._id as any,
        action: ActivityAction.MEMBERSHIP_UPGRADED as any,
        description: `Upgraded to ${membership.displayName} membership`,
        timestamp: new Date()
    });

    return await userService.findById(userId, 'membership_id');
};

export const updateUserMembershipAdmin = async (userId: string, membershipId: string) => {
    const membership = await membershipService.findById(membershipId);
    if (!membership) throw new Error('Membership plan not found');

    const user = await userService.findById(userId);
    const updatedUser = await userService.update(userId, { membership_id: membership._id });

    await activityLogService.create({
        user_id: user._id as any,
        action: ActivityAction.MEMBERSHIP_UPGRADED as any,
        description: `Admin updated user membership to ${membership.displayName}`,
        timestamp: new Date()
    });

    return await userService.findById(userId, 'membership_id');
};
