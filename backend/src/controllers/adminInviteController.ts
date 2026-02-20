import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import * as adminInviteService from '../services/adminInviteService';

/**
 * Verify an invite token
 * GET /api/admin-invite/verify-invite/:token
 */
export const verifyInviteToken = async (req: AuthRequest, res: Response) => {
    try {
        const { token } = req.params;

        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        const inviteDetails = await adminInviteService.verifyInviteToken(token);

        return res.status(200).json({
            message: 'Invitation is valid',
            ...inviteDetails,
        });
    } catch (error: any) {
        console.error('Error verifying invite token:', error);

        // Handle specific error messages
        if (error.message === 'Invalid invitation link') {
            return res.status(400).json({ error: 'Invalid invitation link' });
        }

        if (error.message === 'Invitation has expired') {
            return res.status(400).json({ error: 'Invitation has expired' });
        }

        return res.status(500).json({ error: 'Failed to verify invitation' });
    }
};

/**
 * Accept an admin invitation
 * POST /api/admin-invite/accept-invite
 */
export const acceptInvite = async (req: AuthRequest, res: Response) => {
    try {
        const { token, name, password } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const result = await adminInviteService.acceptInvite(token, name, password);

        return res.status(200).json({
            message: result.message,
            email: result.email,
        });
    } catch (error: any) {
        console.error('Error accepting invite:', error);

        // Handle specific error messages
        const errorMessage = error.message || 'Failed to accept invitation';

        if (
            errorMessage === 'Invalid invitation link' ||
            errorMessage === 'Invitation not found or already used'
        ) {
            return res.status(400).json({ error: 'Invalid or already used invitation link' });
        }

        if (errorMessage === 'Invitation has expired') {
            return res.status(400).json({ error: 'Invitation has expired' });
        }

        if (errorMessage === 'User account no longer exists') {
            return res.status(400).json({ error: 'User account no longer exists' });
        }

        if (errorMessage === 'User account has been deleted') {
            return res.status(400).json({ error: 'User account has been deleted' });
        }

        return res.status(500).json({ error: errorMessage });
    }
};

/**
 * Decline an admin invitation
 * POST /api/admin-invite/decline-invite
 */
export const declineInvite = async (req: AuthRequest, res: Response) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        const result = await adminInviteService.declineInvite(token);

        return res.status(200).json({
            message: result.message,
        });
    } catch (error: any) {
        console.error('Error declining invite:', error);
        return res.status(400).json({ error: error.message || 'Failed to decline invitation' });
    }
};

