import { Response } from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User';
import Membership from '../models/Membership';
import { IRole } from '../models/Role';
import Wishlist from '../models/Wishlist';
import BookRequest from '../models/BookRequest';
import AuthToken from '../models/AuthToken';
import { AuthRequest } from '../middleware/authMiddleware';
import Book from '../models/Book';
import Order from '../models/Order';
import Readlist from '../models/Readlist';
import ActivityLog from '../models/ActivityLog';
import Category from '../models/Category';
import { sendEmail } from '../utils/mailer';
import { sendNotification, notifyAdmins } from '../utils/notification';
import { NotificationType, MembershipName, UserTheme, RequestStatus, RoleName, OrderStatus, BookStatus, ActivityAction } from '../types/enums';

export const getMe = async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.user!._id)
            .select('-password')
            .populate('membership_id')
            .populate('role_id');

        if (!user) return res.status(404).json({ error: 'User not found' });

        const userObj: any = user.toObject();
        userObj.role = (user.role_id as any)?.name;

        // Calculate automated books read count
        const completedReadlist = await Readlist.countDocuments({ user_id: req.user!._id, status: 'completed' });
        userObj.booksRead = completedReadlist;

        res.json(userObj);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};
export const getDashboardStats = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!._id;

        const wishlistCount = await Wishlist.countDocuments({ user_id: userId });

        // Count books added to readlist 
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const readlistCount = await Readlist.countDocuments({
            user_id: userId,
            addedAt: { $gte: monthStart }
        });

        const completedReadlist = await Readlist.countDocuments({ user_id: userId, status: 'completed' });

        // Calculate active reads (active status + not expired)
        const now = new Date();
        const activeReads = await Readlist.countDocuments({
            user_id: userId,
            status: 'active',
            dueDate: { $gt: now }
        });

        res.json({
            borrowedCount: readlistCount,
            wishlistCount,
            streakCount: (req.user as any).streakCount || 0,
            booksRead: completedReadlist,
            activeReads
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
    const { name, phone, favoriteGenres, booksRead, readingTarget } = req.body;
    try {
        const user = await User.findById(req.user!._id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (name) user.name = name;
        if (phone) user.phone = phone;
        if (favoriteGenres !== undefined) {
            // Ensure favoriteGenres is an array and has at most 3 items
            const genresArray = Array.isArray(favoriteGenres)
                ? favoriteGenres
                : typeof favoriteGenres === 'string'
                    ? JSON.parse(favoriteGenres)
                    : [];

            if (genresArray.length > 3) {
                return res.status(400).json({ error: 'You can select at most 3 favorite genres' });
            }
            user.favoriteGenres = genresArray;
        }
        if (readingTarget !== undefined) user.readingTarget = Number(readingTarget);

        if (req.file) {
            user.profileImage = (req.file as any).path;
        }

        await user.save();

        res.json({
            message: 'Profile updated successfully',
            user: {
                name: user.name,
                email: user.email,
                phone: user.phone,
                profileImage: user.profileImage,
                favoriteGenres: user.favoriteGenres,
                readingTarget: user.readingTarget,
                membershipStartDate: user.membershipStartDate,
                membershipExpiryDate: user.membershipExpiryDate,
                theme: user.theme
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const renewMembership = async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.user!._id).populate('membership_id');
        if (!user) return res.status(404).json({ error: 'User not found' });

        const membership = user.membership_id as any;
        if (!membership || membership.name === MembershipName.BASIC) {
            return res.status(400).json({ error: 'Basic membership cannot be renewed. Please upgrade to a paid plan.' });
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

        res.json({
            message: 'Membership renewed successfully',
            membershipExpiryDate: user.membershipExpiryDate
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    try {
        const user = await User.findById(req.user!._id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (!user.password) {
            return res.status(400).json({ error: 'This account does not have a password (signed up via social login).' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Incorrect current password' });

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                error: 'Password must be at least 8 characters long and include an uppercase letter, a number, and a special character.'
            });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ message: 'Password changed successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const requestBook = async (req: AuthRequest, res: Response) => {
    const { title, author, reason } = req.body;
    try {
        if (!title || !author)
            return res.status(400).json({ error: 'Title and author are required' });

        const user = await User.findById(req.user!._id).populate('membership_id');
        if (!user) return res.status(404).json({ error: 'User not found' });

        const membership = user.membership_id as any;
        if (!membership) {
            return res.status(400).json({
                error: 'No membership plan assigned'
            });
        }

        if (!membership.canRequestBooks) {
            return res.status(403).json({
                error: 'Book requests are available for Premium members. Upgrade your membership to request new books.'
            });
        }

        const newRequest = new BookRequest({
            user_id: req.user!._id,
            title,
            author,
            reason,
        });

        await newRequest.save();

        // Notify User
        await sendNotification(
            NotificationType.BOOK_REQUEST,
            `Your request for "${title}" has been submitted.`,
            req.user!._id as any,
            undefined,
            newRequest._id.toString()
        );

        // Notify Admins
        await notifyAdmins(
            `New Book Request: ${user.name} suggested "${title}" by ${author}`,
            NotificationType.BOOK_REQUEST,
            undefined,
            newRequest._id.toString()
        );

        res.status(201).json({
            message: 'Book request submitted successfully',
            request: newRequest,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getAllBookRequests = async (req: AuthRequest, res: Response) => {
    try {
        const { sort } = req.query;
        let sortOption: any = { createdAt: -1 };

        if (sort === 'oldest') {
            sortOption = { createdAt: 1 };
        }

        const requests = await BookRequest.find()
            .populate({
                path: 'user_id',
                select: 'name email membership_id',
                populate: {
                    path: 'membership_id',
                    select: 'name displayName'
                }
            })
            .sort(sortOption);
        res.json(requests);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const updateBookRequestStatus = async (req: AuthRequest, res: Response) => {
    const { status } = req.body;
    try {
        if (!Object.values(RequestStatus).includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const request = await BookRequest.findById(req.params.id).populate('user_id', 'name email');
        if (!request) return res.status(404).json({ error: 'Request not found' });

        const oldStatus = request.status;
        request.status = status;
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
            user_id: req.user!._id,
            action: ActivityAction.BOOK_REQUEST_STATUS_UPDATED,
            description: `Book request for "${request.title}" status updated to ${status} by ${req.user!.name}`,
        }).save();

        res.json({ message: 'Request status updated', request });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};



export const getSessions = async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.user!._id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Filter duplicates and keep most recent (precaution for existing data)
        const sessions = user.activeSessions || [];
        const uniqueSessions: any[] = [];
        const deviceMap = new Map();

        // Sort by last active descending first
        const sortedSessions = [...sessions].sort((a, b) =>
            new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime()
        );

        for (const session of sortedSessions) {
            if (!deviceMap.has(session.device)) {
                deviceMap.set(session.device, true);
                uniqueSessions.push(session);
            }
        }

        res.json({
            sessions: uniqueSessions,
            lastLogin: user.lastLogin
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const revokeSession = async (req: AuthRequest, res: Response) => {
    const { token } = req.body;
    try {
        const user = await User.findById(req.user!._id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.activeSessions = (user.activeSessions || []).filter(s => s.token !== token);
        await user.save();

        res.json({ message: 'Session revoked successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const logoutAll = async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.user!._id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.activeSessions = [];
        await user.save();

        res.json({ message: 'Logged out from all devices successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const deleteAccount = async (req: AuthRequest, res: Response) => {
    const { password } = req.body;
    try {
        if (!password) {
            return res.status(400).json({ error: 'Password is required to confirm deletion' });
        }

        const user = await User.findById(req.user!._id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (!user.password) {
            return res.status(400).json({ error: 'Account deletion failed. Please contact support (Social account).' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid password. Account deletion aborted.' });
        }

        const activeReads = await Readlist.find({ user_id: user._id, status: 'active' });
        if (activeReads.length > 0) {
            return res.status(400).json({
                error: 'You cannot delete your account while you have active reading sessions. Please finish or remove them first.'
            });
        }

        await mongoose.model('Wishlist').deleteMany({ user_id: user._id });
        await mongoose.model('Review').deleteMany({ user_id: user._id });
        await mongoose.model('Notification').deleteMany({ user_id: user._id });
        await mongoose.model('ActivityLog').deleteMany({ user_id: user._id });
        await mongoose.model('BookRequest').deleteMany({ user_id: user._id });
        await AuthToken.deleteMany({ user_id: user._id });

        // Perform Soft Delete (Preserving Name and Email)
        user.password = undefined;
        user.googleId = undefined;
        user.profileImage = undefined;
        user.isDeleted = true;
        user.deletedAt = new Date();
        user.activeSessions = [];

        await user.save();

        res.json({ message: 'Account permanently deactivated. We are sorry to see you go.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error during account deletion' });
    }
};

export const getCart = async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.user!._id).populate('cart.book_id');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user.cart || []);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const syncCart = async (req: AuthRequest, res: Response) => {
    const { cartItems } = req.body;
    try {
        const user = await User.findById(req.user!._id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.cart = cartItems.map((item: any) => ({
            book_id: item.book._id,
            quantity: item.quantity
        }));

        await user.save();
        res.json({ message: 'Cart synced successfully', cart: user.cart });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const clearCartLocally = async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.user!._id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.cart = [];
        await user.save();
        res.json({ message: 'Cart cleared successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getReadlist = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!._id;

        // 1. Robust Migration: Check for legacy data using direct Mongo query (bypasses schema filtering)
        const userDoc = await mongoose.connection.db.collection('users').findOne({ _id: new mongoose.Types.ObjectId(userId.toString()) });
        const legacyReadlist = userDoc?.readlist;

        if (Array.isArray(legacyReadlist) && legacyReadlist.length > 0) {
            console.log(`Migrating ${legacyReadlist.length} legacy readlist items for user ${userId}`);

            for (const item of legacyReadlist) {
                try {
                    // Item could be:
                    // a) Just an ObjectId (legacy string format)
                    // b) { book: ObjectId, ... } (newer embedded format)
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
                        // Recover dueDate if missing
                        dueDate = item.dueDate || (new Date(new Date(addedAt).getTime() + (14 * 24 * 60 * 60 * 1000)));
                    } else if (item) {
                        bookId = item;
                    }

                    if (bookId && mongoose.Types.ObjectId.isValid(bookId.toString())) {
                        // Use membership duration for dueDate if possible
                        // For migration, we'll just set it to null or calculate 
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

            // Clear legacy data once migrated
            await mongoose.connection.db.collection('users').updateOne(
                { _id: new mongoose.Types.ObjectId(userId.toString()) },
                { $unset: { readlist: 1 } }
            );
            console.log(`Successfully completed migration for user ${userId}`);
        }

        // 2. Query the stabilized standalone Readlist collection
        const readlistItems = await Readlist.find({ user_id: userId })
            .populate('book_id')
            .sort({ addedAt: -1 });

        // 3. Keep all items, even expired ones, but filter out deleted books
        const validReadlistItems = readlistItems.filter(item => item.book_id !== null);

        const formattedReadlist = validReadlistItems.map(item => ({
            _id: item._id,
            book: item.book_id,
            status: item.status,
            addedAt: item.addedAt,
            dueDate: item.dueDate,
            completedAt: item.completedAt
        }));

        res.json(formattedReadlist);
    } catch (err) {
        console.error('getReadlist error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const checkBookAccess = async (req: AuthRequest, res: Response) => {
    const { bookId } = req.params;
    try {
        const userId = req.user!._id;

        const nowTime = new Date().getTime();

        // 1. Get latest records
        const readlistItem = await Readlist.findOne({
            user_id: userId,
            book_id: bookId,
            status: 'active'
        }).sort({ addedAt: -1 });

        const hasValidReadlist = readlistItem && readlistItem.dueDate && new Date(readlistItem.dueDate).getTime() > nowTime;

        // Access is granted ONLY if an active record is NOT expired
        const hasAccess = !!hasValidReadlist;

        // Determination for UI feedback: show "Expired" if they HAVE a record but none are currently valid
        const isExpired = !!readlistItem && !hasValidReadlist;

        const effectiveDueDate = readlistItem?.dueDate || null;

        res.json({
            hasAccess,
            inReadlist: !!readlistItem,
            hasBorrow: false,
            hasPurchased: false,
            isExpired,
            dueDate: effectiveDueDate
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getAdminDashboardStats = async (req: AuthRequest, res: Response) => {
    try {
        const { addedBy } = req.query;

        // Base Query for books - include archived books for administrative overview
        // All admins now see global dashboard stats
        const bookFilter: any = {};

        // 1. Total Books & Categories
        const totalBooks = await Book.countDocuments(bookFilter);
        const totalCategories = await Category.countDocuments({});

        // 2. Reads Stats
        let readlistQuery: any = {};
        const [totalReads, activeReads] = await Promise.all([
            Readlist.countDocuments(readlistQuery),
            Readlist.countDocuments({ ...readlistQuery, status: 'active' })
        ]);

        // 3. Order Stats
        let totalOrders = 0;
        let totalRevenue = 0;
        let completedOrders = 0;
        let pendingOrders = 0;

        const realizedStatuses = ['delivered', 'completed', 'returned'];
        const pendingStatuses = ['pending', 'processing', 'shipped'];

        if (addedBy) {
            // Include ALL books by this admin (Existing, Archived, and even Deleted)
            // We use ActivityLog to find all book IDs ever added by this admin
            const adminLogs = await ActivityLog.find({
                user_id: addedBy,
                action: { $regex: /Added new book/i }
            }).select('book_id');

            const adminBookIdsFromLogs = adminLogs.map(log => log.book_id?.toString()).filter(id => !!id);

            // Also get currently existing books (including archived) just in case logs are missing or updated
            const adminBooks = await Book.find({ addedBy }).select('_id');
            const adminBookIdsFromBooks = adminBooks.map(b => b._id.toString());

            // Unique set of all book IDs associated with this admin
            const adminBookIds = Array.from(new Set([...adminBookIdsFromLogs, ...adminBookIdsFromBooks]));

            // For individual admin, we need to scan orders and filter items
            const orders = await Order.find({ 'items.book_id': { $in: adminBookIds } });
            totalOrders = orders.length;

            orders.forEach(order => {
                const adminItems = order.items.filter(item => adminBookIds.includes(item.book_id.toString()));
                const adminRevenue = adminItems.reduce((sum, item) => sum + (item.priceAtOrder * item.quantity), 0);

                // Realized revenue only from successful orders
                if (realizedStatuses.includes(order.status)) {
                    totalRevenue += adminRevenue;
                    completedOrders++;
                } else if (pendingStatuses.includes(order.status)) {
                    pendingOrders++;
                }
            });
        } else {
            // Global stats for Super Admin if addedBy is not provided
            const orders = await Order.find({});
            totalOrders = orders.length;

            // Add Membership Revenue to Total Revenue (Global)
            const premiumMembership = await Membership.findOne({ name: new RegExp(`^${MembershipName.PREMIUM}$`, 'i') });

            if (premiumMembership) {
                const premiumMemberCount = await User.countDocuments({
                    membership_id: premiumMembership._id,
                    isDeleted: false
                });

                const membershipRevenue = (premiumMembership.price || 99) * premiumMemberCount;

                totalRevenue += membershipRevenue;
            }

            orders.forEach(order => {
                // For Super Admin, we consider totalAmount (item totals + fees) realized upon delivery
                if (realizedStatuses.includes(order.status)) {
                    totalRevenue += (order.totalAmount || 0);
                    completedOrders++;
                } else if (pendingStatuses.includes(order.status)) {
                    pendingOrders++;
                }
            });
        }

        // 4. Suggestions (Total pending book requests)
        // Suggestions are global for now, but we could filter if we knew which category/genre the admin manages.
        // Keeping global as per current architecture unless specified otherwise.
        const pendingSuggestions = await BookRequest.countDocuments({ status: RequestStatus.PENDING });

        // 5. Insights via Aggregation
        const getMostFrequent = async (Model: any, field: string, filter: any = {}) => {
            const result = await Model.aggregate([
                { $match: filter },
                { $group: { _id: `$${field}`, count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 1 }
            ]);
            return result.length > 0 ? result[0] : null;
        };

        const mostReadMatch = await getMostFrequent(Readlist, 'book_id', readlistQuery);
        const mostWishlistedMatch = await getMostFrequent(Wishlist, 'book_id', readlistQuery); // Using readlistQuery (book filter) for wishlist too
        const mostActiveMatch = await getMostFrequent(Readlist, 'user_id', readlistQuery);
        const topBuyerMatch = await getMostFrequent(Order, 'user_id', {});

        // Resolve IDs to human readable strings
        const mostReadBook = mostReadMatch ?
            (await Book.findById(mostReadMatch._id).select('title'))?.title + ` (${mostReadMatch.count})` || 'N/A' : 'N/A';
        const mostWishlistedBook = mostWishlistedMatch ?
            (await Book.findById(mostWishlistedMatch._id).select('title'))?.title + ` (${mostWishlistedMatch.count})` || 'N/A' : 'N/A';
        const mostActiveUser = mostActiveMatch ?
            (await User.findById(mostActiveMatch._id).select('name'))?.name + ` (${mostActiveMatch.count})` || 'N/A' : 'N/A';
        const topBuyer = topBuyerMatch ?
            (await User.findById(topBuyerMatch._id).select('name'))?.name + ` (${topBuyerMatch.count})` || 'N/A' : 'N/A';

        res.json({
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
        });

    } catch (err) {
        console.error('getAdminDashboardStats error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};


export const getAllReadlistEntries = async (req: AuthRequest, res: Response) => {
    try {
        const { membership, status, page = 1, limit = 10 } = req.query; // Removed addedBy from query to enforce it via auth
        const parsedPage = parseInt(page as string) || 1;
        const parsedLimit = parseInt(limit as string) || 10;
        const skip = (parsedPage - 1) * parsedLimit;

        const query: any = {};

        // All admins now see global read history

        // Filter by status
        if (status && status !== 'all') {
            query.status = status;
        }

        // Filter by membership tier
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
            .limit(parsedLimit);

        const total = await Readlist.countDocuments(query);

        res.json({
            readlist: readlistEntries,
            total,
            page: parsedPage,
            pages: Math.ceil(total / parsedLimit),
        });
    } catch (err) {
        console.error('getAllReadlistEntries error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const addToReadlist = async (req: AuthRequest, res: Response) => {
    const { book_id } = req.body;
    try {
        const userId = req.user!._id;

        console.log(`[addToReadlist] User: ${userId}, Book: ${book_id}`);
        // 1. Get user with membership
        let user = await User.findById(userId).populate('membership_id');
        if (!user) {
            console.error(`[addToReadlist] User not found: ${userId}`);
            return res.status(404).json({ error: 'User not found' });
        }

        let membership = user.membership_id as any;
        if (!membership) {
            console.log(`[addToReadlist] Membership missing, searching basic...`);
            const basicMembership = await Membership.findOne({ name: MembershipName.BASIC });
            if (basicMembership) {
                user.membership_id = basicMembership._id;
                await user.save();
                membership = basicMembership;
                console.log(`[addToReadlist] Assigned basic membership`);
            }
        }

        if (!membership) {
            console.error(`[addToReadlist] No membership found and basic failed`);
            return res.status(400).json({ error: 'Membership plan not found' });
        }

        // 2. Fetch Book to check premium status
        const book = await Book.findById(book_id);
        if (!book) {
            console.error(`[addToReadlist] Book not found: ${book_id}`);
            return res.status(404).json({ error: 'Book not found' });
        }

        // 3. Premium Check
        if (book.isPremium && membership.name === MembershipName.BASIC) {
            console.log(`[addToReadlist] Blocked premium book for basic user`);
            return res.status(403).json({
                error: `"${book.title}" is a Premium book. Please upgrade your membership to read it, or you can purchase it directly.`,
                requiresUpgrade: true
            });
        }

        // 4. Check current monthly readlist count
        let monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

        if (user.membershipStartDate && membership.name === MembershipName.PREMIUM) {
            const start = new Date(user.membershipStartDate);
            const now = new Date();
            const startDay = start.getDate();

            // Create a date for the current year/month with the original start day
            let currentCycleStart = new Date(now.getFullYear(), now.getMonth(), startDay);

            // Handle months with fewer days than startDay (e.g. May 31 -> June 30)
            if (currentCycleStart.getMonth() !== now.getMonth()) {
                currentCycleStart = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            }

            // If that date hasn't happened yet this month, go back one month
            if (currentCycleStart > now) {
                currentCycleStart = new Date(now.getFullYear(), now.getMonth() - 1, startDay);
                // Again, handle month-end rollover for the previous month
                if (currentCycleStart.getMonth() === now.getMonth()) {
                    currentCycleStart = new Date(now.getFullYear(), now.getMonth(), 0);
                }
            }

            monthStart = currentCycleStart;
            console.log(`[addToReadlist] Premium Cycle Start: ${monthStart.toISOString()}`);
        }

        const monthlyCount = await Readlist.countDocuments({
            user_id: userId,
            addedAt: { $gte: monthStart },
            source: { $ne: 'order' } // EXCLUDE books added via purchases/orders
        });

        let limit = membership.monthlyLimit || 0;
        if (limit === 0 && membership.name === MembershipName.BASIC) {
            limit = 3;
        }

        console.log(`[addToReadlist] Monthly count: ${monthlyCount}, Limit: ${limit}`);
        if (monthlyCount >= limit) {
            const isBasic = membership.name === MembershipName.BASIC;
            const message = isBasic
                ? `You have reached your monthly limit of ${limit} books. Wait until next month or upgrade your plan.`
                : `You have reached your monthly limit of ${limit} books. Please wait until next month to add more.`;

            return res.status(400).json({
                error: message,
            });
        }

        // 5. Check if already in readlist and NOT expired
        const existingEntry = await Readlist.findOne({ user_id: userId, book_id: book_id }).sort({ addedAt: -1 });

        if (existingEntry) {
            const now = new Date();
            const isReadlistActive = existingEntry.dueDate && new Date(existingEntry.dueDate) > now && existingEntry.status === 'active';
            console.log(`[addToReadlist] Existing entry found. Active: ${isReadlistActive}`);
            if (isReadlistActive) {
                return res.status(400).json({ error: 'Book is already active in your readlist' });
            }

            // If expired, update the existing entry instead of creating a new one
            const accessDuration = membership.accessDuration || 14;
            const newDueDate = new Date();
            newDueDate.setDate(newDueDate.getDate() + accessDuration);

            existingEntry.status = 'active';
            existingEntry.addedAt = new Date();
            existingEntry.dueDate = newDueDate;
            await existingEntry.save();

            try {
                await ActivityLog.create({
                    user_id: userId,
                    action: 'ADD_TO_READLIST',
                    description: `Renewed/Added book to readlist: ${book?.title || 'Unknown'}`,
                    book_id: book_id as any,
                    timestamp: new Date()
                });
            } catch (logErr) {
                console.error('Failed to log readlist renewal:', logErr);
            }

            console.log(`[addToReadlist] Renewed expired entry for ${book_id}`);
            res.json({ message: 'Book added to readlist successfully' });
        } else {
            // 6. Create new entry if none exists
            const accessDuration = membership.accessDuration || 14;
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + accessDuration);

            console.log(`[addToReadlist] Creating new entry with dueDate: ${dueDate}`);
            const newEntry = new Readlist({
                user_id: userId,
                book_id: book_id,
                status: 'active',
                addedAt: new Date(),
                dueDate: dueDate
            });

            await newEntry.save();

            try {
                await ActivityLog.create({
                    user_id: userId,
                    action: 'ADD_TO_READLIST',
                    description: `Added book to readlist: ${book?.title || 'Unknown'}`,
                    book_id: book_id as any,
                    timestamp: new Date()
                });
            } catch (logErr) {
                console.error('Failed to log new readlist entry:', logErr);
            }

            console.log(`[addToReadlist] Successfully added ${book_id}`);
            res.json({ message: 'Book added to readlist successfully' });
        }
    } catch (err) {
        console.error('addToReadlist error details:', err);
        res.status(500).json({ error: 'Server error adding to readlist' });
    }
};

export const getReadingProgress = async (req: AuthRequest, res: Response) => {
    try {
        const { bookId } = req.params;
        const userId = req.user!._id;

        const progress = await Readlist.findOne({ user_id: userId, book_id: bookId }).sort({ addedAt: -1 });
        if (!progress) {
            return res.status(404).json({ error: 'No reading progress found for this book' });
        }

        res.json({
            last_page: progress.last_page,
            bookmarks: progress.bookmarks,
            status: progress.status
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const updateReadingProgress = async (req: AuthRequest, res: Response) => {
    const { bookId } = req.params;
    const { last_page, bookmarks, status } = req.body;
    try {
        const userId = req.user!._id;

        const progress = await Readlist.findOne({ user_id: userId, book_id: bookId }).sort({ addedAt: -1 });
        if (!progress) {
            return res.status(404).json({ error: 'No reading progress found for this book' });
        }

        if (last_page !== undefined) progress.last_page = last_page;
        if (bookmarks !== undefined) progress.bookmarks = bookmarks;
        if (status !== undefined) progress.status = status;

        if (status === 'completed' && !progress.completedAt) {
            progress.completedAt = new Date();
        }

        await progress.save();
        res.json({ message: 'Reading progress updated', progress });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};


