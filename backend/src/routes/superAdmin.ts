import express from 'express';
import { auth, checkRole } from '../middleware/authMiddleware';
import * as superAdminController from '../controllers/superAdminController';
import { RoleName } from '../types/enums';

const router = express.Router();

// --- User & Admin Management ---

// Get all users (including admins)
router.get('/super-admin/users', auth, checkRole([RoleName.SUPER_ADMIN]), superAdminController.getAllUsers);

// Get specific user details with addresses
router.get('/super-admin/user/:id/details', auth, checkRole([RoleName.SUPER_ADMIN]), superAdminController.getUserDetails);

// Create Admin (Promote User)
router.post('/super-admin/manage-admin', auth, checkRole([RoleName.SUPER_ADMIN]), superAdminController.manageAdmin);

// Invite Admin (Secure Invitation Flow)
router.post('/super-admin/invite-admin/:userId', auth, checkRole([RoleName.SUPER_ADMIN]), superAdminController.inviteAdmin);

// Invite Admin by Email (New)
router.post('/super-admin/invite-admin-by-email', auth, checkRole([RoleName.SUPER_ADMIN]), superAdminController.inviteAdminByEmail);

// Remove User/Admin
router.delete('/super-admin/user/:id', auth, checkRole([RoleName.SUPER_ADMIN]), superAdminController.deleteUser);


// --- Content Moderation ---

// Get All Reviews (for moderation)
router.get('/super-admin/reviews', auth, checkRole([RoleName.SUPER_ADMIN]), superAdminController.getAllReviews);

// Delete Review
router.delete('/super-admin/review/:id', auth, checkRole([RoleName.SUPER_ADMIN, RoleName.ADMIN]), superAdminController.deleteReview);

// --- Announcements ---

// Get all announcements (Public so banners can show for guests/users)
router.get('/super-admin/announcements', superAdminController.getAllAnnouncements);

// Create Announcement
router.post('/super-admin/announcements', auth, checkRole([RoleName.SUPER_ADMIN]), superAdminController.createAnnouncement);

// Delete Announcement
router.delete('/super-admin/announcements/:id', auth, checkRole([RoleName.SUPER_ADMIN]), superAdminController.deleteAnnouncement);

// --- System Monitoring & Logs ---

// Get detailed system logs (enhanced)
router.get('/super-admin/system-logs', auth, checkRole([RoleName.SUPER_ADMIN]), superAdminController.getSystemLogs);

// Get Usage Metrics
router.get('/super-admin/metrics', auth, checkRole([RoleName.SUPER_ADMIN]), superAdminController.getUsageMetrics);

// Get all admins (simple list for dropdown)
router.get('/super-admin/admins', auth, checkRole([RoleName.SUPER_ADMIN]), superAdminController.getAdmins);

// --- Contact Queries ---
router.get('/super-admin/contact-queries', auth, checkRole([RoleName.SUPER_ADMIN]), superAdminController.getContactQueries);
router.patch('/super-admin/contact-queries/:id', auth, checkRole([RoleName.SUPER_ADMIN]), superAdminController.updateContactQueryStatus);
router.post('/super-admin/contact-queries/:id/reply', auth, checkRole([RoleName.SUPER_ADMIN]), superAdminController.replyToContactQuery);

// --- Reported Reviews ---
router.get('/super-admin/reported-reviews', auth, checkRole([RoleName.SUPER_ADMIN]), superAdminController.getReportedReviews);
router.patch('/super-admin/reviews/:id/dismiss', auth, checkRole([RoleName.SUPER_ADMIN]), superAdminController.dismissReviewReports);

// --- Admin Invite Public Flow (Legacy compatibility) ---
router.get('/admin-invite/verify-invite/:token', superAdminController.verifyInviteToken);
router.post('/admin-invite/accept-invite', superAdminController.acceptInvite);
router.post('/admin-invite/decline-invite', superAdminController.declineInvite);

export default router;
