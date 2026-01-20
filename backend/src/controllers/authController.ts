import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User';
import Role from '../models/Role';
import AuthToken from '../models/AuthToken';
import Membership from '../models/Membership';
import { sendEmail } from '../utils/mailer';
import { IRole } from '../models/Role';
import { RoleName, MembershipName } from '../types/enums';

export const signup = async (req: Request, res: Response) => {
    const { name, email, password } = req.body;
    try {
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

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

        const userRole = await Role.findOne({ name: RoleName.USER });
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

        const basicMembership = await Membership.findOne({ name: 'basic' });
        if (basicMembership) {
            user.membership_id = basicMembership._id;
            user.membershipStartDate = new Date();
        }

        await user.save();
        res.json({
            message: 'Signup successful. Please check your email to verify account.',
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email }).populate('role_id');
        if (!user) return res.status(400).json({ error: 'Invalid credentials' });

        if (!user.isVerified) {
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
            { expiresIn: '7d' }
        );

        const now = new Date();
        const lastLogin = user.lastLogin;

        if (!lastLogin || !user.streakCount || user.streakCount === 0) {
            user.streakCount = 1;
        } else {
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const lastLoginDate = new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate());
            const diffTime = today.getTime() - lastLoginDate.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                user.streakCount = user.streakCount + 1;
            } else if (diffDays > 1) {
                user.streakCount = 1;
            }
        }

        user.lastLogin = now;
        const device = req.headers['user-agent'] || 'Unknown Device';

        if (!user.activeSessions) user.activeSessions = [];
        user.activeSessions.push({
            device,
            location: 'Unknown',
            lastActive: now,
            token
        });

        if (user.activeSessions.length > 5) {
            user.activeSessions = user.activeSessions.slice(-5);
        }

        if (!user.membership_id) {
            const basicMembership = await Membership.findOne({ name: MembershipName.BASIC });
            if (basicMembership) {
                user.membership_id = basicMembership._id;
                user.membershipStartDate = user.membershipStartDate || new Date();
            }
        }

        await user.save();

        res.json({ token, role: roleDoc.name, userId: user._id, theme: user.theme });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const forgotPassword = async (req: Request, res: Response) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: 'User not found' });

        const token = crypto.randomBytes(20).toString('hex');
        const expiresAt = new Date(Date.now() + 3600000);

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
};

export const verifyEmail = async (req: Request, res: Response) => {
    try {
        const user = await User.findOne({ verificationToken: req.params.token });
        if (!user) return res.status(400).json({ error: 'Invalid token' });

        user.isVerified = true;
        user.verificationToken = undefined;
        await user.save();

        res.json({ message: 'Email verified successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const resetPassword = async (req: Request, res: Response) => {
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

        const authToken = await AuthToken.findOne({
            token: token,
            type: 'password_reset',
            used: false,
            expires_at: { $gt: Date.now() },
        });

        if (!authToken)
            return res.status(400).json({ error: 'Invalid or expired token' });

        const user = await User.findById(authToken.user_id);
        if (!user) return res.status(400).json({ error: 'User not found' });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();

        authToken.used = true;
        await authToken.save();

        res.json({ message: 'Password reset successful' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};
