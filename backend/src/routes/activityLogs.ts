import express from 'express';
import { auth, checkRole } from '../middleware/authMiddleware';
import * as activityLogController from '../controllers/activityLogController';
import { RoleName } from '../types/enums';

const router = express.Router();

// Get Logs (Admin)
router.get('/', auth, checkRole([RoleName.ADMIN, RoleName.SUPER_ADMIN]), activityLogController.getActivityLogs);

export default router;
