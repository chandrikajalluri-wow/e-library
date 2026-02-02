/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response } from 'express';
import Wishlist from '../models/Wishlist';
import Borrow from '../models/Borrow';
import User from '../models/User';
import Book from '../models/Book';
import { AuthRequest } from '../middleware/authMiddleware';
import { sendNotification, notifyAdmins } from '../utils/notification';
import { NotificationType } from '../types/enums';

export const getMyWishlist = async (req: AuthRequest, res: Response) => {
    try {
        const items = await Wishlist.find({ user_id: req.user!._id }).populate('book_id');

        const itemsWithReturnDate = await Promise.all(
            items.map(async (item: any) => {
                const book = item.book_id;
                if (book && book.noOfCopies === 0) {
                    const nearestBorrow = await Borrow.findOne({
                        book_id: book._id,
                        status: { $ne: 'returned' },
                    }).sort({ return_date: 1 });

                    if (nearestBorrow) {
                        const itemObj = item.toObject();
                        itemObj.expectedReturnDate = nearestBorrow.return_date;
                        return itemObj;
                    }
                }
                return item.toObject();
            })
        );

        res.json(itemsWithReturnDate);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getAllWishlists = async (req: AuthRequest, res: Response) => {
    try {
        const items = await Wishlist.find().populate('book_id', 'title author');
        res.json(items);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const addToWishlist = async (req: AuthRequest, res: Response) => {
    const { book_id } = req.body;
    try {
        const existing = await Wishlist.findOne({
            user_id: req.user!._id,
            book_id,
        });
        if (existing) return res.status(400).json({ error: 'Already in wishlist' });

        const item = new Wishlist({ user_id: req.user!._id, book_id });
        await item.save();

        const user = await User.findById(req.user!._id);
        const book = await Book.findById(book_id);
        await sendNotification(
            NotificationType.WISHLIST,
            `You wishlisted "${book?.title}"`,
            req.user!._id as any,
            book_id as any
        );

        await notifyAdmins(
            `${user?.name || 'A user'} wishlisted "${book?.title}"`,
            NotificationType.WISHLIST
        );

        res.status(201).json(item);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const removeFromWishlist = async (req: AuthRequest, res: Response) => {
    try {
        await Wishlist.findByIdAndDelete(req.params.id);
        res.json({ message: 'Removed from wishlist' });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Server error' });
    }
};
