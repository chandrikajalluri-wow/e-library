import express, { Request, Response } from 'express';
import ActivityLog from '../models/ActivityLog';
import { auth, checkRole } from '../middleware/authMiddleware';

const router = express.Router();

// Get Logs (Admin)
router.get(
  '/',
  auth,
  checkRole(['admin']),
  async (req: Request, res: Response) => {
    try {
      const logs = await ActivityLog.find()
        .populate('user_id', 'name email')
        .sort({ timestamp: -1 })
        .limit(100);
      res.json(logs);
    } catch (err: unknown) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

export default router;
