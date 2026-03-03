import express from 'express';
import { auth, checkRole } from '../middleware/authMiddleware';
import * as communicationController from '../controllers/communicationController';
import { RoleName } from '../types/enums';

const router = express.Router();

// --- Chat Routes ---

// User routes
router.post('/chat/session', auth, communicationController.createOrGetSession);
router.get('/chat/messages/:sessionId', auth, communicationController.getSessionMessages);

// Admin routes
router.get('/chat/admin/sessions', auth, checkRole([RoleName.ADMIN, RoleName.SUPER_ADMIN]), communicationController.getAllSessionsAdmin);
router.patch('/chat/admin/close/:sessionId', auth, checkRole([RoleName.ADMIN, RoleName.SUPER_ADMIN]), communicationController.closeSession);

// --- Contact Routes ---

router.post('/contact', communicationController.submitContactForm);

export default router;
