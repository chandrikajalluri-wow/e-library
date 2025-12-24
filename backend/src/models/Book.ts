import mongoose, { Document, Schema, Types } from 'mongoose';
import { ICategory } from './Category';
import { IUser } from './User';

export interface IBook extends Document {
  title: string;
  author: string;
  pdf_url?: string;
  genre: string;
  language: string;
  rating: number;
  price: number;
  pages: number;
  description?: string;
  isbn: string;
  publishedYear: number;
  status: string; // 'available', 'issued', 'archived', 'damaged'
  category_id: Types.ObjectId | ICategory;
  addedBy: Types.ObjectId | IUser;
  createdAt: Date;
  updatedAt: Date;
  cover_image_url?: string;
  noOfCopies: number;
}

const bookSchema = new Schema<IBook>(
  {
    title: { type: String, required: true },
    author: { type: String, required: true },
    pdf_url: { type: String },
    genre: { type: String },
    language: { type: String },
    rating: { type: Number, default: 0 },
    price: { type: Number },
    pages: { type: Number },
    description: { type: String },
    isbn: { type: String, unique: true },
    publishedYear: { type: Number },
    status: { type: String, default: 'available' },
    category_id: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    addedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedAt: { type: Date, default: Date.now },
    cover_image_url: { type: String },
    noOfCopies: { type: Number, required: true, default: 1 },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model<IBook>('Book', bookSchema);
