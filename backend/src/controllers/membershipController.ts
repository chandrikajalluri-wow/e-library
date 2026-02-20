import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import * as membershipService from '../services/membershipService';

export const getAllMemberships = async (req: any, res: Response) => {
    try {
        const memberships = await membershipService.getAllMemberships();
        res.json(memberships);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getMyMembership = async (req: AuthRequest, res: Response) => {
    try {
        const membership = await membershipService.getMyMembership(req.user!._id);
        res.json(membership);
    } catch (err: any) {
        console.error(err);
        res.status(err.message === 'User not found' ? 404 : 500).json({ error: err.message });
    }
};

export const upgradeMyMembership = async (req: AuthRequest, res: Response) => {
    try {
        const { membershipId } = req.body;
        const updatedUser = await membershipService.upgradeMembership(req.user!._id, membershipId);
        res.json({
            message: `Successfully upgraded to ${(updatedUser?.membership_id as any).displayName} membership`,
            membership: updatedUser?.membership_id
        });
    } catch (err: any) {
        console.error(err);
        res.status(err.message.includes('not found') ? 404 : 500).json({ error: err.message });
    }
};

export const updateUserMembershipAdmin = async (req: AuthRequest, res: Response) => {
    try {
        const { userId } = req.params;
        const { membershipId } = req.body;
        const updatedUser = await membershipService.updateUserMembershipAdmin(userId, membershipId);
        res.json({
            message: `User membership updated to ${(updatedUser?.membership_id as any).displayName}`,
            user: updatedUser
        });
    } catch (err: any) {
        console.error(err);
        res.status(err.message.includes('not found') ? 404 : 500).json({ error: err.message });
    }
};

export const cancelMyMembership = async (req: AuthRequest, res: Response) => {
    try {
        const { reason } = req.body;
        const updatedUser = await membershipService.cancelMembership(req.user!._id, reason);
        res.json({
            message: `Membership cancelled. You have been switched to ${(updatedUser?.membership_id as any).displayName} plan.`,
            membership: updatedUser?.membership_id
        });
    } catch (err: any) {
        console.error(err);
        res.status(err.message === 'Cancellation reason is required' ? 400 : 500).json({ error: err.message });
    }
};

