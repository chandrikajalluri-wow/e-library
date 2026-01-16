import mongoose, { Document, Schema, Types } from 'mongoose';
import { IRole } from './Role'; // your Role interface
import { IMembership } from './Membership';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role_id: Types.ObjectId | IRole; // allow populated Role
  membership_id: Types.ObjectId | IMembership; // allow populated Membership
  isVerified: boolean;
  verificationToken?: string;
  profileImage?: string;
  favoriteBook?: string;
  favoriteAuthor?: string;
  booksRead?: number;
  readingTarget?: number;
  streakCount?: number;
  lastLogin?: Date;
  activeSessions?: {
    device: string;
    location: string;
    lastActive: Date;
    token: string;
  }[];
  createdAt?: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role_id: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    membership_id: { type: Schema.Types.ObjectId, ref: 'Membership' },
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String },
    profileImage: { type: String },
    favoriteBook: { type: String },
    favoriteAuthor: { type: String },
    booksRead: { type: Number, default: 0 },
    readingTarget: { type: Number, default: 0 },
    streakCount: { type: Number, default: 0 },
    lastLogin: { type: Date },
    activeSessions: [
      {
        device: { type: String },
        location: { type: String },
        lastActive: { type: Date, default: Date.now },
        token: { type: String },
      },
    ],
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', userSchema);
