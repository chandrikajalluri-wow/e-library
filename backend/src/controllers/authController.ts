import { Request, Response } from 'express';
import * as authService from '../services/authService';

export const signup = async (req: Request, res: Response) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        await authService.signup(name, email, password);
        res.json({
            message: 'Signup successful. Please check your email to verify account.',
        });
    } catch (err: any) {
        console.error(err);
        if (err.message.includes('Invalid email') || err.message.includes('Password must') || err.message.includes('already exists')) {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Server error' });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        const result = await authService.login(email, password, req.headers['user-agent']);
        res.json(result);
    } catch (err: any) {
        console.error(err);
        if (err.message === 'Invalid credentials' || err.message === 'This account has been deleted' || err.notVerified) {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Server error' });
    }
};

export const forgotPassword = async (req: Request, res: Response) => {
    try {
        await authService.forgotPassword(req.body.email);
        res.json({ message: 'Reset link sent' });
    } catch (err: any) {
        console.error(err);
        if (err.message === 'User not found') return res.status(400).json({ error: err.message });
        res.status(500).json({ error: 'Server error' });
    }
};

export const verifyEmail = async (req: Request, res: Response) => {
    try {
        await authService.verifyEmail(req.params.token);
        res.json({ message: 'Email verified successfully' });
    } catch (err: any) {
        console.error(err);
        if (err.message === 'Invalid token') return res.status(400).json({ error: err.message });
        res.status(500).json({ error: 'Server error' });
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    try {
        await authService.resetPassword(req.params.token, req.body.password);
        res.json({ message: 'Password reset successful' });
    } catch (err: any) {
        console.error(err);
        if (err.message.includes('Password must') || err.message.includes('Invalid or expired') || err.message === 'User not found') {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Server error' });
    }
};

export const googleLogin = async (req: Request, res: Response) => {
    try {
        const result = await authService.googleLogin(req.body.credential, req.headers['user-agent']);
        res.json(result);
    } catch (err: any) {
        console.error(err);
        if (err.message === 'Invalid Google token' || err.message === 'This account has been deleted') {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Google authentication failed' });
    }
};

