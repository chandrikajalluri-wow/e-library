import express from 'express';
import { auth, checkRole } from '../middleware/authMiddleware';
import { RoleName } from '../types/enums';
import { upload } from '../middleware/uploadMiddleware';
import * as userProfileController from '../controllers/userProfileController';

const router = express.Router();

// User Addresses
router.get('/addresses', auth, userProfileController.getAddresses);
router.post('/addresses', auth, userProfileController.addAddress);
router.put('/addresses/:id', auth, userProfileController.updateAddress);
router.delete('/addresses/:id', auth, userProfileController.deleteAddress);

// Get Current User Profile
router.get('/me', auth, userProfileController.getMe);

// Get Dashboard Stats
router.get('/dashboard-stats', auth, userProfileController.getDashboardStats);

// Update Profile
router.put('/profile', auth, upload.single('profileImage'), userProfileController.updateProfile);

// Renew Membership
router.post('/renew-membership', auth, userProfileController.renewMembership);

// Change Password
router.put('/change-password', auth, userProfileController.changePassword);

// Request New Book
router.get('/book-requests/me', auth, userProfileController.getMyBookRequests);
router.post('/book-requests', auth, userProfileController.requestBook);

// ADMIN: Get All Book Requests
router.get('/admin/book-requests', auth, checkRole([RoleName.ADMIN, RoleName.SUPER_ADMIN]), userProfileController.getAllBookRequests);

// ADMIN: Update Book Request Status
router.put('/admin/book-requests/:id', auth, checkRole([RoleName.ADMIN, RoleName.SUPER_ADMIN]), userProfileController.updateBookRequestStatus);

// Get Active Sessions
router.get('/sessions', auth, userProfileController.getSessions);
router.post('/sessions/revoke', auth, userProfileController.revokeSession);

// Logout from all devices
router.post('/logout-all', auth, userProfileController.logoutAll);

// Delete Account
router.delete('/me', auth, userProfileController.deleteAccount);

// Cart Sync
router.get('/cart', auth, userProfileController.getCart);
router.post('/cart/sync', auth, userProfileController.syncCart);
router.delete('/cart', auth, userProfileController.clearCartLocally);

// Readlist
router.get('/readlist', auth, userProfileController.getReadlist);
router.post('/readlist', auth, userProfileController.addToReadlist);

// ADMIN: Get All Readlist Entries (Read History)
router.get('/admin/readlist', auth, checkRole([RoleName.ADMIN, RoleName.SUPER_ADMIN]), userProfileController.getAllReadlistEntries);

// ADMIN: Dashboard Stats
router.get('/admin/dashboard-stats', auth, checkRole([RoleName.ADMIN, RoleName.SUPER_ADMIN]), userProfileController.getAdminDashboardStats);

// Book Access Check
router.get('/book-access/:bookId', auth, userProfileController.checkBookAccess);

// Reading Progress
router.get('/reading-progress/:bookId', auth, userProfileController.getReadingProgress);
router.put('/reading-progress/:bookId', auth, userProfileController.updateReadingProgress);

export default router;
