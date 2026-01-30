import Notification from '../models/Notification';
import User from '../models/User';
import Role from '../models/Role';
import { Types } from 'mongoose';
import { RoleName } from '../types/enums';

export const sendNotification = async (
    type: 'borrow' | 'return' | 'wishlist' | 'system',
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

export const notifySuperAdmins = async (message: string, type: 'system' | 'borrow' | 'return' = 'system') => {
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

export const notifyAllUsers = async (message: string, type: 'system' | 'borrow' | 'return' | 'wishlist' = 'system', book_id?: string | Types.ObjectId) => {
    try {
        // Find all users with RoleName.USER
        // We assume 'User' role is for standard users. Assuming we want to notify ALL registered users including admins?
        // Usually "Users" means everyone.

        const users = await User.find().select('_id');

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
