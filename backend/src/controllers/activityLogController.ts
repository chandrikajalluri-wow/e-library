import { Response } from 'express';
import ActivityLog from '../models/ActivityLog';
import { RoleName } from '../types/enums';
import { AuthRequest } from '../middleware/authMiddleware';
import Book from '../models/Book';
import Role from '../models/Role';
import User from '../models/User';

export const getActivityLogs = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Not authorized' });

        const { search, action, page, limit } = req.query;
        const pageNum = parseInt(page as string) || 1;
        const limitNum = parseInt(limit as string) || 20;
        const skip = (pageNum - 1) * limitNum;

        const query: any = {
            action: { $ne: 'ADMIN_INVITE_REJECTED' }
        };

        if (action && action !== 'all') {
            query.action = action;
        }

        // Filter by USER role at the database level for consistency
        const userRole = await Role.findOne({ name: RoleName.USER });
        if (userRole) {
            const userQuery: any = { role_id: userRole._id };
            if (search) {
                userQuery.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ];
            }
            const userIds = await User.find(userQuery).distinct('_id');
            query.user_id = { $in: userIds };
        }

        const totalLogs = await ActivityLog.countDocuments(query);

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
            .skip(skip)
            .limit(limitNum);

        res.json({
            logs,
            totalPages: Math.ceil(totalLogs / limitNum),
            currentPage: pageNum,
            totalLogs
        });
    } catch (err: unknown) {
        console.error('getActivityLogs error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};
