import { Request, Response } from 'express';
import * as communicationService from '../services/communicationService';

// --- Chat Logic ---

export const createOrGetSession = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user._id;
        const session = await communicationService.createOrGetSession(userId);
        res.status(200).json(session);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getSessionMessages = async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const messages = await communicationService.getSessionMessages(sessionId);
        res.status(200).json(messages);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getAllSessionsAdmin = async (req: Request, res: Response) => {
    try {
        const enhancedSessions = await communicationService.getAllSessionsAdmin();
        res.status(200).json(enhancedSessions);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const closeSession = async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const session = await communicationService.closeSession(sessionId);
        res.status(200).json(session);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// --- Contact Logic ---

export const submitContactForm = async (req: Request, res: Response) => {
    try {
        await communicationService.submitContactForm(req.body);
        res.json({ message: 'Message sent successfully. An automated response has been sent to your email.' });
    } catch (err: any) {
        console.error('Contact form error:', err);
        res.status(err.message === 'All fields are required' ? 400 : 500).json({ error: err.message });
    }
};
