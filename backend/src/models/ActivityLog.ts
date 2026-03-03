import mongoose, { Document, Schema, Types } from 'mongoose';
import { IUser } from './User';
import { IBook } from './Book';

export interface IActivityLog extends Document {
  user_id?: Types.ObjectId | IUser;
  action: string;
  description?: string;
  timestamp: Date;
  book_id?: Types.ObjectId | IBook;
  ip_address?: string;
  device_info?: string;
}

const activityLogSchema = new Schema<IActivityLog>({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: false },
  action: { type: String, required: true },
  description: { type: String },
  timestamp: { type: Date, default: Date.now },
  book_id: { type: Schema.Types.ObjectId, ref: 'Book' },
  ip_address: { type: String },
  device_info: { type: String },
}, { collection: 'activity_logs' });

// --- Indexes ---
// Fetch logs for a specific user, sorted by time (most common query)
activityLogSchema.index({ user_id: 1, timestamp: -1 });

// Filter by action type (e.g., admin filtering BOOK_CREATED logs)
activityLogSchema.index({ action: 1 });

// TTL Index: Auto-delete activity logs older than 90 days to prevent bloat
activityLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export default mongoose.model<IActivityLog>('ActivityLog', activityLogSchema);
