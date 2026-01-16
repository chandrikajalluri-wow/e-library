import mongoose, { Document, Schema, Types } from 'mongoose';
import { IUser } from './User';

export interface ICategory extends Document {
  name: string;
  description?: string;
  addedBy: Types.ObjectId | IUser;
  createdAt: Date;
}

const categorySchema = new Schema<ICategory>({
  name: { type: String, required: true },
  description: { type: String },
  addedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<ICategory>('Category', categorySchema);
