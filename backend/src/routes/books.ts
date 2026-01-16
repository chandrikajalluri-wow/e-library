import express, { Request, Response, NextFunction } from 'express';
import { Readable } from 'stream';
import Book from '../models/Book';
import User from '../models/User';
import Borrow from '../models/Borrow';
import { auth, checkRole, AuthRequest } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadMiddleware';
import { uploadToS3, getS3FileStream } from '../utils/s3Service';
import ActivityLog from '../models/ActivityLog';

const router = express.Router();

// Get all books (Public, with filters)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, category, genre, showArchived, isPremium, addedBy } = req.query;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {};

    if (addedBy) {
      query.addedBy = addedBy;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
      ];
    }
    if (category) {
      const categoryIds = (category as string).split(',');
      query.category_id = { $in: categoryIds };
    }
    if (genre) query.genre = genre;
    if (isPremium === 'true') query.isPremium = true;
    if (isPremium === 'false') query.isPremium = { $ne: true };

    if (showArchived !== 'true') {
      query.status = { $ne: 'archived' };
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const books = await Book.find(query)
      .populate('category_id', 'name')
      .populate('addedBy', 'name email')
      .sort({ createdAt: -1 })
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

// Create Book (Admin/Super Admin only)
router.post(
  '/',
  auth,
  checkRole(['admin', 'super_admin']),
  upload.fields([
    { name: 'cover_image', maxCount: 1 },
    { name: 'author_image', maxCount: 1 },
    { name: 'pdf', maxCount: 1 },
  ]),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const bookData = { ...req.body };

      // Handle addedBy: Super admin can override, Admin is fixed to themselves
      const userRole = (req.user!.role_id as any).name; // Assuming role_id is populated or has a 'name' property
      if (userRole === 'admin') {
        bookData.addedBy = req.user!._id;
      } else if (userRole === 'super_admin') {
        bookData.addedBy = req.body.addedBy || req.user!._id;
      } else {
        // Fallback or error if role is not admin/super_admin (should be caught by checkRole)
        bookData.addedBy = req.user!._id;
      }

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

      const book = new Book(bookData);
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

// Update Book (Admin/Super Admin only)
router.put(
  '/:id',
  auth,
  checkRole(['admin', 'super_admin']),
  upload.fields([
    { name: 'cover_image', maxCount: 1 },
    { name: 'author_image', maxCount: 1 },
    { name: 'pdf', maxCount: 1 },
  ]),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const bookData = { ...req.body };

      // Security: Admin cannot change addedBy. Super admin can.
      const userRole = (req.user!.role_id as any).name;
      if (userRole === 'admin') {
        delete bookData.addedBy; // Ensure admin cannot modify addedBy
      }
      // If super_admin, bookData.addedBy from req.body will be used if present.

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

// Delete Book (Admin/Super Admin only)
router.delete(
  '/:id',
  auth,
  checkRole(['admin', 'super_admin']),
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

// Download Book PDF (Standard and Premium members only)
router.get(
  '/:id/download',
  auth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const book = await Book.findById(req.params.id);
      if (!book) return res.status(404).json({ error: 'Book not found' });
      if (!book.pdf_url) return res.status(404).json({ error: 'PDF not available for this book' });

      // Populating membership to check name
      const user = await User.findById(req.user!._id).populate('membership_id');
      if (!user) return res.status(404).json({ error: 'User not found' });

      const membership = user.membership_id as any;
      const userRole = (req.user!.role_id as any).name;

      // Allow if user is admin OR has standard/premium membership
      const hasAccess = userRole === 'admin' || (membership && ['standard', 'premium'].includes(membership.name));

      if (!hasAccess) {
        return res.status(403).json({
          error: 'Download is only available for Standard and Premium members. Please upgrade your plan.'
        });
      }

      // Proxy the request to S3 and stream it to the client with attachment header
      try {
        const urlObject = new URL(book.pdf_url);
        const key = decodeURIComponent(urlObject.pathname.substring(1));

        const s3Response = await getS3FileStream(key);

        const fileName = `${book.title.replace(/\s+/g, '_')}.pdf`;

        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', s3Response.ContentType || 'application/pdf');

        if (s3Response.ContentLength) {
          res.setHeader('Content-Length', s3Response.ContentLength);
        }

        if (s3Response.Body) {
          (s3Response.Body as Readable).pipe(res);
        } else {
          res.status(404).json({ error: 'PDF content not found in storage' });
        }
      } catch (s3Err) {
        console.error('S3 Stream Error:', s3Err);
        res.status(500).json({ error: 'Failed to fetch PDF from storage' });
      }
    } catch (err) {
      next(err);
    }
  }
);

export default router;
