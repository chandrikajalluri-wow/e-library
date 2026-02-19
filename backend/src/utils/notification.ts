import Notification from '../models/Notification';
import User from '../models/User';
import Role from '../models/Role';
import Book from '../models/Book';
import { Types } from 'mongoose';
import { RoleName, NotificationType } from '../types/enums';

export const sendNotification = async (
    type: NotificationType | string,
    message: string,
    user_id: string | Types.ObjectId,
    book_id?: string | Types.ObjectId,
    target_id?: string
) => {
    try {
        const notification = new Notification({
            type,
            message,
            user_id,
            book_id,
            target_id
        });
        await notification.save();
    } catch (error) {
        console.error('Error sending notification:', error);
    }
};

export const notifyAdmins = async (
    message: string,
    type: NotificationType | string = NotificationType.SYSTEM,
    affectedBookIds?: string | string[] | Types.ObjectId | Types.ObjectId[],
    target_id?: string
) => {
    try {
        // Find only Admin role (exclude Super Admin to reduce noise)
        const roles = await Role.find({ name: RoleName.ADMIN });
        const roleIds = roles.map(r => r._id);

        // All admins now receive all notifications
        let query: any = { role_id: { $in: roleIds } };

        const admins = await User.find(query);

        const notifications = admins.map(admin => ({
            user_id: admin._id,
            message,
            type,
            target_id,
            timestamp: new Date(),
            is_read: false,
            book_id: Array.isArray(affectedBookIds) ? affectedBookIds[0] : affectedBookIds
        }));

        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }
    } catch (err) {
        console.error('Error notifying admins:', err);
    }
};

export const notifySuperAdmins = async (
    message: string,
    type: NotificationType | string = NotificationType.SYSTEM,
    target_id?: string
) => {
    try {
        const superAdminRole = await Role.findOne({ name: RoleName.SUPER_ADMIN });
        if (!superAdminRole) return;

        const superAdmins = await User.find({ role_id: superAdminRole._id });

        const notifications = superAdmins.map(admin => ({
            user_id: admin._id,
            message,
            type,
            target_id,
            timestamp: new Date(),
            is_read: false
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
    type: NotificationType | string = NotificationType.SYSTEM,
    book_id?: string | Types.ObjectId,
    targetRole?: RoleName,
    target_id?: string
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
            target_id,
            timestamp: new Date(),
            is_read: false
        }));

        // Batch insert
        await Notification.insertMany(notifications);
    } catch (err) {
        console.error('Error notifying all users:', err);
    }
};
