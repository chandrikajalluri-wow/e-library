import express from 'express';
import { auth, checkRole } from '../middleware/authMiddleware';
import * as superAdminController from '../controllers/superAdminController';
import { RoleName } from '../types/enums';

const router = express.Router();

// --- User & Admin Management ---

// Get all users (including admins)
router.get('/users', auth, checkRole([RoleName.SUPER_ADMIN]), superAdminController.getAllUsers);

// Get specific user details with addresses
router.get('/user/:id/details', auth, checkRole([RoleName.SUPER_ADMIN]), superAdminController.getUserDetails);

// Create Admin (Promote User)
router.post('/manage-admin', auth, checkRole([RoleName.SUPER_ADMIN]), superAdminController.manageAdmin);

// Remove User/Admin
router.delete('/user/:id', auth, checkRole([RoleName.SUPER_ADMIN]), superAdminController.deleteUser);

// Revoke Deletion
router.post('/user/:id/revoke-deletion', auth, checkRole([RoleName.SUPER_ADMIN]), superAdminController.revokeUserDeletion);

// --- Content Moderation ---

// Get All Reviews (for moderation)
router.get('/reviews', auth, checkRole([RoleName.SUPER_ADMIN]), superAdminController.getAllReviews);

// Delete Review
router.delete('/review/:id', auth, checkRole([RoleName.SUPER_ADMIN, RoleName.ADMIN]), superAdminController.deleteReview);

// --- Announcements ---

// Get all announcements (Public so banners can show for guests/users)
router.get('/announcements', superAdminController.getAllAnnouncements);

// Create Announcement
router.post('/announcements', auth, checkRole([RoleName.SUPER_ADMIN]), superAdminController.createAnnouncement);

// Delete Announcement
router.delete('/announcements/:id', auth, checkRole([RoleName.SUPER_ADMIN]), superAdminController.deleteAnnouncement);

// --- System Monitoring & Logs ---

// Get detailed system logs (enhanced)
router.get('/system-logs', auth, checkRole([RoleName.SUPER_ADMIN]), superAdminController.getSystemLogs);

// Get Usage Metrics
router.get('/metrics', auth, checkRole([RoleName.SUPER_ADMIN]), superAdminController.getUsageMetrics);

// Get all admins (simple list for dropdown)
router.get('/admins', auth, checkRole([RoleName.SUPER_ADMIN]), superAdminController.getAdmins);

// --- Contact Queries ---
router.get('/contact-queries', auth, checkRole([RoleName.SUPER_ADMIN]), superAdminController.getContactQueries);
router.patch('/contact-queries/:id', auth, checkRole([RoleName.SUPER_ADMIN]), superAdminController.updateContactQueryStatus);
router.post('/contact-queries/:id/reply', auth, checkRole([RoleName.SUPER_ADMIN]), superAdminController.replyToContactQuery);

// --- Reported Reviews ---
router.get('/reported-reviews', auth, checkRole([RoleName.SUPER_ADMIN]), superAdminController.getReportedReviews);
router.patch('/reviews/:id/dismiss', auth, checkRole([RoleName.SUPER_ADMIN]), superAdminController.dismissReviewReports);

export default router;
