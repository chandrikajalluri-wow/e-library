import mongoose, { Document, Schema, Types } from 'mongoose';

export interface INotification extends Document {
    type: 'borrow' | 'return' | 'wishlist';
    message: string;
    user_id: Types.ObjectId;
    book_id?: Types.ObjectId;
    is_read: boolean;
    timestamp: Date;
}

const notificationSchema = new Schema<INotification>({
    type: { type: String, enum: ['borrow', 'return', 'wishlist'], required: true },
    message: { type: String, required: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    book_id: { type: Schema.Types.ObjectId, ref: 'Book' },
    is_read: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now },
});

export default mongoose.model<INotification>('Notification', notificationSchema);
