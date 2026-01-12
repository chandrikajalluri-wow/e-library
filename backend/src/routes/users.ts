import express, { Response } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import Borrow from '../models/Borrow';
import Wishlist from '../models/Wishlist';
import BookRequest from '../models/BookRequest';
import { auth, checkRole, AuthRequest } from '../middleware/authMiddleware';
import { sendEmail } from '../utils/mailer';
import { upload } from '../middleware/uploadMiddleware';

const router = express.Router();

// Get Current User Profile
router.get('/me', auth, async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.user!._id).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get Dashboard Stats
router.get('/dashboard-stats', auth, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!._id;

        const borrows = await Borrow.find({ user_id: userId });
        const wishlistCount = await Wishlist.countDocuments({ user_id: userId });

        const totalFine = borrows.reduce((sum, b) => {
            if (b.isFinePaid) return sum;

            let fine = b.fine_amount || 0;
            // If book is not returned yet and is overdue, calculate current accrued fine
            if (b.status !== 'returned' && b.status !== 'archived') {
                const now = new Date();
                if (now > b.return_date) {
                    const diffTime = Math.abs(now.getTime() - b.return_date.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    fine += diffDays * 10; // ₹10 per day
                }
            }
            return sum + fine;
        }, 0);

        const borrowedCount = borrows.filter(b => b.status === 'borrowed' || b.status === 'overdue' || b.status === 'return_requested').length;

        res.json({
            totalFine,
            borrowedCount,
            wishlistCount,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update Profile
router.put('/profile', auth, upload.single('profileImage'), async (req: AuthRequest, res: Response) => {
    const { name, favoriteBook, favoriteAuthor, booksRead, readingTarget } = req.body;
    try {
        const user = await User.findById(req.user!._id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (name) user.name = name;
        if (favoriteBook !== undefined) user.favoriteBook = favoriteBook;
        if (favoriteAuthor !== undefined) user.favoriteAuthor = favoriteAuthor;
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
                profileImage: user.profileImage,
                favoriteBook: user.favoriteBook,
                favoriteAuthor: user.favoriteAuthor,
                booksRead: user.booksRead,
                readingTarget: user.readingTarget
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Change Password
router.put('/change-password', auth, async (req: AuthRequest, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    try {
        const user = await User.findById(req.user!._id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Incorrect current password' });

        // Password complexity check
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                error: 'Password must be at least 8 characters long and include an uppercase letter, a number, and a special character.'
            });
        }

        // Hashing new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ message: 'Password changed successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Request New Book
router.post('/book-requests', auth, async (req: AuthRequest, res: Response) => {
    const { title, author, reason } = req.body;
    try {
        if (!title || !author)
            return res.status(400).json({ error: 'Title and author are required' });

        const newRequest = new BookRequest({
            user_id: req.user!._id,
            title,
            author,
            reason,
        });

        await newRequest.save();
        res.status(201).json({
            message: 'Book request submitted successfully',
            request: newRequest,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ADMIN: Get All Book Requests
router.get(
    '/admin/book-requests',
    auth,
    checkRole(['admin']),
    async (req: AuthRequest, res: Response) => {
        try {
            const requests = await BookRequest.find()
                .populate('user_id', 'name email')
                .sort({ createdAt: -1 });
            res.json(requests);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Server error' });
        }
    }
);

// ADMIN: Update Book Request Status
router.put(
    '/admin/book-requests/:id',
    auth,
    checkRole(['admin']),
    async (req: AuthRequest, res: Response) => {
        const { status } = req.body;
        try {
            if (!['pending', 'approved', 'rejected'].includes(status)) {
                return res.status(400).json({ error: 'Invalid status' });
            }

            const request = await BookRequest.findById(req.params.id).populate('user_id', 'name email');
            if (!request) return res.status(404).json({ error: 'Request not found' });

            const oldStatus = request.status;
            request.status = status;
            await request.save();

            // Send email if approved
            if (status === 'approved' && oldStatus !== 'approved') {
                const user = request.user_id as any;
                if (user && user.email) {
                    const subject = 'Book Request Approved';
                    const text = `Hi ${user.name},\n\nYour request for the book "${request.title}" by ${request.author} has been approved.\n\nRegards,\nLibrary Administration`;
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
    }
);

// ADMIN: Send Fine Reminder
router.post(
    '/admin/send-fine-reminder/:id',
    auth,
    checkRole(['admin']),
    async (req: AuthRequest, res: Response) => {
        try {
            const borrow = await Borrow.findById(req.params.id)
                .populate('user_id', 'name email')
                .populate('book_id', 'title');

            if (!borrow) return res.status(404).json({ error: 'Borrow record not found' });

            const user: any = borrow.user_id;
            const book: any = borrow.book_id;

            // Calculate current fine
            let fine = borrow.fine_amount || 0;
            if (borrow.status !== 'returned' && borrow.status !== 'archived') {
                const now = new Date();
                if (now > borrow.return_date) {
                    const diffTime = Math.abs(now.getTime() - borrow.return_date.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    fine += diffDays * 10;
                }
            }

            if (fine <= 50) {
                return res.status(400).json({ error: 'Fine must exceed ₹50 to send a reminder' });
            }

            if (user && user.email) {
                const subject = 'Important: Outstanding Library Fine Reminder';
                const text = `Hi ${user.name},\n\n This is a reminder regarding your borrowed book "${book.title}", which was due on ${new Date(borrow.return_date).toLocaleDateString()}.\n\nYour current accrued fine is ₹${fine}. Please return the book and settle the fine as soon as possible to avoid further charges.\n\nRegards,\nLibrary Administration`;

                await sendEmail(user.email, subject, text);
                return res.json({ message: 'Reminder email sent successfully' });
            }

            res.status(400).json({ error: 'User email not found' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Server error' });
        }
    }
);

export default router;
