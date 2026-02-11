import mongoose, { Document, Schema, Types } from 'mongoose';
import { NotificationType } from '../types/enums';

export interface INotification extends Document {
    type: NotificationType;
    message: string;
    user_id: Types.ObjectId;
    book_id?: Types.ObjectId;
    target_id?: string;
    is_read: boolean;
    timestamp: Date;
}

const notificationSchema = new Schema<INotification>({
    type: { type: String, enum: Object.values(NotificationType), required: true },
    message: { type: String, required: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    book_id: { type: Schema.Types.ObjectId, ref: 'Book' },
    target_id: { type: String },
    is_read: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now },
});

export default mongoose.model<INotification>('Notification', notificationSchema);
