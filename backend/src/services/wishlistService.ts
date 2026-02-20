import Wishlist from '../models/Wishlist';
import User from '../models/User';
import Book from '../models/Book';
import ActivityLog from '../models/ActivityLog';
import { NotificationType } from '../types/enums';
import { sendNotification, notifyAdmins } from '../utils/notification';

export const getMyWishlist = async (userId: string) => {
    return await Wishlist.find({ user_id: userId }).populate('book_id');
};

export const getAllWishlistsAdmin = async () => {
    return await Wishlist.find().populate('book_id', 'title author');
};

export const addToWishlist = async (userId: string, bookId: string) => {
    const existing = await Wishlist.findOne({ user_id: userId, book_id: bookId });
    if (existing) throw new Error('Already in wishlist');

    const item = new Wishlist({ user_id: userId, book_id: bookId });
    await item.save();

    const user = await User.findById(userId);
    const book = await Book.findById(bookId);

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
    return await Wishlist.findByIdAndDelete(wishlistId);
};
