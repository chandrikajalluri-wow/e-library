import mongoose, { Document, Schema, Types } from 'mongoose';
import { IUser } from './User';

export interface IAuthToken extends Document {
  user_id: Types.ObjectId | IUser;
  token: string;
  type: string; // 'password_reset', 'session', 'refresh'
  created_at: Date;
  expires_at: Date;
  used: boolean;
}

const authTokenSchema = new Schema<IAuthToken>({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  expires_at: { type: Date, required: true },
  used: { type: Boolean, default: false },
}, { collection: 'auth_tokens' });

export default mongoose.model<IAuthToken>('AuthToken', authTokenSchema);
