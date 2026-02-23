import mongoose, { Document, Schema, Types } from 'mongoose';
import { RequestStatus } from '../types/enums';

export interface IBookRequest extends Document {
    user_id: Types.ObjectId;
    title: string;
    author: string;
    reason?: string;
    status: RequestStatus;
    book_id?: Types.ObjectId; // Link to the book if approved and created
    createdAt: Date;
}

const bookRequestSchema = new Schema<IBookRequest>({
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    author: { type: String, required: true },
    reason: { type: String },
    status: { type: String, enum: Object.values(RequestStatus), default: RequestStatus.PENDING },
    book_id: { type: Schema.Types.ObjectId, ref: 'Book' },
    createdAt: { type: Date, default: Date.now },
}, { collection: 'book_requests' });

export default mongoose.model<IBookRequest>('BookRequest', bookRequestSchema);
