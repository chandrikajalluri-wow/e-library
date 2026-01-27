import mongoose, { Document, Schema, Types } from 'mongoose';
import { IUser } from './User';
import { IBook } from './Book';

export interface IReview extends Document {
  user_id: Types.ObjectId | IUser;
  book_id: Types.ObjectId | IBook;
  rating: number; // 1-5
  comment?: string;
  likes: Types.ObjectId[];
  dislikes: Types.ObjectId[];
  reports: {
    user_id: Types.ObjectId;
    reason: string;
    reported_at: Date;
  }[];
  reviewed_at: Date;
  updated_at?: Date;
}

const reviewSchema = new Schema<IReview>({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  book_id: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String },
  likes: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
  dislikes: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
  reports: [
    {
      user_id: { type: Schema.Types.ObjectId, ref: 'User' },
      reason: { type: String },
      reported_at: { type: Date, default: Date.now },
    },
  ],
  reviewed_at: { type: Date, default: Date.now },
  updated_at: { type: Date },
});

export default mongoose.model<IReview>('Review', reviewSchema);
