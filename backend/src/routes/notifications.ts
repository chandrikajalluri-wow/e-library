import express from 'express';
import { auth, checkRole } from '../middleware/authMiddleware';
import { RoleName } from '../types/enums';
import * as notificationController from '../controllers/notificationController';

const router = express.Router();

// Get current user's notifications
router.get('/my', auth, notificationController.getMyNotifications);

// Mark my notification as read
router.put('/read/:id', auth, notificationController.markMyNotificationAsRead);

// Mark all my notifications as read
router.put('/read-all/my', auth, notificationController.markAllMyNotificationsAsRead);

// Admin Routes below...
// Get all notifications (Admin)
router.get('/', auth, checkRole([RoleName.ADMIN, RoleName.SUPER_ADMIN]), notificationController.getAllNotifications);

// Mark notification as read (Admin)
router.put('/:id/read', auth, checkRole([RoleName.ADMIN, RoleName.SUPER_ADMIN]), notificationController.markNotificationAsReadAdmin);

// Mark all as read (Admin)
router.put('/read-all', auth, checkRole([RoleName.ADMIN, RoleName.SUPER_ADMIN]), notificationController.markAllNotificationsAsReadAdmin);

// Stock alert (User triggers for out-of-stock items)
router.post('/stock-alert', auth, notificationController.notifyStockAlert);

export default router;
