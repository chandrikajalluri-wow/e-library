/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import Borrow from '../models/Borrow';
import Book from '../models/Book';
import User from '../models/User';
import Readlist from '../models/Readlist';
import Order from '../models/Order';
import Membership from '../models/Membership';
import { AuthRequest } from '../middleware/authMiddleware';
import { sendNotification, notifyAdmins } from '../utils/notification';
import { MembershipName, BorrowStatus, BookStatus, NotificationType } from '../types/enums';
import ActivityLog from '../models/ActivityLog';

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



        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const monthlyBorrowsCount = await Borrow.countDocuments({
            user_id: req.user!._id,
            issued_date: { $gte: monthStart },
            order_id: { $exists: false }
        });

        if (monthlyBorrowsCount >= membership.borrowLimit) {
            return res.status(400).json({
                error: `You have reached your monthly membership limit of ${membership.borrowLimit} books. Wait until next month to borrow more.`,
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
                book.status = BookStatus.OUT_OF_STOCK;
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
            `You borrowed "${book.title}"`,
            req.user!._id as any,
            book._id as any
        );

        await sendNotification(
            NotificationType.BORROW,
            `You borrowed "${book.title}"`,
            req.user!._id as any,
            book._id as any
        );

        await User.findByIdAndUpdate(req.user!._id, {
            $addToSet: { readlist: book._id }
        });

        await ActivityLog.create({
            user_id: req.user!._id,
            action: 'BORROW_BOOK',
            description: `Borrowed book: ${book.title}`,
            book_id: book._id,
            timestamp: new Date()
        });

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




        borrow.status = BorrowStatus.RETURN_REQUESTED;
        borrow.return_requested_at = new Date(); // Lock the return time
        await borrow.save();

        const user = await User.findById(req.user!._id);
        const book = await Book.findById(borrow.book_id);
        await sendNotification(
            NotificationType.RETURN,
            `Return request submitted for "${book?.title}"`,
            req.user!._id as any,
            borrow.book_id as any,
            borrow._id.toString()
        );

        await notifyAdmins(
            `${user?.name || 'A user'} requested to return "${book?.title}"`,
            NotificationType.RETURN,
            borrow.book_id as any,
            borrow._id.toString()
        );

        await ActivityLog.create({
            user_id: req.user!._id,
            action: 'RETURN_REQUEST',
            description: `Requested to return book: ${book?.title || 'Unknown Book'}`,
            book_id: borrow.book_id,
            timestamp: new Date()
        });

        res.json(borrow);
    } catch (err) {
        console.log(err);
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

        const userId = req.user!._id;

        const borrow = await Borrow.findOne({
            user_id: userId,
            book_id: bookId,
            status: { $in: [BorrowStatus.BORROWED, BorrowStatus.OVERDUE, BorrowStatus.RETURN_REQUESTED, BorrowStatus.RETURNED] }
        }).sort({ issued_date: -1 });

        const readlistItem = await Readlist.findOne({
            user_id: userId,
            book_id: bookId,
            status: { $in: ['active', 'completed'] }
        }).sort({ addedAt: -1 });

        if (!borrow && !readlistItem) {
            return res.status(404).json({ error: 'Active access record not found' });
        }

        const record = borrow || readlistItem;

        if (last_page !== undefined) record!.last_page = last_page;
        if (bookmarks !== undefined) record!.bookmarks = bookmarks;

        // Handle marking as completed
        if (req.body.status === 'completed') {
            record!.status = 'completed' as any;
            if (borrow) {
                // If it's a Borrow record, setting it to completed is handled by return logic,
                // but we allow manual completion for the reading history tracking.
                (record as any).returned_at = new Date();
                record!.status = BorrowStatus.RETURNED;
            } else {
                (record as any).completedAt = new Date();
            }
        }

        await record!.save();

        res.json({ message: 'Progress updated', last_page: record!.last_page, bookmarks: record!.bookmarks });
    } catch (err) {
        console.error('Update progress error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getReadingProgress = async (req: AuthRequest, res: Response) => {
    try {
        const { bookId } = req.params;

        const userId = req.user!._id;

        const borrow = await Borrow.findOne({
            user_id: userId,
            book_id: bookId,
            status: { $in: [BorrowStatus.BORROWED, BorrowStatus.OVERDUE, BorrowStatus.RETURN_REQUESTED, BorrowStatus.RETURNED] }
        }).sort({ issued_date: -1 });

        const readlistItem = await Readlist.findOne({
            user_id: userId,
            book_id: bookId,
            status: { $in: ['active', 'completed'] }
        }).sort({ addedAt: -1 });

        if (!borrow && !readlistItem) {
            return res.status(404).json({ error: 'Active record not found' });
        }

        const record = borrow || readlistItem;

        res.json({
            last_page: record?.last_page || 1,
            bookmarks: record?.bookmarks || [],
            status: record?.status
        });
    } catch (err) {
        console.error('Get progress error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const checkoutCart = async (req: AuthRequest, res: Response) => {
    const { items } = req.body; // items: [{ book_id, quantity }]

    try {
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
        }

        // Get user with membership
        let user = await User.findById(req.user!._id).populate('membership_id');
        if (!user) return res.status(404).json({ error: 'User not found' });

        let membership = user.membership_id as any;

        // Assign basic membership if none exists
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
                error: 'Default membership plan (Basic) not found. Please contact admin.'
            });
        }

        // Calculate total items to borrow
        const totalItemsToBorrow = items.reduce((sum: number, item: any) => sum + item.quantity, 0);

        // Check current monthly borrows (excluding purchases)
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const monthlyBorrowsCount = await Borrow.countDocuments({
            user_id: req.user!._id,
            issued_date: { $gte: monthStart },
            order_id: { $exists: false }
        });

        // Check if user will exceed monthly borrow limit
        if (monthlyBorrowsCount + totalItemsToBorrow > membership.borrowLimit) {
            return res.status(400).json({
                error: `Cannot checkout. You would exceed your monthly membership limit of ${membership.borrowLimit} books. You have already borrowed ${monthlyBorrowsCount} books this month.`,
            });
        }

        // Validate all books and check stock
        const bookIds = items.map((item: any) => item.book_id);
        const books = await Book.find({ _id: { $in: bookIds } });

        if (books.length !== items.length) {
            return res.status(404).json({ error: 'One or more books not found' });
        }

        // Create a map for easy lookup
        const bookMap = new Map(books.map(book => [book._id.toString(), book]));

        // Validate stock and premium access for each item
        for (const item of items) {
            const book = bookMap.get(item.book_id);
            if (!book) {
                return res.status(404).json({ error: `Book not found: ${item.book_id}` });
            }

            // Check stock
            if (book.noOfCopies < item.quantity) {
                return res.status(400).json({
                    error: `Insufficient stock for "${book.title}". Available: ${book.noOfCopies}, Requested: ${item.quantity}`
                });
            }

            // Check premium access


            // Check if user already has active borrow for this book
            const existingBorrow = await Borrow.findOne({
                user_id: req.user!._id,
                book_id: book._id,
                status: { $in: [BorrowStatus.BORROWED, BorrowStatus.OVERDUE, BorrowStatus.RETURN_REQUESTED] },
            });

            if (existingBorrow) {
                return res.status(400).json({
                    error: `You already have an active borrow for "${book.title}". Please return it before borrowing again.`
                });
            }
        }

        // All validations passed, create borrow records and update stock
        const createdBorrows = [];
        const borrowDays = membership.borrowDuration;

        for (const item of items) {
            const book = bookMap.get(item.book_id);
            if (!book) continue;

            // Create borrow records for each quantity
            for (let i = 0; i < item.quantity; i++) {
                const returnDate = new Date();
                returnDate.setDate(returnDate.getDate() + borrowDays);

                const borrow = new Borrow({
                    user_id: req.user!._id,
                    book_id: book._id,
                    return_date: returnDate,
                });
                await borrow.save();
                createdBorrows.push(borrow);
            }

            // Update book stock
            book.noOfCopies -= item.quantity;
            if (book.noOfCopies === 0) {
                book.status = BookStatus.OUT_OF_STOCK;
            }
            await book.save();
        }

        // Clear backend cart after successful checkout
        user!.cart = [];
        await user!.save();

        // Send notification
        await sendNotification(
            NotificationType.BORROW,
            `You checked out ${totalItemsToBorrow} book(s) from cart`,
            req.user!._id as any,
            null as any
        );

        await notifyAdmins(
            `${user?.name || 'A user'} started reading ${totalItemsToBorrow} book(s) from cart`,
            NotificationType.BORROW,
            bookIds
        );

        // Create detailed description for Activity Log
        const bookTitles = items.map((item: any) => {
            const book = bookMap.get(item.book_id);
            return book ? book.title : 'Unknown';
        }).join(', '); // Simple join, can truncated if too long

        await ActivityLog.create({
            user_id: req.user!._id,
            action: 'CART_CHECKOUT',
            description: `Checked out ${totalItemsToBorrow} books: ${bookTitles.substring(0, 200)}${bookTitles.length > 200 ? '...' : ''}`,
            timestamp: new Date()
        });

        res.status(201).json({
            message: `Successfully checked out ${totalItemsToBorrow} book(s)`,
            borrows: createdBorrows,
            totalBooks: totalItemsToBorrow
        });
    } catch (err: any) {
        console.error('Checkout error:', err);
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
};
