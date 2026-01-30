import { Response } from 'express';
import Membership from '../models/Membership';
import User from '../models/User';
import { AuthRequest } from '../middleware/authMiddleware';
import { MembershipName, ActivityAction } from '../types/enums';
import ActivityLog from '../models/ActivityLog';

export const getAllMemberships = async (req: any, res: Response) => {
    try {
        const memberships = await Membership.find().sort({ price: 1 });
        res.json(memberships);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getMyMembership = async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.user!._id).populate('membership_id');
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json(user.membership_id || null);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const upgradeMyMembership = async (req: AuthRequest, res: Response) => {
    const { membershipId } = req.body;

    try {
        const membership = await Membership.findById(membershipId);
        if (!membership) {
            return res.status(404).json({ error: 'Membership plan not found' });
        }

        const user = await User.findById(req.user!._id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.membership_id = membership._id;

        const now = new Date();
        const expiry = new Date(now);
        expiry.setDate(expiry.getDate() + 30);

        user.membershipStartDate = now;
        user.membershipExpiryDate = expiry;

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
};

export const updateUserMembershipAdmin = async (req: AuthRequest, res: Response) => {
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
};

export const cancelMyMembership = async (req: AuthRequest, res: Response) => {
    const { reason } = req.body;

    if (!reason) {
        return res.status(400).json({ error: 'Cancellation reason is required' });
    }

    try {
        const basicPlan = await Membership.findOne({ name: MembershipName.BASIC });
        if (!basicPlan) {
            return res.status(500).json({ error: 'Basic membership plan not found' });
        }

        const user = await User.findById(req.user!._id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.membership_id = (basicPlan._id as any);
        user.membershipCancellationReason = reason;
        user.membershipCancellationDate = new Date();
        user.membershipStartDate = undefined;
        user.membershipExpiryDate = undefined;

        await user.save();

        // Log the activity
        await ActivityLog.create({
            user_id: user._id,
            action: ActivityAction.MEMBERSHIP_CANCELLED,
            timestamp: new Date()
        });

        const updatedUser = await User.findById(req.user!._id).populate('membership_id');

        res.json({
            message: `Membership cancelled. You have been switched to ${basicPlan.displayName} plan.`,
            membership: updatedUser?.membership_id
        });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};
