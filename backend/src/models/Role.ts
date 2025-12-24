import mongoose, { Schema, Document } from 'mongoose';

export interface IRole extends Document {
  name: string; // "user" or "admin"
  description?: string;
  createdAt?: Date;
}

const roleSchema = new Schema<IRole>(
  {
    name: { type: String, required: true, unique: true },
    description: String,
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model<IRole>('Role', roleSchema);
