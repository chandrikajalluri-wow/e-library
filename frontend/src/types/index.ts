import { BookStatus, BorrowStatus, RoleName } from './enums';

export interface Category {
  _id: string;
  name: string;
  description?: string;
  bookCount?: number;
  addedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Membership {
  _id: string;
  name: string;
  displayName: string;
  price: number;
  borrowLimit: number;
  borrowDuration: number;
  canRequestBooks: boolean;
  canAccessPremiumBooks: boolean;
  hasRecommendations: boolean;
  description: string;
  features: string[];
}

export interface Book {
  _id: string;
  title: string;
  author: string;
  category_id: string | Category; // ID when sending, Object when populated
  price: number;
  status: BookStatus;
  isbn?: string;
  description?: string;
  pages?: number;
  publishedYear?: number;
  cover_image_url?: string;
  pdf_url?: string;
  genre?: string;
  language?: string;
  rating?: number;
  noOfCopies: number;
  isPremium?: boolean;
  addedBy?: string; // User ID
  createdAt?: string;
  updatedAt?: string;
  author_image_url?: string;
  author_description?: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: RoleName;
  profileImage?: string;
  favoriteGenres?: string[];
  booksRead?: number;
  readingTarget?: number;
  membershipStartDate?: string;
  membershipExpiryDate?: string;
  membership_id?: Membership | string;
}

export interface Borrow {
  _id: string;
  user_id: User; // Populated in admin view
  book_id: Book; // Populated in admin view
  issued_date?: string;
  return_date: string;
  returned_at?: string;
  status: BorrowStatus;
}

export interface WishlistItem {
  _id: string;
  user_id: string;
  book_id: Book;
  added_at: string;
  expectedReturnDate?: string;
}

export interface Review {
  _id: string;
  user_id: {
    _id: string;
    name: string;
  };
  book_id: string;
  rating: number;
  comment?: string;
  likes: string[];
  dislikes: string[];
  reports: {
    user_id: string;
    reason: string;
    reported_at: string;
  }[];
  reviewed_at: string;
  updated_at?: string;
}
