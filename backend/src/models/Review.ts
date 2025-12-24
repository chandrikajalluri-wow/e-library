import mongoose, { Document, Schema, Types } from 'mongoose';
import { IUser } from './User';
import { IBook } from './Book';

export interface IReview extends Document {
  user_id: Types.ObjectId | IUser;
  book_id: Types.ObjectId | IBook;
  rating: number; // 1-5
  comment?: string;
  reviewed_at: Date;
  updated_at?: Date;
}

const reviewSchema = new Schema<IReview>({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  book_id: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String },
  reviewed_at: { type: Date, default: Date.now },
  updated_at: { type: Date },
});

export default mongoose.model<IReview>('Review', reviewSchema);
