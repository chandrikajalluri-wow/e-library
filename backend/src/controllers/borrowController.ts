/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import Borrow from '../models/Borrow';
import Book from '../models/Book';
import User from '../models/User';
import Membership from '../models/Membership';
import { AuthRequest } from '../middleware/authMiddleware';
import { sendNotification } from '../utils/notification';
import { MembershipName, BorrowStatus, BookStatus, NotificationType } from '../types/enums';

export const issueBook = async (req: AuthRequest, res: Response) => {
    const { book_id, days } = req.body;
    try {
        const book = await Book.findById(book_id);
        if (!book) return res.status(404).json({ error: 'Book not found' });
        if (book.noOfCopies <= 0)
            return res.status(400).json({ error: 'No copies available' });

        let user = await User.findById(req.user!._id).populate('membership_id');
        if (!user) return res.status(404).json({ error: 'User not found' });

        let membership = user.membership_id as any;

        if (!membership) {
            const basicMembership = await Membership.findOne({ name: MembershipName.BASIC });
            if (basicMembership) {
                user.membership_id = basicMembership._id;
                user.membershipStartDate = new Date();
                await user.save();
                user = await User.findById(req.user!._id).populate('membership_id');
                membership = user?.membership_id as any;
            }
        }

        if (!membership) {
            return res.status(400).json({
                error: 'Default membership plan (Basic) not found. Please contact admin to seed memberships.'
            });
        }

        if (book.isPremium && !membership.canAccessPremiumBooks) {
            return res.status(403).json({
                error: 'This is a premium book. Upgrade to Premium membership to access premium collection.'
            });
        }

        const activeBorrowsCount = await Borrow.countDocuments({
            user_id: req.user!._id,
            status: { $in: [BorrowStatus.BORROWED, BorrowStatus.OVERDUE, BorrowStatus.RETURN_REQUESTED] },
        });

        if (activeBorrowsCount >= membership.borrowLimit) {
            return res.status(400).json({
                error: `You have reached your membership limit of ${membership.borrowLimit} borrowed books. Please return a book before borrowing another.`,
            });
        }

        const activeBorrow = await Borrow.findOne({
            user_id: req.user!._id,
            book_id: book._id,
            status: { $in: [BorrowStatus.BORROWED, BorrowStatus.OVERDUE, BorrowStatus.RETURN_REQUESTED] },
        });

        if (activeBorrow) {
            return res.status(400).json({
                error: 'You already have an active borrow for this book. Please return it before borrowing again.',
            });
        }

        const borrowDays = days || membership.borrowDuration;
        const returnDate = new Date();
        returnDate.setDate(returnDate.getDate() + borrowDays);

        const borrow = new Borrow({
            user_id: req.user!._id,
            book_id: book._id,
            return_date: returnDate,
        });
        await borrow.save();

        try {
            book.noOfCopies -= 1;
            if (book.noOfCopies === 0) {
                book.status = BookStatus.ISSUED;
            }
            await book.save();
        } catch (updateError: any) {
            await Borrow.findByIdAndDelete(borrow._id);
            console.error('Book update failed, reverted borrow:', updateError);
            return res
                .status(500)
                .json({
                    error: 'Failed to update book inventory: ' + updateError.message,
                });
        }

        await sendNotification(
            NotificationType.BORROW,
            `${user?.name || 'A user'} borrowed "${book.title}"`,
            req.user!._id as any,
            book._id as any
        );

        res.status(201).json(borrow);
    } catch (err: any) {
        console.error('Borrow error:', err);
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
};

export const requestReturn = async (req: AuthRequest, res: Response) => {
    try {
        const borrow = await Borrow.findById(req.params.id);
        if (!borrow) return res.status(404).json({ error: 'Record not found' });
        if (borrow.status !== BorrowStatus.BORROWED && borrow.status !== BorrowStatus.OVERDUE) {
            return res
                .status(400)
                .json({
                    error: 'Cannot request return for this status: ' + borrow.status,
                });
        }

        let currentFine = borrow.fine_amount || 0;
        const now = new Date();
        if (now > borrow.return_date) {
            const diffTime = Math.abs(now.getTime() - borrow.return_date.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            currentFine += diffDays * 10;
        }

        if (currentFine > 0 && !borrow.isFinePaid) {
            return res.status(400).json({
                error: `Please pay the outstanding fine of ₹${currentFine.toFixed(2)} before requesting return.`
            });
        }

        borrow.status = BorrowStatus.RETURN_REQUESTED;
        await borrow.save();

        const user = await User.findById(req.user!._id);
        const book = await Book.findById(borrow.book_id);
        await sendNotification(
            NotificationType.RETURN,
            `${user?.name || 'A user'} requested to return "${book?.title}"`,
            req.user!._id as any,
            borrow.book_id as any
        );

        res.json(borrow);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const payFine = async (req: AuthRequest, res: Response) => {
    try {
        const borrow = await Borrow.findById(req.params.id);
        if (!borrow) return res.status(404).json({ error: 'Record not found' });

        let fine = borrow.fine_amount || 0;
        if (borrow.status !== BorrowStatus.RETURNED && borrow.status !== BorrowStatus.ARCHIVED) {
            const now = new Date();
            if (now > borrow.return_date) {
                const diffTime = Math.abs(now.getTime() - borrow.return_date.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                fine += diffDays * 10;
            }
        }

        if (fine <= 0) {
            return res.status(400).json({ error: 'No fine to pay' });
        }

        borrow.fine_amount = fine;
        borrow.isFinePaid = true;
        await borrow.save();

        await sendNotification(
            NotificationType.FINE,
            `Payment successful for fine on "${(await Book.findById(borrow.book_id))?.title}". Amount: ₹${fine}`,
            req.user!._id as any,
            borrow.book_id as any
        );

        res.json({ message: 'Fine paid successfully', borrow });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const acceptReturn = async (req: Request, res: Response) => {
    try {
        const borrow = await Borrow.findById(req.params.id);
        if (!borrow) return res.status(404).json({ error: 'Record not found' });
        if (borrow.status !== BorrowStatus.RETURN_REQUESTED) {
            return res
                .status(400)
                .json({ error: 'No return request found for this record' });
        }

        borrow.returned_at = new Date();
        borrow.status = BorrowStatus.RETURNED;

        const now = new Date();
        if (now > borrow.return_date) {
            const diffTime = Math.abs(now.getTime() - borrow.return_date.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            borrow.fine_amount = diffDays * 10;
        }

        await borrow.save();

        const book = await Book.findById(borrow.book_id);
        if (book) {
            book.noOfCopies += 1;
            book.status = BookStatus.AVAILABLE;
            await book.save();
        }

        res.json(borrow);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getMyBorrows = async (req: AuthRequest, res: Response) => {
    try {
        const borrows = await Borrow.find({ user_id: req.user!._id })
            .populate('book_id', 'title author cover_image_url')
            .sort({ issued_date: -1 });
        res.json(borrows);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getAllBorrows = async (req: Request, res: Response) => {
    try {
        const { status, membership, page = 1, limit = 10, addedBy } = req.query;
        const parsedPage = parseInt(page as string) || 1;
        const parsedLimit = parseInt(limit as string) || 10;
        const skip = (parsedPage - 1) * parsedLimit;

        const query: any = {};
        if (status && status !== 'all') query.status = status;

        if (addedBy) {
            const adminBooks = await Book.find({ addedBy }).select('_id');
            query.book_id = { $in: adminBooks.map((b: any) => b._id) };
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

        const borrows = await Borrow.find(query)
            .populate({
                path: 'user_id',
                select: 'name email membership_id',
                populate: {
                    path: 'membership_id',
                    select: 'name displayName'
                }
            })
            .populate('book_id', 'title')
            .sort({ issued_date: -1 })
            .skip(skip)
            .limit(parsedLimit);

        const total = await Borrow.countDocuments(query);

        res.json({
            borrows,
            total,
            page: parsedPage,
            pages: Math.ceil(total / parsedLimit),
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const updateReadingProgress = async (req: AuthRequest, res: Response) => {
    try {
        const { bookId } = req.params;
        const { last_page, bookmarks } = req.body;

        const borrow = await Borrow.findOne({
            user_id: req.user!._id,
            book_id: bookId,
            status: { $in: [BorrowStatus.BORROWED, BorrowStatus.OVERDUE, BorrowStatus.RETURN_REQUESTED] }
        });

        if (!borrow) {
            return res.status(404).json({ error: 'Active borrow record not found' });
        }

        if (last_page !== undefined) borrow.last_page = last_page;
        if (bookmarks !== undefined) borrow.bookmarks = bookmarks;

        console.log('Updated borrow.bookmarks to:', borrow.bookmarks);

        await borrow.save();
        console.log('Borrow record saved successfully');

        // Verify the save
        const verifyBorrow = await Borrow.findById(borrow._id);
        console.log('Verified bookmarks after save:', verifyBorrow?.bookmarks);

        res.json({ message: 'Progress updated', last_page: borrow.last_page, bookmarks: borrow.bookmarks });
    } catch (err) {
        console.error('Update progress error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getReadingProgress = async (req: AuthRequest, res: Response) => {
    try {
        const { bookId } = req.params;

        const borrow = await Borrow.findOne({
            user_id: req.user!._id,
            book_id: bookId,
            status: { $in: [BorrowStatus.BORROWED, BorrowStatus.OVERDUE, BorrowStatus.RETURN_REQUESTED] }
        });

        if (!borrow) {
            return res.status(404).json({ error: 'Active borrow record not found' });
        }

        res.json({
            last_page: borrow.last_page || 1,
            bookmarks: borrow.bookmarks || []
        });
    } catch (err) {
        console.error('Get progress error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};
