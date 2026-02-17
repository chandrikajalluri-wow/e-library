import express from 'express';
import * as adminInviteController from '../controllers/adminInviteController';

const router = express.Router();

// Verify invite token (public route - no auth required)
router.get('/verify-invite/:token', adminInviteController.verifyInviteToken);

// Accept invitation (public route - no auth required)
router.post('/accept-invite', adminInviteController.acceptInvite);

// Decline invitation (public route - no auth required)
router.post('/decline-invite', adminInviteController.declineInvite);

export default router;
