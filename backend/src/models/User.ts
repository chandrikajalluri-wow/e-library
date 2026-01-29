import mongoose, { Document, Schema, Types } from 'mongoose';
import { IRole } from './Role'; // your Role interface
import { IMembership } from './Membership';
import { UserTheme } from '../types/enums';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  googleId?: string;
  role_id: Types.ObjectId | IRole; // allow populated Role
  membership_id: Types.ObjectId | IMembership; // allow populated Membership
  membershipStartDate?: Date;
  membershipExpiryDate?: Date;
  deletionScheduledAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  isVerified: boolean;
  verificationToken?: string;
  profileImage?: string;
  favoriteGenres?: Types.ObjectId[];
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
  theme?: UserTheme;
  cart?: {
    book_id: Types.ObjectId;
    quantity: number;
  }[];
  createdAt?: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false },
    phone: { type: String, required: false },
    googleId: { type: String, sparse: true },
    role_id: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    membership_id: { type: Schema.Types.ObjectId, ref: 'Membership' },
    membershipStartDate: { type: Date },
    membershipExpiryDate: { type: Date },
    deletionScheduledAt: { type: Date },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String },
    profileImage: { type: String },
    favoriteGenres: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
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
    theme: { type: String, enum: Object.values(UserTheme), default: UserTheme.LIGHT },
    cart: [
      {
        book_id: { type: Schema.Types.ObjectId, ref: 'Book' },
        quantity: { type: Number, default: 1 }
      }
    ],
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', userSchema);
