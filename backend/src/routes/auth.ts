import express from 'express';
import * as authController from '../controllers/authController';

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

export default router;
