import mongoose, { Document, Schema, Types } from 'mongoose';
import { IUser } from './User';
import { IBook } from './Book';

export interface IBorrow extends Document {
  user_id: Types.ObjectId | IUser;
  book_id: Types.ObjectId | IBook;
  issued_date: Date;
  return_date: Date; // due date
  returned_at?: Date; // actual return
  fine_amount?: number;
  isFinePaid: boolean;
  status: string; // 'borrowed', 'returned', 'overdue'
  renewed_count: number;
}

const borrowSchema = new Schema<IBorrow>({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  book_id: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
  issued_date: { type: Date, default: Date.now },
  return_date: { type: Date, required: true },
  returned_at: { type: Date },
  fine_amount: { type: Number, default: 0 },
  isFinePaid: { type: Boolean, default: false },
  status: { type: String, default: 'borrowed' },
  renewed_count: { type: Number, default: 0 },
});

export default mongoose.model<IBorrow>('Borrow', borrowSchema);
