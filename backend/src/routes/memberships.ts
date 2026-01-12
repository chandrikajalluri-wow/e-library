import express, { Response } from 'express';
import Membership from '../models/Membership';
import User from '../models/User';
import { auth, checkRole, AuthRequest } from '../middleware/authMiddleware';

const router = express.Router();

// Get all membership plans
router.get('/', async (req, res: Response) => {
    try {
        const memberships = await Membership.find().sort({ price: 1 });
        res.json(memberships);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get current user's membership
router.get('/my', auth, async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.user!._id).populate('membership_id');
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json(user.membership_id || null);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// User: Upgrade own membership
router.put('/upgrade', auth, async (req: AuthRequest, res: Response) => {
    const { membershipId } = req.body;

    try {
        // Verify membership exists
        const membership = await Membership.findById(membershipId);
        if (!membership) {
            return res.status(404).json({ error: 'Membership plan not found' });
        }

        // Update user's membership
        const user = await User.findById(req.user!._id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.membership_id = membership._id;
        await user.save();

        const updatedUser = await User.findById(req.user!._id).populate('membership_id');

        res.json({
            message: `Successfully upgraded to ${membership.displayName} membership`,
            membership: updatedUser?.membership_id
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin: Update user's membership
router.put(
    '/admin/users/:userId/membership',
    auth,
    checkRole(['admin']),
    async (req: AuthRequest, res: Response) => {
        const { userId } = req.params;
        const { membershipId } = req.body;

        try {
            const membership = await Membership.findById(membershipId);
            if (!membership) {
                return res.status(404).json({ error: 'Membership plan not found' });
            }

            const user = await User.findById(userId);
            if (!user) return res.status(404).json({ error: 'User not found' });

            user.membership_id = membership._id;
            await user.save();

            const updatedUser = await User.findById(userId).populate('membership_id');

            res.json({
                message: `User membership updated to ${membership.displayName}`,
                user: updatedUser
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Server error' });
        }
    }
);

export default router;
