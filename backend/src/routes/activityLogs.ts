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
        .populate({
          path: 'user_id',
          select: 'name email membership_id role_id',
          populate: [
            {
              path: 'membership_id',
              select: 'name displayName'
            },
            {
              path: 'role_id',
              select: 'name'
            }
          ]
        })
        .sort({ timestamp: -1 })
        .limit(200);

      // Filter to show only admin actions
      const adminLogs = logs.filter(log => {
        const user = log.user_id as any;
        return user?.role_id?.name === 'admin' || user?.role_id?.name === 'super_admin';
      });

      res.json(adminLogs.slice(0, 100));
    } catch (err: unknown) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

export default router;
