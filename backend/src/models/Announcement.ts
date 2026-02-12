import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAnnouncement extends Document {
    title: string;
    content: string;
    author: Types.ObjectId;
    type: 'INFO' | 'OFFER' | 'GREETING' | 'MAINTENANCE' | 'WARNING';
    targetPage: 'ALL' | 'USER' | 'HOME' | 'BOOKS' | 'DASHBOARD' | 'PROFILE' | 'ADMIN_PANEL';
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const announcementSchema = new Schema<IAnnouncement>(
    {
        title: { type: String, required: true },
        content: { type: String, required: true },
        author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        type: {
            type: String,
            enum: ['INFO', 'OFFER', 'GREETING', 'MAINTENANCE', 'WARNING'],
            default: 'INFO'
        },
        targetPage: {
            type: String,
            enum: ['ALL', 'USER', 'HOME', 'BOOKS', 'DASHBOARD', 'PROFILE', 'ADMIN_PANEL'],
            default: 'ALL'
        },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true, collection: 'announcements' }
);

export default mongoose.model<IAnnouncement>('Announcement', announcementSchema);
