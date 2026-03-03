import express from 'express';
import { auth, checkRole } from '../middleware/authMiddleware';
import { RoleName } from '../types/enums';
import * as userProfileController from '../controllers/userProfileController';

const router = express.Router();

// Get all membership plans
router.get('/', userProfileController.getAllMemberships);

// Get current user's membership
router.get('/my', auth, userProfileController.getMyMembership);

// User: Upgrade own membership
router.put('/upgrade', auth, userProfileController.upgradeMyMembership);

// Admin: Update user's membership
router.put('/admin/users/:userId/membership', auth, checkRole([RoleName.ADMIN]), userProfileController.updateUserMembershipAdmin);

export default router;
