import mongoose, { Document, Schema, Types } from 'mongoose';
import { RequestStatus } from '../types/enums';

export interface IBookRequest extends Document {
    user_id: Types.ObjectId;
    title: string;
    author: string;
    reason?: string;
    status: RequestStatus;
    createdAt: Date;
}

const bookRequestSchema = new Schema<IBookRequest>({
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    author: { type: String, required: true },
    reason: { type: String },
    status: { type: String, enum: Object.values(RequestStatus), default: RequestStatus.PENDING },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IBookRequest>('BookRequest', bookRequestSchema);
