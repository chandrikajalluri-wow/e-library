import express, { Request, Response, NextFunction } from 'express';
import Book from '../models/Book';
import Borrow from '../models/Borrow';
import { auth, checkRole, AuthRequest } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadMiddleware';
import { uploadToS3 } from '../utils/s3Service';
import ActivityLog from '../models/ActivityLog';

const router = express.Router();

// Get all books (Public, with filters)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
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
    next(err);
  }
});

// Get single book
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const book = await Book.findById(req.params.id).populate(
      'category_id',
      'name'
    );
    if (!book) return res.status(404).json({ error: 'Book not found' });
    res.json(book);
  } catch (err) {
    next(err);
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
    { name: 'pdf', maxCount: 1 },
  ]),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
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
      if (files?.['pdf']?.[0]) {
        const pdfFile = files['pdf'][0];
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const fileName = `${uniqueSuffix}_${pdfFile.originalname.replace(/\s+/g, '_')}`;
        bookData.pdf_url = await uploadToS3(pdfFile.buffer, fileName, pdfFile.mimetype);
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
      next(err);
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
    { name: 'pdf', maxCount: 1 },
  ]),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const bookData = { ...req.body };

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (files?.['cover_image']?.[0]) {
        bookData.cover_image_url = files['cover_image'][0].path;
      }
      if (files?.['author_image']?.[0]) {
        bookData.author_image_url = files['author_image'][0].path;
      }
      if (files?.['pdf']?.[0]) {
        const pdfFile = files['pdf'][0];
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const fileName = `${uniqueSuffix}_${pdfFile.originalname.replace(/\s+/g, '_')}`;
        bookData.pdf_url = await uploadToS3(pdfFile.buffer, fileName, pdfFile.mimetype);
      }

      const book = await Book.findByIdAndUpdate(req.params.id, bookData, {
        new: true,
        runValidators: true,
      });
      if (!book) return res.status(404).json({ error: 'Book not found' });

      // Log activity
      try {
        await new ActivityLog({
          user_id: req.user!._id,
          action: `Updated book: ${book.title}`,
          book_id: book._id,
        }).save();
      } catch (logErr) {
        console.error('Failed to log activity:', logErr);
        // Don't fail the request if logging fails
      }

      res.json(book);
    } catch (err) {
      next(err);
    }
  }
);

// Delete Book (Admin only)
router.delete(
  '/:id',
  auth,
  checkRole(['admin']),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
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
      next(err);
    }
  }
);

export default router;
