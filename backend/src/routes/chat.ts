import express from 'express';
import { auth, checkRole } from '../middleware/authMiddleware';
import * as chatController from '../controllers/chatController';
import { RoleName } from '../types/enums';

const router = express.Router();

// User routes
router.post('/session', auth, chatController.createOrGetSession);
router.get('/messages/:sessionId', auth, chatController.getSessionMessages);

// Admin routes
router.get('/admin/sessions', auth, checkRole([RoleName.ADMIN, RoleName.SUPER_ADMIN]), chatController.getAllSessionsAdmin);
router.patch('/admin/close/:sessionId', auth, checkRole([RoleName.ADMIN, RoleName.SUPER_ADMIN]), chatController.closeSession);

export default router;
