import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User';
import Role from '../models/Role';
import AuthToken from '../models/AuthToken';
import { sendEmail } from '../utils/mailer';
import { IRole } from '../models/Role';

const router = express.Router();

// Signup
router.post('/signup', async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  try {
    // Basic validations
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Password validation: 8 chars, 1 uppercase, 1 special, 1 number
    const passwordRegex =
      /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        error:
          'Password must be at least 8 characters long and contain at least one uppercase letter, one number, and one special character',
      });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    // Default role = "user"
    const userRole = await Role.findOne({ name: 'user' });
    if (!userRole)
      return res.status(500).json({ error: 'Default role not found' });

    const user = new User({
      name,
      email,
      password: hashed,
      role_id: userRole._id,
      verificationToken: crypto.randomBytes(20).toString('hex'),
    });

    const frontendUrl = process.env.FRONTEND_URL;
    const verifyLink = `${frontendUrl}/verify/${user.verificationToken}`;
    await sendEmail(
      email,
      'Verify Your Email',
      `Please verify your email by clicking: ${verifyLink}`
    );

    await user.save();
    res.json({
      message: 'Signup successful. Please check your email to verify account.',
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email }).populate('role_id');
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    if (!user.isVerified) {
      // If no token exists (legacy user), create one and send email
      if (!user.verificationToken) {
        user.verificationToken = crypto.randomBytes(20).toString('hex');
        const frontendUrl = process.env.FRONTEND_URL;
        const verifyLink = `${frontendUrl}/verify/${user.verificationToken}`;
        await sendEmail(
          user.email,
          'Verify Your Email',
          `Please verify your email by clicking: ${verifyLink}`
        );
        await user.save();
        return res.status(400).json({
          error:
            'Account not verified. A new verification email has been sent to you.',
        });
      }
      return res.status(400).json({ error: 'Please verify your email first' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Invalid credentials' });

    const roleDoc = user.role_id as IRole;
    const token = jwt.sign(
      { id: user._id, role: roleDoc.name },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    // Update last login and sessions
    user.lastLogin = new Date();
    const device = req.headers['user-agent'] || 'Unknown Device';

    // Limit to last 5 sessions for simplicity
    if (!user.activeSessions) user.activeSessions = [];
    user.activeSessions.push({
      device,
      location: 'Unknown', // In a real app, use geo-ip
      lastActive: new Date(),
      token
    });

    if (user.activeSessions.length > 5) {
      user.activeSessions = user.activeSessions.slice(-5);
    }

    await user.save();

    res.json({ token, role: roleDoc.name, userId: user._id });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Forgot Password
router.post('/forgot', async (req: Request, res: Response) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'User not found' });

    // Generate token
    const token = crypto.randomBytes(20).toString('hex');

    // expiry 1 hour
    const expiresAt = new Date(Date.now() + 3600000);

    // Create AuthToken record
    await AuthToken.create({
      user_id: user._id,
      token: token,
      type: 'password_reset',
      expires_at: expiresAt,
    });

    const frontendUrl = process.env.FRONTEND_URL;
    const resetLink = `${frontendUrl}/reset/${token}`;
    await sendEmail(
      email,
      'Password Reset',
      `Click here to reset: ${resetLink}`
    );

    res.json({ message: 'Reset link sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify Email
router.get('/verify/:token', async (req: Request, res: Response) => {
  try {
    console.log('Verifying token:', req.params.token);
    const user = await User.findOne({ verificationToken: req.params.token });
    console.log('User found:', user ? user.email : 'No user found');

    if (!user) return res.status(400).json({ error: 'Invalid token' });

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset Password
router.post('/reset/:token', async (req: Request, res: Response) => {
  const { token } = req.params;
  const { password } = req.body;
  try {
    const passwordRegex =
      /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        error:
          'Password must be at least 8 characters long and contain at least one uppercase letter, one number, and one special character',
      });
    }

    // Find valid unused token
    const authToken = await AuthToken.findOne({
      token: token,
      type: 'password_reset',
      used: false,
      expires_at: { $gt: Date.now() },
    });

    if (!authToken)
      return res.status(400).json({ error: 'Invalid or expired token' });

    // Find user
    const user = await User.findById(authToken.user_id);
    if (!user) return res.status(400).json({ error: 'User not found' });

    // Update password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();

    // Mark token as used
    authToken.used = true;
    await authToken.save();

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
