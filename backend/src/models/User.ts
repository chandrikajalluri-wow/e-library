import mongoose, { Document, Schema, Types } from 'mongoose';
import { IRole } from './Role'; // your Role interface

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role_id: Types.ObjectId | IRole; // allow populated Role
  isVerified: boolean;
  verificationToken?: string;
  createdAt?: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role_id: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', userSchema);
