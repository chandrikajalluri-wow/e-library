import express from 'express';
import { auth, checkRole } from '../middleware/authMiddleware';
import { RoleName } from '../types/enums';
import { upload } from '../middleware/uploadMiddleware';
import * as userController from '../controllers/userController';
import * as addressController from '../controllers/addressController';

const router = express.Router();

// User Addresses
router.get('/addresses', auth, addressController.getAddresses);
router.post('/addresses', auth, addressController.addAddress);
router.put('/addresses/:id', auth, addressController.updateAddress);
router.delete('/addresses/:id', auth, addressController.deleteAddress);

// Get Current User Profile
router.get('/me', auth, userController.getMe);

// Get Dashboard Stats
router.get('/dashboard-stats', auth, userController.getDashboardStats);

// Update Profile
router.put('/profile', auth, upload.single('profileImage'), userController.updateProfile);

// Renew Membership
router.post('/renew-membership', auth, userController.renewMembership);

// Change Password
router.put('/change-password', auth, userController.changePassword);

// Request New Book
router.post('/book-requests', auth, userController.requestBook);

// ADMIN: Get All Book Requests
router.get('/admin/book-requests', auth, checkRole([RoleName.ADMIN, RoleName.SUPER_ADMIN]), userController.getAllBookRequests);

// ADMIN: Update Book Request Status
router.put('/admin/book-requests/:id', auth, checkRole([RoleName.ADMIN, RoleName.SUPER_ADMIN]), userController.updateBookRequestStatus);



// Get Active Sessions
router.get('/sessions', auth, userController.getSessions);
router.post('/sessions/revoke', auth, userController.revokeSession);

// Logout from all devices
router.post('/logout-all', auth, userController.logoutAll);

// Delete Account
router.delete('/me', auth, userController.deleteAccount);

// Cart Sync
router.get('/cart', auth, userController.getCart);
router.post('/cart/sync', auth, userController.syncCart);
router.delete('/cart', auth, userController.clearCartLocally);

// Readlist
router.get('/readlist', auth, userController.getReadlist);
router.post('/readlist', auth, userController.addToReadlist);

// ADMIN: Get All Readlist Entries (Read History)
router.get('/admin/readlist', auth, checkRole([RoleName.ADMIN, RoleName.SUPER_ADMIN]), userController.getAllReadlistEntries);

// ADMIN: Dashboard Stats
router.get('/admin/dashboard-stats', auth, checkRole([RoleName.ADMIN, RoleName.SUPER_ADMIN]), userController.getAdminDashboardStats);

// Book Access Check
router.get('/book-access/:bookId', auth, userController.checkBookAccess);

export default router;
