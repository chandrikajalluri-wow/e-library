import mongoose, { Document, Schema, Types } from 'mongoose';
import { IUser } from './User';
import { IBook } from './Book';

export interface IActivityLog extends Document {
  user_id: Types.ObjectId | IUser;
  action: string;
  timestamp: Date;
  book_id?: Types.ObjectId | IBook;
  ip_address?: string;
  device_info?: string;
}

const activityLogSchema = new Schema<IActivityLog>({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  book_id: { type: Schema.Types.ObjectId, ref: 'Book' }, // optional
  ip_address: { type: String },
  device_info: { type: String },
}, { collection: 'activity_logs' });

export default mongoose.model<IActivityLog>('ActivityLog', activityLogSchema);
