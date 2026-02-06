import { Request, Response } from 'express';
import ChatSession, { SessionStatus } from '../models/ChatSession';
import ChatMessage from '../models/ChatMessage';

export const createOrGetSession = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user._id;

        // Find existing open session for this user
        let session = await ChatSession.findOne({
            user_id: userId,
            status: { $ne: SessionStatus.CLOSED }
        }).populate('admin_id', 'name profileImage');

        if (!session) {
            session = await ChatSession.create({
                user_id: userId,
                status: SessionStatus.OPEN
            });
        }

        res.status(200).json(session);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getSessionMessages = async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const messages = await ChatMessage.find({ session_id: sessionId })
            .sort({ createdAt: 1 })
            .populate('sender_id', 'name profileImage role_id');

        res.status(200).json(messages);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getAllSessionsAdmin = async (req: Request, res: Response) => {
    try {
        const sessions = await ChatSession.find()
            .populate('user_id', 'name email profileImage')
            .populate('admin_id', 'name')
            .populate('lastMessage')
            .sort({ updatedAt: -1 });

        res.status(200).json(sessions);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const closeSession = async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const session = await ChatSession.findByIdAndUpdate(
            sessionId,
            { status: SessionStatus.CLOSED },
            { new: true }
        );
        res.status(200).json(session);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
