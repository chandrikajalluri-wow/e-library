import { Response } from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User';
import Borrow from '../models/Borrow';
import Wishlist from '../models/Wishlist';
import BookRequest from '../models/BookRequest';
import AuthToken from '../models/AuthToken';
import Membership from '../models/Membership';
import { AuthRequest } from '../middleware/authMiddleware';
import Book from '../models/Book';
import Order from '../models/Order';
import Readlist from '../models/Readlist';
import { sendEmail } from '../utils/mailer';
import { sendNotification, notifyAdmins } from '../utils/notification';
import { NotificationType, BorrowStatus, MembershipName, UserTheme, RequestStatus, RoleName, OrderStatus } from '../types/enums';

export const getMe = async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.user!._id)
            .select('-password')
            .populate('membership_id')
            .populate('role_id');

        if (!user) return res.status(404).json({ error: 'User not found' });

        const userObj: any = user.toObject();
        userObj.role = (user.role_id as any)?.name;

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

        res.json({
            borrowedCount: readlistCount,
            wishlistCount,
            streakCount: (req.user as any).streakCount || 0
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
        if (booksRead !== undefined) user.booksRead = Number(booksRead);
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
                booksRead: user.booksRead,
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
            req.user!._id as any
        );

        // Notify Admins
        await notifyAdmins(
            `New Book Request: ${user.name} suggested "${title}" by ${author}`,
            NotificationType.BOOK_REQUEST
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
        const requests = await BookRequest.find()
            .populate({
                path: 'user_id',
                select: 'name email membership_id',
                populate: {
                    path: 'membership_id',
                    select: 'name displayName'
                }
            })
            .sort({ createdAt: -1 });
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

        const activeBorrows = await mongoose.model('Borrow').findOne({
            user_id: user._id,
            status: { $in: [BorrowStatus.BORROWED, BorrowStatus.OVERDUE] }
        });

        if (activeBorrows) {
            return res.status(400).json({
                error: 'You cannot delete your account while you have borrowed books. Please return all books first.'
            });
        }



        await mongoose.model('Wishlist').deleteMany({ user_id: user._id });
        await mongoose.model('Borrow').deleteMany({ user_id: user._id });
        await mongoose.model('Review').deleteMany({ user_id: user._id });
        await mongoose.model('Notification').deleteMany({ user_id: user._id });
        await mongoose.model('ActivityLog').deleteMany({ user_id: user._id });
        await mongoose.model('BookRequest').deleteMany({ user_id: user._id });
        await AuthToken.deleteMany({ user_id: user._id });

        // Perform Anonymized Soft Delete
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

        // 3. Keep all items, even expired ones (no auto-cleanup)
        const validReadlistItems = readlistItems;

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

        const borrowRecord = await Borrow.findOne({
            user_id: userId,
            book_id: bookId,
            status: { $in: [BorrowStatus.BORROWED, BorrowStatus.OVERDUE, BorrowStatus.RETURN_REQUESTED] }
        }).sort({ issued_date: -1 });

        // 2. Validate Access (Strictly Borrow/Readlist based)
        const hasValidBorrow = borrowRecord && borrowRecord.return_date && new Date(borrowRecord.return_date).getTime() > nowTime;
        const hasValidReadlist = readlistItem && readlistItem.dueDate && new Date(readlistItem.dueDate).getTime() > nowTime;

        // Access is granted ONLY if an active record is NOT expired
        const hasAccess = !!hasValidBorrow || !!hasValidReadlist;

        // Determination for UI feedback: show "Expired" if they HAVE a record but none are currently valid
        const isExpired = (!!borrowRecord || !!readlistItem) && !hasValidBorrow && !hasValidReadlist;

        const effectiveDueDate = (readlistItem?.dueDate || borrowRecord?.return_date) || null;

        res.json({
            hasAccess,
            inReadlist: !!readlistItem,
            hasBorrow: !!borrowRecord,
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

        // 1. Total Books 
        const bookQuery: any = {};
        if (addedBy) bookQuery.addedBy = addedBy;
        const totalBooks = await Book.countDocuments(bookQuery);

        // 2. Total Users (Count all non-deleted registered users)
        const totalUsers = await User.countDocuments({ isDeleted: false });

        // 3. Reads Stats
        let readlistQuery: any = {};
        if (addedBy) {
            const adminBooks = await Book.find({ addedBy }).select('_id');
            const bookIds = adminBooks.map(b => b._id);
            readlistQuery.book_id = { $in: bookIds };
        }

        const totalReads = await Readlist.countDocuments(readlistQuery);
        const activeReads = await Readlist.countDocuments({ ...readlistQuery, status: 'active' });

        // 4. Order Stats
        // Revenue should sum totalAmount from ALL orders as per user request
        const orders = await Order.find({});
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

        const completedStatuses = ['delivered', 'completed'];
        const pendingStatuses = ['pending', 'processing', 'shipped'];

        const completedOrders = orders.filter(o => completedStatuses.includes(o.status)).length;
        const pendingOrders = orders.filter(o => pendingStatuses.includes(o.status)).length;

        // 5. Suggestions (Total pending book requests)
        const pendingSuggestions = await BookRequest.countDocuments({ status: RequestStatus.PENDING });

        // 6. Insights via Aggregation
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
        const mostWishlistedMatch = await getMostFrequent(Wishlist, 'book_id');
        const mostActiveMatch = await getMostFrequent(Readlist, 'user_id', readlistQuery);
        const topBuyerMatch = await getMostFrequent(Order, 'user_id');

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
            totalUsers,
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
        const { membership, page = 1, limit = 10, addedBy } = req.query;
        const parsedPage = parseInt(page as string) || 1;
        const parsedLimit = parseInt(limit as string) || 10;
        const skip = (parsedPage - 1) * parsedLimit;

        const query: any = {};

        // Filter by admin's books if addedBy is specified
        if (addedBy) {
            const adminBooks = await Book.find({ addedBy }).select('_id');
            query.book_id = { $in: adminBooks.map((b: any) => b._id) };
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
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const monthlyCount = await Readlist.countDocuments({
            user_id: userId,
            addedAt: { $gte: monthStart }
        });

        const limit = membership.borrowLimit || 0;
        console.log(`[addToReadlist] Monthly count: ${monthlyCount}, Limit: ${limit}`);
        if (monthlyCount >= limit) {
            return res.status(400).json({
                error: `You have reached your monthly limit of ${limit} books. Wait until next month or upgrade your plan.`,
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
            const borrowDuration = membership.borrowDuration || 14;
            const newDueDate = new Date();
            newDueDate.setDate(newDueDate.getDate() + borrowDuration);

            existingEntry.status = 'active';
            existingEntry.addedAt = new Date();
            existingEntry.dueDate = newDueDate;
            await existingEntry.save();

            console.log(`[addToReadlist] Renewed expired entry for ${book_id}`);
            res.json({ message: 'Book added to readlist successfully' });
        } else {
            // 6. Create new entry if none exists
            const borrowDuration = membership.borrowDuration || 14;
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + borrowDuration);

            console.log(`[addToReadlist] Creating new entry with dueDate: ${dueDate}`);
            const newEntry = new Readlist({
                user_id: userId,
                book_id: book_id,
                status: 'active',
                addedAt: new Date(),
                dueDate: dueDate
            });

            await newEntry.save();
            console.log(`[addToReadlist] Successfully added ${book_id}`);
            res.json({ message: 'Book added to readlist successfully' });
        }
    } catch (err) {
        console.error('addToReadlist error details:', err);
        res.status(500).json({ error: 'Server error adding to readlist' });
    }
};


