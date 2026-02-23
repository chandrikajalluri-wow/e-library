import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import * as userService from '../services/userService';

export const getMe = async (req: AuthRequest, res: Response) => {
    try {
        const user = await userService.getMe(req.user!._id);
        res.json(user);
    } catch (err: any) {
        console.error(err);
        if (err.message === 'User not found') {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: 'Server error' });
    }
};

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
    try {
        const stats = await userService.getDashboardStats(req.user!._id, (req.user as any).streakCount);
        res.json(stats);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
    try {
        const profileImagePath = req.file ? (req.file as any).path : undefined;
        const result = await userService.updateProfile(req.user!._id, req.body, profileImagePath);
        res.json({ message: 'Profile updated successfully', user: result });
    } catch (err: any) {
        console.error(err);
        if (err.message === 'User not found') return res.status(404).json({ error: err.message });
        if (err.message.includes('favorite genres')) return res.status(400).json({ error: err.message });
        res.status(500).json({ error: 'Server error' });
    }
};

export const renewMembership = async (req: AuthRequest, res: Response) => {
    try {
        const expiryDate = await userService.renewMembership(req.user!._id);
        res.json({ message: 'Membership renewed successfully', membershipExpiryDate: expiryDate });
    } catch (err: any) {
        console.error(err);
        if (err.message.includes('Basic membership')) return res.status(400).json({ error: err.message });
        res.status(500).json({ error: 'Server error' });
    }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
    try {
        await userService.changePassword(req.user!._id, req.body.currentPassword, req.body.newPassword);
        res.json({ message: 'Password changed successfully' });
    } catch (err: any) {
        console.error(err);
        if (err.message.includes('Password must be') || err.message.includes('social login') || err.message.includes('Incorrect current password')) {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Server error' });
    }
};

export const requestBook = async (req: AuthRequest, res: Response) => {
    try {
        const { title, author, reason } = req.body;
        if (!title || !author) return res.status(400).json({ error: 'Title and author are required' });

        const request = await userService.requestBook(req.user!._id, title, author, reason);
        res.status(201).json({ message: 'Book request submitted successfully', request });
    } catch (err: any) {
        console.error(err);
        if (err.message.includes('Premium members') || err.message.includes('membership plan')) {
            return res.status(err.message.includes('Premium') ? 403 : 400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Server error' });
    }
};

export const getMyBookRequests = async (req: AuthRequest, res: Response) => {
    try {
        const requests = await userService.getMyBookRequests(req.user!._id);
        res.json(requests);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getAllBookRequests = async (req: AuthRequest, res: Response) => {
    try {
        const requests = await userService.getAllBookRequests(req.query.sort as string);
        res.json(requests);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const updateBookRequestStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { status, bookId } = req.body;
        const request = await userService.updateBookRequestStatus(req.params.id, status, req.user, bookId);
        res.json({ message: 'Request status updated', request });
    } catch (err: any) {
        console.error(err);
        if (err.message === 'Invalid status' || err.message === 'Request not found') {
            return res.status(err.message === 'Request not found' ? 404 : 400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Server error' });
    }
};

export const getSessions = async (req: AuthRequest, res: Response) => {
    try {
        const sessions = await userService.getSessions(req.user!._id);
        res.json(sessions);
    } catch (err: any) {
        console.error(err);
        if (err.message === 'User not found') return res.status(404).json({ error: err.message });
        res.status(500).json({ error: 'Server error' });
    }
};

export const revokeSession = async (req: AuthRequest, res: Response) => {
    try {
        await userService.revokeSession(req.user!._id, req.body.token);
        res.json({ message: 'Session revoked successfully' });
    } catch (err: any) {
        console.error(err);
        if (err.message === 'User not found') return res.status(404).json({ error: err.message });
        res.status(500).json({ error: 'Server error' });
    }
};

export const logoutAll = async (req: AuthRequest, res: Response) => {
    try {
        await userService.logoutAll(req.user!._id);
        res.json({ message: 'Logged out from all devices successfully' });
    } catch (err: any) {
        console.error(err);
        if (err.message === 'User not found') return res.status(404).json({ error: err.message });
        res.status(500).json({ error: 'Server error' });
    }
};

export const deleteAccount = async (req: AuthRequest, res: Response) => {
    try {
        await userService.deleteAccount(req.user!._id, req.body.password);
        res.json({ message: 'Account permanently deactivated. We are sorry to see you go.' });
    } catch (err: any) {
        console.error(err);
        if (err.message === 'User not found') return res.status(404).json({ error: err.message });
        if (err.message.includes('Invalid password') || err.message.includes('active reading') || err.message.includes('Social account')) {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Server error' });
    }
};

export const getCart = async (req: AuthRequest, res: Response) => {
    try {
        const cart = await userService.getCart(req.user!._id);
        res.json(cart);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const syncCart = async (req: AuthRequest, res: Response) => {
    try {
        const cart = await userService.syncCart(req.user!._id, req.body.cartItems);
        res.json({ message: 'Cart synced successfully', cart });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const clearCartLocally = async (req: AuthRequest, res: Response) => {
    try {
        await userService.clearCart(req.user!._id);
        res.json({ message: 'Cart cleared successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getReadlist = async (req: AuthRequest, res: Response) => {
    try {
        const readlist = await userService.getReadlist(req.user!._id);
        res.json(readlist);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const checkBookAccess = async (req: AuthRequest, res: Response) => {
    try {
        const accessInfo = await userService.checkBookAccess(req.user!._id, req.params.bookId);
        res.json(accessInfo);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getAdminDashboardStats = async (req: AuthRequest, res: Response) => {
    try {
        const stats = await userService.getAdminDashboardStats(req.query.addedBy as string);
        res.json(stats);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getAllReadlistEntries = async (req: AuthRequest, res: Response) => {
    try {
        const filters = { membership: req.query.membership, status: req.query.status };
        const pagination = {
            page: parseInt(req.query.page as string) || 1,
            limit: parseInt(req.query.limit as string) || 10
        };
        const result = await userService.getAllReadlistEntries(filters, pagination);
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const addToReadlist = async (req: AuthRequest, res: Response) => {
    try {
        await userService.addToReadlist(req.user!._id, req.body.book_id);
        res.json({ message: 'Book added to readlist successfully' });
    } catch (err: any) {
        console.error(err);
        if (err.requiresUpgrade) {
            return res.status(403).json({ error: err.message, requiresUpgrade: true });
        }
        if (err.message.includes('limit') || err.message.includes('already active')) {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Server error' });
    }
};

export const getReadingProgress = async (req: AuthRequest, res: Response) => {
    try {
        const progress = await userService.getReadingProgress(req.user!._id, req.params.bookId);
        res.json(progress);
    } catch (err: any) {
        console.error(err);
        if (err.message.includes('not found')) return res.status(404).json({ error: err.message });
        res.status(500).json({ error: 'Server error' });
    }
};

export const updateReadingProgress = async (req: AuthRequest, res: Response) => {
    try {
        const progress = await userService.updateReadingProgress(req.user!._id, req.params.bookId, req.body);
        res.json({ message: 'Reading progress updated', progress });
    } catch (err: any) {
        console.error(err);
        if (err.message.includes('not found')) return res.status(404).json({ error: err.message });
        res.status(500).json({ error: 'Server error' });
    }
};



