import express from 'express';
import * as authController from '../controllers/authController';
import { auth } from '../middleware/authMiddleware';

const router = express.Router();

// Signup
router.post('/signup', authController.signup);

// Login
router.post('/login', authController.login);

// Forgot Password
router.post('/forgot', authController.forgotPassword);

// Verify Email
router.get('/verify/:token', authController.verifyEmail);

// Reset Password
router.post('/reset/:token', authController.resetPassword);

// Google Login
router.post('/google-login', authController.googleLogin);

// Logout
router.post('/logout', auth, authController.logout);

export default router;
