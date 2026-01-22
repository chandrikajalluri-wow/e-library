import mongoose, { Document, Schema, Types } from 'mongoose';
import { IUser } from './User';
import { IBook } from './Book';
import { BorrowStatus } from '../types/enums';

export interface IBorrow extends Document {
  user_id: Types.ObjectId | IUser;
  book_id: Types.ObjectId | IBook;
  issued_date: Date;
  return_date: Date; // due date
  returned_at?: Date; // actual return
  fine_amount?: number;
  isFinePaid: boolean;
  status: BorrowStatus;
  last_page: number;
  bookmarks: number[];
}

const borrowSchema = new Schema<IBorrow>({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  book_id: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
  issued_date: { type: Date, default: Date.now },
  return_date: { type: Date, required: true },
  returned_at: { type: Date },
  fine_amount: { type: Number, default: 0 },
  isFinePaid: { type: Boolean, default: false },
  status: { type: String, enum: Object.values(BorrowStatus), default: BorrowStatus.BORROWED },
  last_page: { type: Number, default: 1 },
  bookmarks: { type: [Number], default: [] },
});

export default mongoose.model<IBorrow>('Borrow', borrowSchema);
