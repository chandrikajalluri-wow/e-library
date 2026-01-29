/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import Borrow from '../models/Borrow';
import Book from '../models/Book';
import User from '../models/User';
import Membership from '../models/Membership';
import { AuthRequest } from '../middleware/authMiddleware';
import { sendNotification } from '../utils/notification';
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

        // Calculate fine
        let currentFine = 0;
        const now = new Date();
        const returnDate = new Date(borrow.return_date);

        // Determine start date for fine calculation (Due date or Last Paid Date)
        let fineStartDate = returnDate;
        if (borrow.last_fine_paid_date && new Date(borrow.last_fine_paid_date) > returnDate) {
            fineStartDate = new Date(borrow.last_fine_paid_date);
        }

        if (now > fineStartDate) {
            const diffTime = Math.abs(now.getTime() - fineStartDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            currentFine = diffDays * 10;
        }

        // Add any previously unpaid fine amount if stored (though we plan to clear it on pay)
        // For now, assume calculated dynamic fine is the main source of truth for "new" fine

        if (currentFine > 0) {
            return res.status(400).json({
                error: `Please pay the outstanding fine of ₹${currentFine.toFixed(2)} before requesting return.`
            });
        }

        borrow.status = BorrowStatus.RETURN_REQUESTED;
        borrow.return_requested_at = new Date(); // Lock the return time
        await borrow.save();

        const user = await User.findById(req.user!._id);
        const book = await Book.findById(borrow.book_id);
        await sendNotification(
            NotificationType.RETURN,
            `${user?.name || 'A user'} requested to return "${book?.title}"`,
            req.user!._id as any,
            borrow.book_id as any
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

export const payFine = async (req: AuthRequest, res: Response) => {
    try {
        const borrow = await Borrow.findById(req.params.id);
        if (!borrow) return res.status(404).json({ error: 'Record not found' });

        let fine = 0;
        // Fine logic: Stop at return_requested_at if set, else now
        const now = new Date();
        const endDate = (borrow.status === BorrowStatus.RETURN_REQUESTED && borrow.return_requested_at)
            ? new Date(borrow.return_requested_at)
            : now;

        const returnDate = new Date(borrow.return_date);

        let fineStartDate = returnDate;
        if (borrow.last_fine_paid_date && new Date(borrow.last_fine_paid_date) > returnDate) {
            fineStartDate = new Date(borrow.last_fine_paid_date);
        }

        if (endDate > fineStartDate) {
            const diffTime = Math.abs(endDate.getTime() - fineStartDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            fine = diffDays * 10;
        }

        if (fine <= 0) {
            return res.status(400).json({ error: 'No fine to pay' });
        }

        // On payment:
        borrow.fine_amount = 0; // Clear outstanding
        borrow.isFinePaid = true; // Mark as paid for 'now'
        borrow.last_fine_paid_date = new Date(); // Advance the paid cursor

        await borrow.save();

        await sendNotification(
            NotificationType.FINE,
            `Payment successful for fine on "${(await Book.findById(borrow.book_id))?.title}". Amount: ₹${fine}`,
            req.user!._id as any,
            borrow.book_id as any
        );

        await ActivityLog.create({
            user_id: req.user!._id,
            action: 'FINE_PAID',
            description: `Paid fine of ₹${fine} for book: ${(await Book.findById(borrow.book_id))?.title}`,
            book_id: borrow.book_id,
            timestamp: new Date()
        });

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

        const endDate = borrow.return_requested_at || borrow.returned_at || new Date();
        const returnDate = new Date(borrow.return_date);

        let fineStartDate = returnDate;
        if (borrow.last_fine_paid_date && new Date(borrow.last_fine_paid_date) > returnDate) {
            fineStartDate = new Date(borrow.last_fine_paid_date);
        }

        if (endDate > fineStartDate) {
            const diffTime = Math.abs(endDate.getTime() - fineStartDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            borrow.fine_amount = diffDays * 10;
        } else {
            borrow.fine_amount = 0;
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

        // Check current active borrows
        const activeBorrowsCount = await Borrow.countDocuments({
            user_id: req.user!._id,
            status: { $in: [BorrowStatus.BORROWED, BorrowStatus.OVERDUE, BorrowStatus.RETURN_REQUESTED] },
        });

        // Check if user will exceed borrow limit
        if (activeBorrowsCount + totalItemsToBorrow > membership.borrowLimit) {
            return res.status(400).json({
                error: `Cannot checkout. You would exceed your membership limit of ${membership.borrowLimit} books. You currently have ${activeBorrowsCount} active borrows.`,
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
            if (book.isPremium && !membership.canAccessPremiumBooks) {
                return res.status(403).json({
                    error: `"${book.title}" is a premium book. Upgrade to Premium membership to access.`
                });
            }

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
                book.status = BookStatus.ISSUED;
            }
            await book.save();
        }

        // Send notification
        await sendNotification(
            NotificationType.BORROW,
            `${user?.name || 'A user'} checked out ${totalItemsToBorrow} book(s) from cart`,
            req.user!._id as any,
            null as any
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
