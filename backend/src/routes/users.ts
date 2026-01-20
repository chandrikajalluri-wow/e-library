import express from 'express';
import { auth, checkRole } from '../middleware/authMiddleware';
import { RoleName } from '../types/enums';
import { upload } from '../middleware/uploadMiddleware';
import * as userController from '../controllers/userController';

const router = express.Router();

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
router.get('/admin/book-requests', auth, checkRole([RoleName.ADMIN]), userController.getAllBookRequests);

// ADMIN: Update Book Request Status
router.put('/admin/book-requests/:id', auth, checkRole([RoleName.ADMIN]), userController.updateBookRequestStatus);

// ADMIN: Send Fine Reminder
router.post('/admin/send-fine-reminder/:id', auth, checkRole([RoleName.ADMIN]), userController.sendFineReminder);

// Get Active Sessions
router.get('/sessions', auth, userController.getSessions);

// Logout from all devices
router.post('/logout-all', auth, userController.logoutAll);

// Delete Account
router.delete('/me', auth, userController.deleteAccount);

export default router;
