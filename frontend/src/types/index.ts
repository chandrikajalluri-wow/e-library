export interface Category {
  _id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Book {
  _id: string;
  title: string;
  author: string;
  category_id: string | Category; // ID when sending, Object when populated
  price: number;
  status: string; // "available" | "issued" | "archived" | "damaged"
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
  role: string;
}

export interface Borrow {
  _id: string;
  user_id: User; // Populated in admin view
  book_id: Book; // Populated in admin view
  issued_date?: string;
  return_date: string;
  returned_at?: string;
  status: string; // "borrowed" | "returned" | "overdue"
  fine_amount?: number;
}

export interface WishlistItem {
  _id: string;
  user_id: string;
  book_id: Book;
  added_at: string;
  expectedReturnDate?: string;
}
