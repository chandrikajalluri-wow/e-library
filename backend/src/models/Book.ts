import mongoose, { Document, Schema, Types } from 'mongoose';
import { ICategory } from './Category';
import { IUser } from './User';
import { BookStatus } from '../types/enums';

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
  status: BookStatus;
  category_id: Types.ObjectId | ICategory;
  addedBy: Types.ObjectId | IUser;
  createdAt: Date;
  updatedAt: Date;
  cover_image_url?: string;
  author_image_url?: string;
  author_description?: string;
  noOfCopies: number;
  isPremium: boolean; // Premium collection flag
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
    status: { type: String, enum: Object.values(BookStatus), default: BookStatus.AVAILABLE },
    category_id: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    addedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedAt: { type: Date, default: Date.now },
    cover_image_url: { type: String },
    author_image_url: { type: String },
    author_description: { type: String },
    noOfCopies: { type: Number, required: true, default: 1 },
    isPremium: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: 'books' }
);

// --- Indexes ---
// Compound: browsing by category + filtering archived books (most common query)
bookSchema.index({ category_id: 1, status: 1 });

// Compound: admin dashboard - filter by who added the book + status/date
bookSchema.index({ addedBy: 1, createdAt: -1 });

// Sort/filter by popular metrics
bookSchema.index({ rating: -1 });
bookSchema.index({ isPremium: 1, status: 1 });

// Language filter (used in BookList filters)
bookSchema.index({ language: 1 });

// Full-text search index for title, author, and description
bookSchema.index({ title: 'text', author: 'text', description: 'text' }, {
  weights: { title: 10, author: 5, description: 1 },
  name: 'book_text_search'
});

// Single-field for author lookups (similar books, author filters)
bookSchema.index({ author: 1 });

export default mongoose.model<IBook>('Book', bookSchema);
