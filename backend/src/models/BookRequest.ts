import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IBookRequest extends Document {
    user_id: Types.ObjectId;
    title: string;
    author: string;
    reason?: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: Date;
}

const bookRequestSchema = new Schema<IBookRequest>({
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    author: { type: String, required: true },
    reason: { type: String },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IBookRequest>('BookRequest', bookRequestSchema);
