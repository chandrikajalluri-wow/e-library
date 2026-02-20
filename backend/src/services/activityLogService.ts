import ActivityLog from '../models/ActivityLog';
import Role from '../models/Role';
import User from '../models/User';
import { RoleName, ActivityAction } from '../types/enums';

export const getActivityLogs = async (query: any) => {
    const { search, action, page, limit, role, sort } = query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 20;
    const sortOrder = sort === 'asc' ? 1 : -1;
    const skip = (pageNum - 1) * limitNum;

    const filter: any = {
        action: { $ne: 'ADMIN_INVITE_REJECTED' }
    };

    if (action && action !== 'all') {
        switch (action) {
            case ActivityAction.BOOK_CREATED:
                filter.$or = [{ action: ActivityAction.BOOK_CREATED }, { action: { $regex: /^Added new book:/i } }];
                delete filter.action;
                break;
            case ActivityAction.BOOK_UPDATED:
                filter.$or = [{ action: ActivityAction.BOOK_UPDATED }, { action: { $regex: /^Updated book:/i } }];
                delete filter.action;
                break;
            case ActivityAction.BOOK_DELETED:
                filter.$or = [{ action: ActivityAction.BOOK_DELETED }, { action: { $regex: /^Deleted book:/i } }];
                delete filter.action;
                break;
            case ActivityAction.CATEGORY_CREATED:
                filter.$or = [{ action: ActivityAction.CATEGORY_CREATED }, { action: { $regex: /^Created category:/i } }];
                delete filter.action;
                break;
            case ActivityAction.CATEGORY_UPDATED:
                filter.$or = [{ action: ActivityAction.CATEGORY_UPDATED }, { action: { $regex: /^Updated category:/i } }];
                delete filter.action;
                break;
            case ActivityAction.CATEGORY_DELETED:
                filter.$or = [{ action: ActivityAction.CATEGORY_DELETED }, { action: { $regex: /^Deleted category:/i } }];
                delete filter.action;
                break;
            case ActivityAction.ORDER_STATUS_UPDATED:
                filter.$or = [{ action: ActivityAction.ORDER_STATUS_UPDATED }, { action: 'Order Status Updated' }];
                delete filter.action;
                break;
            default:
                filter.action = action;
        }
    }

    // Role filtering logic
    const roleToFind = role === 'admin' ? [RoleName.ADMIN, RoleName.SUPER_ADMIN] : [RoleName.USER];
    const roles = await Role.find({ name: { $in: roleToFind } });
    const roleIds = roles.map(r => r._id);

    const userQuery: any = { role_id: { $in: roleIds } };
    if (search) {
        userQuery.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
        ];
    }
    const userIds = await User.find(userQuery).distinct('_id');
    filter.user_id = { $in: userIds };

    const totalLogs = await ActivityLog.countDocuments(filter);
    const logs = await ActivityLog.find(filter)
        .populate({
            path: 'user_id',
            select: 'name email membership_id role_id',
            populate: [
                { path: 'membership_id', select: 'name displayName' },
                { path: 'role_id', select: 'name' }
            ]
        })
        .populate('book_id', 'title')
        .sort({ timestamp: sortOrder })
        .skip(skip)
        .limit(limitNum);

    return {
        logs,
        totalPages: Math.ceil(totalLogs / limitNum),
        currentPage: pageNum,
        totalLogs
    };
};
