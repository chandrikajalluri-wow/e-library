import Notification from '../models/Notification';
import { Types } from 'mongoose';

export const sendNotification = async (
    type: 'borrow' | 'return' | 'wishlist',
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
