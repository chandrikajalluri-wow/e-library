import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/authService';
import { BadRequestError } from '../utils/errors';
import { revokeSession, blacklistToken } from '../utils/sessionManager';
import { AuthRequest } from '../middleware/authMiddleware';

export const signup = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            throw new BadRequestError('Missing required fields');
        }

        await authService.signup(name, email, password);
        res.json({
            message: 'Signup successful. Please check your email to verify account.',
        });
    } catch (err) {
        next(err);
    }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;
        const result = await authService.login(email, password, req.headers['user-agent'] as string);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await authService.forgotPassword(req.body.email);
        res.json({ message: 'Reset link sent' });
    } catch (err) {
        next(err);
    }
};

export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await authService.verifyEmail(req.params.token);
        res.json({ message: 'Email verified successfully' });
    } catch (err) {
        next(err);
    }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await authService.resetPassword(req.params.token, req.body.password);
        res.json({ message: 'Password reset successful' });
    } catch (err) {
        next(err);
    }
};

export const googleLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await authService.googleLogin(req.body.credential, req.headers['user-agent'] as string);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const logout = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
        if (token && req.user) {
            await revokeSession(req.user._id.toString(), token);
            await blacklistToken(token, 7 * 24 * 60 * 60); // Blacklist for 7 days
        }

        res.json({ message: 'Logged out successfully' });
    } catch (err) {
        next(err);
    }
};
