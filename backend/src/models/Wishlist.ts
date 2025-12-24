import mongoose, { Document, Schema, Types } from 'mongoose';
import { IUser } from './User';
import { IBook } from './Book';

export interface IWishlist extends Document {
  user_id: Types.ObjectId | IUser;
  book_id: Types.ObjectId | IBook;
  added_at: Date;
}

const wishlistSchema = new Schema<IWishlist>({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  book_id: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
  added_at: { type: Date, default: Date.now },
});

export default mongoose.model<IWishlist>('Wishlist', wishlistSchema);
