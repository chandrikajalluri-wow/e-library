import mongoose, { Schema, Document } from 'mongoose';
import { RoleName } from '../types/enums';

export interface IRole extends Document {
  name: RoleName;
  description?: string;
  createdAt?: Date;
}

const roleSchema = new Schema<IRole>(
  {
    name: { type: String, enum: Object.values(RoleName), required: true, unique: true },
    description: String,
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model<IRole>('Role', roleSchema);
