import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAnnouncement extends Document {
    title: string;
    content: string;
    author: Types.ObjectId;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const announcementSchema = new Schema<IAnnouncement>(
    {
        title: { type: String, required: true },
        content: { type: String, required: true },
        author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export default mongoose.model<IAnnouncement>('Announcement', announcementSchema);
