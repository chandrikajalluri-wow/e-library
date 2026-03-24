import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User';
import Role, { IRole } from '../models/Role';
import AuthToken from '../models/AuthToken';
import Membership from '../models/Membership';
import { sendEmail } from '../utils/mailer';
import { RoleName, MembershipName, ActivityAction } from '../types/enums';
import { OAuth2Client } from 'google-auth-library';
import { getVerificationEmailTemplate, getPasswordResetTemplate } from '../utils/emailTemplates';
import ActivityLog from '../models/ActivityLog';

import { BadRequestError, UnauthorizedError, ConflictError, NotFoundError, ForbiddenError } from '../utils/errors';
import { saveSession } from '../utils/sessionManager';
import { eventBus, Events } from '../utils/eventBus';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const signup = async (name: string, email: string, password: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) throw new BadRequestError('Invalid email format');

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
        throw new BadRequestError('Password must be at least 8 characters long and contain at least one uppercase letter, one number, and one special character');
    }

    const existing = await User.findOne({ email });
    if (existing) throw new ConflictError('User already exists');

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const userRole = await Role.findOne({ name: RoleName.USER });
    if (!userRole) throw new NotFoundError('Default role not found');

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
        `Please verify your email by clicking: ${verifyLink}`,
        getVerificationEmailTemplate(name, verifyLink)
    );

    const basicMembership = await Membership.findOne({ name: MembershipName.BASIC });
    if (!basicMembership) throw new NotFoundError('Basic membership not found');

    user.membership_id = basicMembership._id;
    user.membershipStartDate = new Date();

    await user.save();

    await ActivityLog.create({
        user_id: user._id,
        action: ActivityAction.USER_REGISTERED,
        timestamp: new Date()
    });

    return true;
};

export const login = async (email: string, password: string, userAgent: string = 'Unknown Device') => {
    const user = await User.findOne({ email }).populate('role_id');
    if (!user) throw new UnauthorizedError('Invalid credentials');

    if (user.isDeleted) throw new ForbiddenError('This account has been deleted');

    if (!user.isVerified) {
        user.verificationToken = crypto.randomBytes(20).toString('hex');
        const frontendUrl = process.env.FRONTEND_URL;
        const verifyLink = `${frontendUrl}/verify/${user.verificationToken}`;

        await sendEmail(
            user.email,
            'Verify Your Email',
            `Please verify your email by clicking: ${verifyLink}`,
            getVerificationEmailTemplate(user.name, verifyLink)
        );

        await user.save();
        throw new BadRequestError('Account not verified. A new verification email has been sent to your inbox. Please verify to continue.');
    }

    if (!user.password) throw new UnauthorizedError('Invalid credentials. Please login with Google if you signed up with social account.');

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new UnauthorizedError('Invalid credentials');

    const roleDoc = user.role_id as IRole;
    const token = jwt.sign(
        { id: user._id, role: roleDoc.name },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
    );

    const now = new Date();
    // Handle Streak
    if (!user.lastLogin || !user.streakCount || user.streakCount === 0) {
        user.streakCount = 1;
    } else {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const lastLoginDate = new Date(user.lastLogin.getFullYear(), user.lastLogin.getMonth(), user.lastLogin.getDate());
        const diffDays = Math.floor((today.getTime() - lastLoginDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) user.streakCount += 1;
        else if (diffDays > 1) user.streakCount = 1;
    }

    user.lastLogin = now;
    if (!user.activeSessions) user.activeSessions = [];

    const existingSessionIndex = user.activeSessions.findIndex((s: any) => s.device === userAgent);
    if (existingSessionIndex !== -1) {
        user.activeSessions[existingSessionIndex].token = token;
        user.activeSessions[existingSessionIndex].lastActive = now;
    } else {
        user.activeSessions.push({ device: userAgent, location: 'Unknown', lastActive: now, token });
    }

    if (user.activeSessions.length > 5) user.activeSessions = user.activeSessions.slice(-5);

    if (!user.membership_id) {
        const basicMembership = await Membership.findOne({ name: MembershipName.BASIC });
        if (basicMembership) {
            user.membership_id = basicMembership._id;
            user.membershipStartDate = user.membershipStartDate || new Date();
        }
    }

    await user.save();

    await saveSession(user._id.toString(), token);

    await ActivityLog.create({
        user_id: user._id,
        action: ActivityAction.USER_LOGIN,
        timestamp: new Date()
    });

    eventBus.emitEvent(Events.USER_LOGIN, { userId: user._id.toString(), streakCount: user.streakCount });

    const userObj = user.toObject();
    delete (userObj as any).password;

    return { token, role: roleDoc.name, user: userObj };

};

export const forgotPassword = async (email: string) => {
    const user = await User.findOne({ email });
    if (!user) throw new NotFoundError('User not found');

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
        `Click here to reset: ${resetLink}`,
        getPasswordResetTemplate(user.name, resetLink)
    );

    return true;
};

export const verifyEmail = async (token: string) => {
    const user = await User.findOne({ verificationToken: token });
    if (!user) throw new BadRequestError('Invalid token');

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    return true;
};

export const resetPassword = async (token: string, password: string) => {
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
        throw new BadRequestError('Password must be at least 8 characters long and contain at least one uppercase letter, one number, and one special character');
    }

    const authToken = await AuthToken.findOne({
        token: token,
        type: 'password_reset',
        used: false,
        expires_at: { $gt: Date.now() },
    });

    if (!authToken) throw new BadRequestError('Invalid or expired token');

    const user = await User.findById(authToken.user_id);
    if (!user) throw new NotFoundError('User not found');

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();

    authToken.used = true;
    await authToken.save();

    return true;
};

export const googleLogin = async (credential: string, userAgent: string = 'Unknown Device') => {
    const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) throw new BadRequestError('Invalid Google token');

    const { sub, email, name, picture } = payload;

    let user = await User.findOne({
        $or: [{ googleId: sub }, { email }]
    }).populate('role_id');

    if (user && user.isDeleted) throw new ForbiddenError('This account has been deleted');

    if (!user) {
        const userRole = await Role.findOne({ name: RoleName.USER });
        if (!userRole) throw new NotFoundError('Default role not found');

        user = new User({
            name: name || 'Google User',
            email: email!,
            googleId: sub,
            isVerified: true,
            role_id: userRole._id,
            profileImage: picture,
        });

        const basicMembership = await Membership.findOne({ name: MembershipName.BASIC });
        if (basicMembership) {
            user.membership_id = basicMembership._id;
            user.membershipStartDate = new Date();
        }

        await user.save();
        user = await user.populate('role_id');

        await ActivityLog.create({
            user_id: user._id,
            action: ActivityAction.USER_REGISTERED,
            timestamp: new Date(),
            description: 'Registered via Google Login'
        });
    } else if (!user.googleId) {
        user.googleId = sub;
        if (!user.isVerified) user.isVerified = true;
        if (!user.profileImage) user.profileImage = picture;
        await user.save();
    }

    const roleDoc = user.role_id as IRole;
    const token = jwt.sign(
        { id: user._id, role: roleDoc.name },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
    );

    const now = new Date();
    user.lastLogin = now;
    if (!user.activeSessions) user.activeSessions = [];

    const existingSessionIndex = user.activeSessions.findIndex((s: any) => s.device === userAgent);
    if (existingSessionIndex !== -1) {
        user.activeSessions[existingSessionIndex].token = token;
        user.activeSessions[existingSessionIndex].lastActive = now;
    } else {
        user.activeSessions.push({ device: userAgent, location: 'Unknown', lastActive: now, token });
    }

    if (user.activeSessions.length > 5) user.activeSessions = user.activeSessions.slice(-5);

    await user.save();

    await saveSession(user._id.toString(), token);

    await ActivityLog.create({
        user_id: user._id,
        action: ActivityAction.USER_LOGIN,
        timestamp: new Date(),
        description: 'Logged in via Google'
    });

    eventBus.emitEvent(Events.USER_LOGIN, { userId: user._id.toString(), streakCount: user.streakCount || 1 });

    return { token, role: roleDoc.name, userId: user._id };
};
