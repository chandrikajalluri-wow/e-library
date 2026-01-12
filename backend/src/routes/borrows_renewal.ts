import express, { Response } from 'express';
import { auth, AuthRequest } from '../middleware/authMiddleware';
import Borrow from '../models/Borrow';
import User from '../models/User';

const router = express.Router();

// Renew borrowed book (Premium members only)
router.post('/renew/:id', auth, async (req: AuthRequest, res: Response) => {
    try {
        const borrow = await Borrow.findById(req.params.id);
        if (!borrow) return res.status(404).json({ error: 'Borrow record not found' });

        // Check if this borrow belongs to the user
        if (borrow.user_id.toString() !== req.user!._id.toString()) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Check if book is currently borrowed
        if (borrow.status !== 'borrowed' && borrow.status !== 'overdue') {
            return res.status(400).json({
                error: 'Can only renew books that are currently borrowed'
            });
        }

        // Get user with membership
        const user = await User.findById(req.user!._id).populate('membership_id');
        if (!user) return res.status(404).json({ error: 'User not found' });

        const membership = user.membership_id as any;
        if (!membership) {
            return res.status(400).json({
                error: 'No membership plan assigned'
            });
        }

        // Check if user can renew books (Premium feature)
        if (!membership.canRenewBooks) {
            return res.status(403).json({
                error: 'Book renewal is a Premium membership feature. Upgrade to Premium to renew books.'
            });
        }

        // Check if already renewed
        if (borrow.renewed_count >= 1) {
            return res.status(400).json({
                error: 'This book has already been renewed once. Maximum renewal limit reached.'
            });
        }

        // Extend return date by membership duration
        const newReturnDate = new Date(borrow.return_date);
        newReturnDate.setDate(newReturnDate.getDate() + membership.borrowDuration);

        borrow.return_date = newReturnDate;
        borrow.renewed_count += 1;
        await borrow.save();

        res.json({
            message: 'Book renewed successfully',
            newReturnDate: newReturnDate,
            borrow
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
