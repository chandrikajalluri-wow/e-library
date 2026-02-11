import { Response } from 'express';
import ActivityLog from '../models/ActivityLog';
import { RoleName } from '../types/enums';
import { AuthRequest } from '../middleware/authMiddleware';
import Book from '../models/Book';

export const getActivityLogs = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Not authorized' });

        const query: any = {};
        const userRole = (req.user.role_id as any).name;

        // Enforce seller isolation for regular Admins
        if (userRole === RoleName.ADMIN) {
            const adminBooks = await Book.find({ addedBy: req.user._id }).select('_id');
            const adminBookIds = adminBooks.map(b => b._id);

            // Only show logs related to this admin's books
            query.book_id = { $in: adminBookIds };
        }

        const logs = await ActivityLog.find(query)
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
            .populate('book_id', 'title')
            .sort({ timestamp: -1 })
            .limit(200);

        const userLogs = logs.filter(log => {
            const user = log.user_id as any;
            return user?.role_id?.name === RoleName.USER;
        });

        res.json(userLogs.slice(0, 100));
    } catch (err: unknown) {
        console.error('getActivityLogs error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};
