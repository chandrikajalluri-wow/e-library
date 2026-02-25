import express from 'express';
import { auth, checkRole } from '../middleware/authMiddleware';
import { RoleName } from '../types/enums';
import * as membershipController from '../controllers/membershipController';

const router = express.Router();

// Get all membership plans
router.get('/', membershipController.getAllMemberships);

// Get current user's membership
router.get('/my', auth, membershipController.getMyMembership);

// User: Upgrade own membership
router.put('/upgrade', auth, membershipController.upgradeMyMembership);

// Admin: Update user's membership
router.put('/admin/users/:userId/membership', auth, checkRole([RoleName.ADMIN]), membershipController.updateUserMembershipAdmin);

export default router;
