import Notification from '../models/Notification';
import User from '../models/User';
import Role from '../models/Role';
import { Types } from 'mongoose';
import { RoleName } from '../types/enums';

export const sendNotification = async (
    type: 'borrow' | 'return' | 'wishlist' | 'system' | 'order' | 'book_request',
    message: string,
    user_id: string | Types.ObjectId,
    book_id?: string | Types.ObjectId
) => {
    try {
        const notification = new Notification({
            type,
            message,
            user_id,
            book_id,
        });
        await notification.save();
    } catch (error) {
        console.error('Error sending notification:', error);
    }
};

export const notifyAdmins = async (message: string, type: 'system' | 'borrow' | 'return' | 'order' | 'book_request' | 'wishlist' = 'system') => {
    try {
        // Find both Admin and Super Admin roles
        const roles = await Role.find({ name: { $in: [RoleName.ADMIN, RoleName.SUPER_ADMIN] } });
        const roleIds = roles.map(r => r._id);

        const admins = await User.find({ role_id: { $in: roleIds } });

        const notifications = admins.map(admin => ({
            user_id: admin._id,
            message,
            type,
            timestamp: new Date(),
            is_read: false
        }));

        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }
    } catch (err) {
        console.error('Error notifying admins:', err);
    }
};

export const notifySuperAdmins = async (message: string, type: 'system' | 'borrow' | 'return' | 'order' | 'book_request' = 'system') => {
    try {
        const superAdminRole = await Role.findOne({ name: RoleName.SUPER_ADMIN });
        if (!superAdminRole) return;

        const superAdmins = await User.find({ role_id: superAdminRole._id });

        const notifications = superAdmins.map(admin => ({
            user_id: admin._id,
            message,
            type
        }));

        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }
    } catch (err) {
        console.error('Error notifying super admins:', err);
    }
};

export const notifyAllUsers = async (
    message: string,
    type: 'system' | 'borrow' | 'return' | 'wishlist' = 'system',
    book_id?: string | Types.ObjectId,
    targetRole?: RoleName
) => {
    try {
        const query: any = {};
        if (targetRole) {
            const role = await Role.findOne({ name: targetRole });
            if (role) {
                query.role_id = role._id;
            }
        }

        const users = await User.find(query).select('_id');

        if (users.length === 0) return;

        const notifications = users.map(user => ({
            user_id: user._id,
            message,
            type,
            book_id,
            timestamp: new Date(),
            is_read: false
        }));

        // Batch insert
        await Notification.insertMany(notifications);
    } catch (err) {
        console.error('Error notifying all users:', err);
    }
};
