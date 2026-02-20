import { Request, Response } from 'express';
import * as chatService from '../services/chatService';

export const createOrGetSession = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user._id;
        const session = await chatService.createOrGetSession(userId);
        res.status(200).json(session);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getSessionMessages = async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const messages = await chatService.getSessionMessages(sessionId);
        res.status(200).json(messages);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getAllSessionsAdmin = async (req: Request, res: Response) => {
    try {
        const enhancedSessions = await chatService.getAllSessionsAdmin();
        res.status(200).json(enhancedSessions);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const closeSession = async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const session = await chatService.closeSession(sessionId);
        res.status(200).json(session);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

