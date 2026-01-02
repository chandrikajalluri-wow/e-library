import express, { Request, Response } from 'express';
import Book from '../models/Book';
import { auth, checkRole, AuthRequest } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadMiddleware';
import ActivityLog from '../models/ActivityLog';

const router = express.Router();

// Get all books (Public, with filters)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, category, genre, showArchived } = req.query;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {};

    if (showArchived !== 'true') {
      query.status = { $ne: 'archived' };
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
      ];
    }
    if (category) query.category_id = category;
    if (genre) query.genre = genre;

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
  upload.single('cover_image'),
  async (req: AuthRequest, res: Response) => {
    try {
      const bookData = { ...req.body };

      if (req.file) {
        bookData.cover_image_url = (req.file as any).path;
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
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Update Book (Admin only)
router.put(
  '/:id',
  auth,
  checkRole(['admin']),
  upload.single('cover_image'),
  async (req: AuthRequest, res: Response) => {
    try {
      const bookData = { ...req.body };

      if (req.file) {
        bookData.cover_image_url = (req.file as any).path;
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
      res.status(500).json({ error: 'Server error' });
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
      res.status(500).json({ error: 'Server error' });
    }
  }
);

export default router;
