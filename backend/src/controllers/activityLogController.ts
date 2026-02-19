import { Response } from 'express';
import ActivityLog from '../models/ActivityLog';
import { RoleName, ActivityAction } from '../types/enums';
import { AuthRequest } from '../middleware/authMiddleware';
import Book from '../models/Book';
import Role from '../models/Role';
import User from '../models/User';

export const getActivityLogs = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Not authorized' });

        const { search, action, page, limit, role, sort } = req.query;
        const pageNum = parseInt(page as string) || 1;
        const limitNum = parseInt(limit as string) || 20;
        const sortOrder = sort === 'asc' ? 1 : -1;
        const skip = (pageNum - 1) * limitNum;

        const query: any = {
            action: { $ne: 'ADMIN_INVITE_REJECTED' }
        };

        if (action && action !== 'all') {
            switch (action) {
                case ActivityAction.BOOK_CREATED:
                    query.$or = [{ action: ActivityAction.BOOK_CREATED }, { action: { $regex: /^Added new book:/i } }];
                    delete query.action;
                    break;
                case ActivityAction.BOOK_UPDATED:
                    query.$or = [{ action: ActivityAction.BOOK_UPDATED }, { action: { $regex: /^Updated book:/i } }];
                    delete query.action;
                    break;
                case ActivityAction.BOOK_DELETED:
                    query.$or = [{ action: ActivityAction.BOOK_DELETED }, { action: { $regex: /^Deleted book:/i } }];
                    delete query.action;
                    break;
                case ActivityAction.CATEGORY_CREATED:
                    query.$or = [{ action: ActivityAction.CATEGORY_CREATED }, { action: { $regex: /^Created category:/i } }];
                    delete query.action;
                    break;
                case ActivityAction.CATEGORY_UPDATED:
                    query.$or = [{ action: ActivityAction.CATEGORY_UPDATED }, { action: { $regex: /^Updated category:/i } }];
                    delete query.action;
                    break;
                case ActivityAction.CATEGORY_DELETED:
                    query.$or = [{ action: ActivityAction.CATEGORY_DELETED }, { action: { $regex: /^Deleted category:/i } }];
                    delete query.action;
                    break;
                case ActivityAction.ORDER_STATUS_UPDATED:
                    query.$or = [{ action: ActivityAction.ORDER_STATUS_UPDATED }, { action: 'Order Status Updated' }];
                    delete query.action;
                    break;
                default:
                    query.action = action;
            }
        }

        // Handle role filtering
        if (role === 'admin') {
            const adminRole = await Role.findOne({ name: RoleName.ADMIN });
            const superAdminRole = await Role.findOne({ name: RoleName.SUPER_ADMIN });

            if (adminRole) {
                const adminQuery: any = {
                    role_id: adminRole._id
                };

                if (search) {
                    adminQuery.$or = [
                        { name: { $regex: search, $options: 'i' } },
                        { email: { $regex: search, $options: 'i' } }
                    ];
                }

                const adminIds = await User.find(adminQuery).distinct('_id');
                query.user_id = { $in: adminIds };
            }
        } else {
            // Default: Filter by USER role for consistency (old behavior)
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
            .sort({ timestamp: sortOrder })
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
