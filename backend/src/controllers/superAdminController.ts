import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import * as superAdminService from '../services/superAdminService';

export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const result = await superAdminService.getAllUsers(req.query);
        res.json(result);
    } catch (err) {
        console.error('getAllUsers error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const manageAdmin = async (req: Request, res: Response) => {
    try {
        const { userId, action } = req.body;
        const user = await superAdminService.manageAdmin(userId, action, (req as any).user._id);
        res.json({ message: `User successfully ${action === 'promote' ? 'promoted' : 'demoted'}`, user });
    } catch (err: any) {
        res.status(err.message === 'Role not found' || err.message === 'User not found' ? 404 : 500).json({ error: err.message });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    try {
        const { force } = req.body;
        await superAdminService.deleteUser(req.params.id, (req as any).user._id, force);
        res.json({ message: `User deactivated and anonymized successfully${force ? ' (Forced)' : ''}` });
    } catch (err: any) {
        console.error(err);
        if (err.message === 'User has pending obligations') {
            return res.status(409).json({ error: err.message, details: err.details });
        }
        res.status(err.message === 'User not found' ? 404 : 500).json({ error: err.message });
    }
};

export const getAllReviews = async (req: Request, res: Response) => {
    try {
        const reviews = await superAdminService.getAllReviews();
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

export const deleteReview = async (req: Request, res: Response) => {
    try {
        await superAdminService.deleteReview(req.params.id);
        res.json({ message: 'Review removed successfully' });
    } catch (err: any) {
        res.status(err.message === 'Review not found' ? 404 : 500).json({ error: err.message });
    }
};

export const getAllAnnouncements = async (req: Request, res: Response) => {
    try {
        const announcements = await superAdminService.getAllAnnouncements();
        res.json(announcements);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

export const createAnnouncement = async (req: Request, res: Response) => {
    try {
        const announcement = await superAdminService.createAnnouncement((req as any).user._id, req.body);
        res.json(announcement);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

export const deleteAnnouncement = async (req: Request, res: Response) => {
    try {
        await superAdminService.deleteAnnouncement(req.params.id);
        res.json({ message: 'Announcement deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

export const getSystemLogs = async (req: Request, res: Response) => {
    try {
        const adminLogs = await superAdminService.getSystemLogs();
        res.json(adminLogs);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

export const getUsageMetrics = async (req: Request, res: Response) => {
    try {
        const metrics = await superAdminService.getUsageMetrics();
        res.json(metrics);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getAdmins = async (req: Request, res: Response) => {
    try {
        const admins = await superAdminService.getAdmins();
        res.json(admins);
    } catch (err: any) {
        res.status(err.message === 'Admin role not found' ? 404 : 500).json({ error: err.message });
    }
};

export const getContactQueries = async (req: Request, res: Response) => {
    try {
        const queries = await superAdminService.getContactQueries();
        res.json(queries);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

export const updateContactQueryStatus = async (req: Request, res: Response) => {
    try {
        const { status } = req.body;
        const query = await superAdminService.updateContactQueryStatus(req.params.id, status);
        res.json(query);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

export const getReportedReviews = async (req: Request, res: Response) => {
    try {
        const reviews = await superAdminService.getReportedReviews();
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

export const dismissReviewReports = async (req: Request, res: Response) => {
    try {
        await superAdminService.dismissReviewReports(req.params.id);
        res.json({ message: 'Reports dismissed' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

export const replyToContactQuery = async (req: Request, res: Response) => {
    try {
        const { replyText } = req.body;
        if (!replyText) return res.status(400).json({ error: 'Reply text is required' });
        const query = await superAdminService.replyToContactQuery(req.params.id, replyText, (req as any).user._id);
        res.json({ message: 'Reply sent and query marked as resolved', query });
    } catch (err: any) {
        console.error('Reply to contact query error:', err);
        res.status(err.message === 'Query not found' ? 404 : 500).json({ error: err.message });
    }
};

export const getUserDetails = async (req: Request, res: Response) => {
    try {
        const result = await superAdminService.getUserDetails(req.params.id);
        res.json(result);
    } catch (err: any) {
        console.error('Get user details error:', err);
        res.status(err.message === 'User not found' ? 404 : 500).json({ error: err.message });
    }
};

export const inviteAdmin = async (req: AuthRequest, res: Response) => {
    try {
        const { userId } = req.params;
        const inviterId = req.user!._id.toString();
        const result = await superAdminService.createAdminInvite(userId, inviterId);
        return res.status(201).json({ message: result.message, email: result.email });
    } catch (error: any) {
        console.error('Error inviting admin:', error);
        const errorMessage = error.message || 'Failed to send invitation';
        const status = errorMessage === 'Target user not found' ? 404 : 400;
        return res.status(status).json({ error: errorMessage });
    }
};

export const inviteAdminByEmail = async (req: AuthRequest, res: Response) => {
    try {
        const { email } = req.body;
        const inviterId = req.user!._id.toString();
        if (!email) return res.status(400).json({ error: 'Email is required' });
        const result = await superAdminService.createAdminInviteByEmail(email, inviterId);
        return res.status(201).json({ message: result.message, email: result.email });
    } catch (error: any) {
        console.error('Error inviting admin by email:', error);
        const errorMessage = error.message || 'Failed to send invitation';
        return res.status(400).json({ error: errorMessage });
    }
};



// --- Admin Invite Public Flow ---

export const verifyInviteToken = async (req: AuthRequest, res: Response) => {
    try {
        const { token } = req.params;
        if (!token) return res.status(400).json({ error: 'Token is required' });
        const inviteDetails = await superAdminService.verifyInviteToken(token);
        return res.status(200).json({ message: 'Invitation is valid', ...inviteDetails });
    } catch (error: any) {
        console.error('Error verifying invite token:', error);
        const status = ['Invalid invitation link', 'Invitation has expired'].includes(error.message) ? 400 : 500;
        return res.status(status).json({ error: error.message || 'Failed to verify invitation' });
    }
};

export const acceptInvite = async (req: AuthRequest, res: Response) => {
    try {
        const { token, name, password } = req.body;
        if (!token) return res.status(400).json({ error: 'Token is required' });
        if (!name) return res.status(400).json({ error: 'Name is required' });
        const result = await superAdminService.acceptInvite(token, name, password);
        return res.status(200).json({ message: result.message, email: result.email });
    } catch (error: any) {
        console.error('Error accepting invite:', error);
        const errorMessage = error.message || 'Failed to accept invitation';
        return res.status(400).json({ error: errorMessage });
    }
};

export const declineInvite = async (req: AuthRequest, res: Response) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ error: 'Token is required' });
        const result = await superAdminService.declineInvite(token);
        return res.status(200).json({ message: result.message });
    } catch (error: any) {
        console.error('Error declining invite:', error);
        return res.status(400).json({ error: error.message || 'Failed to decline invitation' });
    }
};
