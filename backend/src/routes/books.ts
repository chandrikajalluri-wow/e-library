import express, { Request, Response } from 'express';
import Book from '../models/Book';
import Borrow from '../models/Borrow';
import { auth, checkRole, AuthRequest } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadMiddleware';
import ActivityLog from '../models/ActivityLog';

const router = express.Router();

// Get all books (Public, with filters)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, category, genre, showArchived, isPremium } = req.query;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {};

    if (showArchived !== 'true') {
      query.status = { $ne: 'archived' };
    }

    if (isPremium === 'true') query.isPremium = true;
    if (isPremium === 'false') query.isPremium = { $ne: true };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
      ];
    }
    if (category) query.category_id = category;
    if (genre) query.genre = genre;
    if (isPremium === 'true') query.isPremium = true;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const books = await Book.find(query)
      .populate('category_id', 'name')
      .skip(skip)
      .limit(limit);

    const total = await Book.countDocuments(query);

    res.json({
      books,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single book
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const book = await Book.findById(req.params.id).populate(
      'category_id',
      'name'
    );
    if (!book) return res.status(404).json({ error: 'Book not found' });
    res.json(book);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create Book (Admin only)
router.post(
  '/',
  auth,
  checkRole(['admin']),
  upload.fields([
    { name: 'cover_image', maxCount: 1 },
    { name: 'author_image', maxCount: 1 },
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const bookData = { ...req.body };

      // Multer adds 'files' object for multiple fields
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (files?.['cover_image']?.[0]) {
        bookData.cover_image_url = files['cover_image'][0].path;
      }
      if (files?.['author_image']?.[0]) {
        bookData.author_image_url = files['author_image'][0].path;
      }

      const book = new Book({
        ...bookData,
        addedBy: req.user!._id,
      });
      await book.save();

      // Log activity
      await new ActivityLog({
        user_id: req.user!._id,
        action: `Added new book: ${book.title}`,
        book_id: book._id,
      }).save();

      res.status(201).json(book);
    } catch (err) {
      console.log(err);
      res.status(500).json({ error: (err as any).message || 'Server error' });
    }
  }
);

// Update Book (Admin only)
router.put(
  '/:id',
  auth,
  checkRole(['admin']),
  upload.fields([
    { name: 'cover_image', maxCount: 1 },
    { name: 'author_image', maxCount: 1 },
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const bookData = { ...req.body };

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (files?.['cover_image']?.[0]) {
        bookData.cover_image_url = files['cover_image'][0].path;
      }
      if (files?.['author_image']?.[0]) {
        bookData.author_image_url = files['author_image'][0].path;
      }

      const book = await Book.findByIdAndUpdate(req.params.id, bookData, {
        new: true,
      });
      if (!book) return res.status(404).json({ error: 'Book not found' });

      // Log activity
      await new ActivityLog({
        user_id: req.user!._id,
        action: `Updated book: ${book.title}`,
        book_id: book._id,
      }).save();

      res.json(book);
    } catch (err) {
      console.log(err);
      res.status(500).json({ error: (err as any).message || 'Server error' });
    }
  }
);

// Delete Book (Admin only)
router.delete(
  '/:id',
  auth,
  checkRole(['admin']),
  async (req: AuthRequest, res: Response) => {
    try {
      // Check if book is currently borrowed
      const activeBorrow = await Borrow.findOne({
        book_id: req.params.id,
        status: { $in: ['borrowed', 'overdue', 'return_requested'] }
      });

      if (activeBorrow) {
        return res.status(400).json({
          error: 'Cannot delete book because it is currently borrowed by a user.'
        });
      }

      const book = await Book.findByIdAndDelete(req.params.id);
      if (!book) return res.status(404).json({ error: 'Book not found' });

      // Log activity
      await new ActivityLog({
        user_id: req.user!._id,
        action: `Deleted book: ${book.title}`,
        book_id: book._id,
      }).save();

      res.json({ message: 'Book deleted' });
    } catch (err) {
      console.log(err);
      res.status(500).json({ error: (err as any).message || 'Server error' });
    }
  }
);

export default router;
