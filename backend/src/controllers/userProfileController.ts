import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import * as userProfileService from '../services/userProfileService';
import { UnauthorizedError } from '../utils/errors';

// --- Profile & Account Section (from userController) ---

export const getMe = async (req: AuthRequest, res: Response) => {
    try {
        const user = await userProfileService.getMe(req.user!._id);
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
        const stats = await userProfileService.getDashboardStats(req.user!._id, (req.user as any).streakCount);
        res.json(stats);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
    try {
        const profileImagePath = req.file ? (req.file as any).path : undefined;
        const result = await userProfileService.updateProfile(req.user!._id, req.body, profileImagePath);
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
        const expiryDate = await userProfileService.renewMembership(req.user!._id);
        res.json({ message: 'Membership renewed successfully', membershipExpiryDate: expiryDate });
    } catch (err: any) {
        console.error(err);
        if (err.message.includes('Basic membership')) return res.status(400).json({ error: err.message });
        res.status(500).json({ error: 'Server error' });
    }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
    try {
        await userProfileService.changePassword(req.user!._id, req.body.currentPassword, req.body.newPassword);
        res.json({ message: 'Password changed successfully' });
    } catch (err: any) {
        console.error(err);
        if (err.message.includes('Password must be') || err.message.includes('social login') || err.message.includes('Incorrect current password')) {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Server error' });
    }
};

export const deleteAccount = async (req: AuthRequest, res: Response) => {
    try {
        await userProfileService.deleteAccount(req.user!._id, req.body.password);
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

// --- Address Section (from addressController) ---

export const getAddresses = async (req: AuthRequest, res: Response) => {
    try {
        const addresses = await userProfileService.getAddresses(req.user!._id);
        res.json(addresses);
    } catch (err: any) {
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
};

export const addAddress = async (req: AuthRequest, res: Response) => {
    try {
        const newAddress = await userProfileService.addAddress(req.user!._id, req.body);
        res.status(201).json(newAddress);
    } catch (err: any) {
        res.status(err.message === 'All address fields are required' ? 400 : 500).json({ error: err.message });
    }
};

export const updateAddress = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const address = await userProfileService.updateAddress(id, req.user!._id, req.body);
        res.json(address);
    } catch (err: any) {
        res.status(err.message === 'Address not found' ? 404 : 500).json({ error: err.message });
    }
};

export const deleteAddress = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        await userProfileService.deleteAddress(id, req.user!._id);
        res.json({ message: 'Address removed successfully' });
    } catch (err: any) {
        res.status(err.message === 'Address not found' ? 404 : 500).json({ error: err.message });
    }
};

// --- Wishlist Section (from wishlistController) ---

export const getMyWishlist = async (req: AuthRequest, res: Response) => {
    try {
        const items = await userProfileService.getMyWishlist(req.user!._id);
        res.json(items);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getAllWishlists = async (req: AuthRequest, res: Response) => {
    try {
        const items = await userProfileService.getAllWishlistsAdmin();
        res.json(items);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const addToWishlist = async (req: AuthRequest, res: Response) => {
    try {
        const { book_id } = req.body;
        const item = await userProfileService.addToWishlist(req.user!._id, book_id);
        res.status(201).json(item);
    } catch (err: any) {
        console.log(err);
        res.status(err.message === 'Already in wishlist' ? 400 : 500).json({ error: err.message });
    }
};

export const removeFromWishlist = async (req: AuthRequest, res: Response) => {
    try {
        await userProfileService.removeFromWishlist(req.params.id);
        res.json({ message: 'Removed from wishlist' });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// --- Activity Log Section (from activityLogController) ---

export const getActivityLogs = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) throw new UnauthorizedError('Not authorized');
        const result = await userProfileService.getActivityLogs(req.query);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

// --- Book Requests (from userController) ---

export const requestBook = async (req: AuthRequest, res: Response) => {
    try {
        const { title, author, reason } = req.body;
        if (!title || !author) return res.status(400).json({ error: 'Title and author are required' });

        const request = await userProfileService.requestBook(req.user!._id, title, author, reason);
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
        const requests = await userProfileService.getMyBookRequests(req.user!._id);
        res.json(requests);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getAllBookRequests = async (req: AuthRequest, res: Response) => {
    try {
        const requests = await userProfileService.getAllBookRequests(req.query.sort as string);
        res.json(requests);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const updateBookRequestStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { status, bookId } = req.body;
        const request = await userProfileService.updateBookRequestStatus(req.params.id, status, req.user, bookId);
        res.json({ message: 'Request status updated', request });
    } catch (err: any) {
        console.error(err);
        if (err.message === 'Invalid status' || err.message === 'Request not found') {
            return res.status(err.message === 'Request not found' ? 404 : 400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Server error' });
    }
};

// --- Sessions (from userController) ---

export const getSessions = async (req: AuthRequest, res: Response) => {
    try {
        const sessions = await userProfileService.getSessions(req.user!._id);
        res.json(sessions);
    } catch (err: any) {
        console.error(err);
        if (err.message === 'User not found') return res.status(404).json({ error: err.message });
        res.status(500).json({ error: 'Server error' });
    }
};

export const revokeSession = async (req: AuthRequest, res: Response) => {
    try {
        await userProfileService.revokeSession(req.user!._id, req.body.token);
        res.json({ message: 'Session revoked successfully' });
    } catch (err: any) {
        console.error(err);
        if (err.message === 'User not found') return res.status(404).json({ error: err.message });
        res.status(500).json({ error: 'Server error' });
    }
};

export const logoutAll = async (req: AuthRequest, res: Response) => {
    try {
        await userProfileService.logoutAll(req.user!._id);
        res.json({ message: 'Logged out from all devices successfully' });
    } catch (err: any) {
        console.error(err);
        if (err.message === 'User not found') return res.status(404).json({ error: err.message });
        res.status(500).json({ error: 'Server error' });
    }
};

// --- Cart (from userController) ---

export const getCart = async (req: AuthRequest, res: Response) => {
    try {
        const cart = await userProfileService.getCart(req.user!._id);
        res.json(cart);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const syncCart = async (req: AuthRequest, res: Response) => {
    try {
        const cart = await userProfileService.syncCart(req.user!._id, req.body.cartItems);
        res.json({ message: 'Cart synced successfully', cart });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const clearCartLocally = async (req: AuthRequest, res: Response) => {
    try {
        await userProfileService.clearCart(req.user!._id);
        res.json({ message: 'Cart cleared successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// --- Readlist (from userController) ---

export const getReadlist = async (req: AuthRequest, res: Response) => {
    try {
        const readlist = await userProfileService.getReadlist(req.user!._id);
        res.json(readlist);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const checkBookAccess = async (req: AuthRequest, res: Response) => {
    try {
        const accessInfo = await userProfileService.checkBookAccess(req.user!._id, req.params.bookId);
        res.json(accessInfo);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const addToReadlist = async (req: AuthRequest, res: Response) => {
    try {
        await userProfileService.addToReadlist(req.user!._id, req.body.book_id);
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
        const progress = await userProfileService.getReadingProgress(req.user!._id, req.params.bookId);
        res.json(progress);
    } catch (err: any) {
        console.error(err);
        if (err.message.includes('not found')) return res.status(404).json({ error: err.message });
        res.status(500).json({ error: 'Server error' });
    }
};

export const updateReadingProgress = async (req: AuthRequest, res: Response) => {
    try {
        const progress = await userProfileService.updateReadingProgress(req.user!._id, req.params.bookId, req.body);
        res.json({ message: 'Reading progress updated', progress });
    } catch (err: any) {
        console.error(err);
        if (err.message.includes('not found')) return res.status(404).json({ error: err.message });
        res.status(500).json({ error: 'Server error' });
    }
};

// --- Admin Dashboard Stats (from userController) ---

export const getAdminDashboardStats = async (req: AuthRequest, res: Response) => {
    try {
        const stats = await userProfileService.getAdminDashboardStats(req.query.addedBy as string);
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
        const result = await userProfileService.getAllReadlistEntries(filters, pagination);
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// --- Memberships (from membershipController) ---

export const getAllMemberships = async (req: any, res: Response) => {
    try {
        const memberships = await userProfileService.getAllMemberships();
        res.json(memberships);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getMyMembership = async (req: AuthRequest, res: Response) => {
    try {
        const membership = await userProfileService.getMyMembership(req.user!._id);
        res.json(membership);
    } catch (err: any) {
        console.error(err);
        res.status(err.message === 'User not found' ? 404 : 500).json({ error: err.message });
    }
};

export const upgradeMyMembership = async (req: AuthRequest, res: Response) => {
    try {
        const { membershipId } = req.body;
        const updatedUser = await userProfileService.upgradeMembership(req.user!._id, membershipId);
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
        const updatedUser = await userProfileService.updateUserMembershipAdmin(userId, membershipId);
        res.json({
            message: `User membership updated to ${(updatedUser?.membership_id as any).displayName}`,
            user: updatedUser
        });
    } catch (err: any) {
        console.error(err);
        res.status(err.message.includes('not found') ? 404 : 500).json({ error: err.message });
    }
};
