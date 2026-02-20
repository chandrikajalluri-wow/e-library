import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import * as activityLogService from '../services/activityLogService';

export const getActivityLogs = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Not authorized' });
        const result = await activityLogService.getActivityLogs(req.query);
        res.json(result);
    } catch (err: any) {
        console.error('getActivityLogs error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

