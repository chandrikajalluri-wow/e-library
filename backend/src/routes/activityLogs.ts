import express from 'express';
import { auth, checkRole } from '../middleware/authMiddleware';
import * as userProfileController from '../controllers/userProfileController';
import { RoleName } from '../types/enums';

const router = express.Router();

// Get Logs (Admin)
router.get('/', auth, checkRole([RoleName.ADMIN, RoleName.SUPER_ADMIN]), userProfileController.getActivityLogs);

export default router;
