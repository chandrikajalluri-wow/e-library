import { Request, Response, NextFunction } from 'express';
import { Readable } from 'stream';
import Book from '../models/Book';
import User from '../models/User';
import Borrow from '../models/Borrow';
import { AuthRequest } from '../middleware/authMiddleware';
import { uploadToS3, getS3FileStream } from '../utils/s3Service';
import ActivityLog from '../models/ActivityLog';
import { RoleName, BookStatus, BorrowStatus, MembershipName } from '../types/enums';

export const getAllBooks = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { search, category, genre, showArchived, isPremium, addedBy } = req.query;
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
            query.status = { $ne: BookStatus.ARCHIVED };
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        let sortOption: any = { createdAt: -1 };
        if (req.query.sort) {
            const sortStr = req.query.sort as string;
            if (sortStr.startsWith('-')) {
                sortOption = { [sortStr.substring(1)]: -1 };
            } else {
                sortOption = { [sortStr]: 1 };
            }
        }

        const books = await Book.find(query)
            .populate('category_id', 'name')
            .populate('addedBy', 'name email')
            .sort(sortOption)
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
};

export const getBookById = async (req: Request, res: Response, next: NextFunction) => {
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
};

export const createBook = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { title } = req.body;

        if (title) {
            const existingBook = await Book.findOne({
                title: { $regex: new RegExp(`^${title.trim()}$`, 'i') }
            });
            if (existingBook) {
                return res.status(400).json({ error: `A book with the title "${title}" already exists.` });
            }
        }

        const bookData = { ...req.body };

        const userRole = (req.user!.role_id as any).name;
        if (userRole === RoleName.ADMIN) {
            bookData.addedBy = req.user!._id;
        } else if (userRole === RoleName.SUPER_ADMIN) {
            bookData.addedBy = req.body.addedBy || req.user!._id;
        } else {
            bookData.addedBy = req.user!._id;
        }

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

        await new ActivityLog({
            user_id: req.user!._id,
            action: `Added new book: ${book.title}`,
            book_id: book._id,
        }).save();

        res.status(201).json(book);
    } catch (err) {
        next(err);
    }
};

export const updateBook = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const bookData = { ...req.body };

        const userRole = (req.user!.role_id as any).name;
        if (userRole === 'admin') {
            delete bookData.addedBy;
        }

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

        try {
            await new ActivityLog({
                user_id: req.user!._id,
                action: `Updated book: ${book.title}`,
                book_id: book._id,
            }).save();
        } catch (logErr) {
            console.error('Failed to log activity:', logErr);
        }

        res.json(book);
    } catch (err) {
        next(err);
    }
};

export const deleteBook = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const activeBorrow = await Borrow.findOne({
            book_id: req.params.id,
            status: { $in: [BorrowStatus.BORROWED, BorrowStatus.OVERDUE, BorrowStatus.RETURN_REQUESTED] }
        });

        if (activeBorrow) {
            return res.status(400).json({
                error: 'Cannot delete book because it is currently borrowed by a user.'
            });
        }

        const book = await Book.findByIdAndDelete(req.params.id);
        if (!book) return res.status(404).json({ error: 'Book not found' });

        await new ActivityLog({
            user_id: req.user!._id,
            action: `Deleted book: ${book.title}`,
            book_id: book._id,
        }).save();

        res.json({ message: 'Book deleted' });
    } catch (err) {
        next(err);
    }
};

export const viewBookPdf = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ error: 'Book not found' });
        if (!book.pdf_url) return res.status(404).json({ error: 'PDF not available for this book' });

        try {
            // Robust key extraction
            let key: string;
            try {
                const urlObject = new URL(book.pdf_url);
                // Remove leading slash and handle potential double slashes
                key = decodeURIComponent(urlObject.pathname).replace(/^\/+/, '');
            } catch (urlErr) {
                // Fallback if it's already a key or relative path
                key = book.pdf_url.replace(/^\/+/, '');
            }

            console.log(`[viewBookPdf] Attempting to fetch PDF from S3. Book: ${book.title}, ID: ${req.params.id}, Key: ${key}`);

            const s3Response = await getS3FileStream(key);

            // Set headers for inline viewing (not download)
            res.setHeader('Content-Type', s3Response.ContentType || 'application/pdf');
            res.setHeader('Content-Disposition', 'inline');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Authorization');
            res.setHeader('Accept-Ranges', 'bytes');

            if (s3Response.ContentLength) {
                res.setHeader('Content-Length', s3Response.ContentLength);
            }

            if (s3Response.Body) {
                (s3Response.Body as Readable).pipe(res);
            } else {
                console.error(`[viewBookPdf] PDF content not found in S3 for key: ${key}`);
                res.status(404).json({ error: 'PDF content not found in storage' });
            }
        } catch (s3Err: any) {
            console.error(`[viewBookPdf] S3 Stream Error for book ${req.params.id}:`, s3Err);
            const statusCode = s3Err.name === 'NoSuchKey' ? 404 : 500;
            const message = s3Err.name === 'NoSuchKey' ? 'PDF file not found in storage' : 'Failed to fetch PDF from storage';
            res.status(statusCode).json({
                error: message,
                details: process.env.NODE_ENV === 'development' ? s3Err.message : undefined
            });
        }
    } catch (err) {
        next(err);
    }
};

export const getSimilarBooks = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const book = await Book.findById(id);

        if (!book) {
            return res.status(404).json({ error: 'Book not found' });
        }

        const similarBooks = await Book.find({
            _id: { $ne: id },
            $or: [
                { genre: book.genre },
                { author: book.author }
            ],
            status: { $ne: BookStatus.ARCHIVED }
        })
            .limit(5)
            .populate('category_id', 'name');

        res.json(similarBooks);
    } catch (err) {
        next(err);
    }
};


export const getRecommendedBooks = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!._id;

        // 1. Get User Preference & History
        // Re-fetch user to ensure we have latest favoriteGenres
        const user = await User.findById(userId);
        const userBorrows = await Borrow.find({ user_id: userId }).populate('book_id');

        // 2. Extract Genres & Authors from history
        const borrowedBookIds = new Set<string>();
        const genres = new Set<string>(); // String genres
        const authors = new Set<string>();
        const preferredCategoryIds = new Set<string>(); // Category ObjectIds

        // Add User's explicitly set favorite genres (Categories)
        if (user && user.favoriteGenres) {
            user.favoriteGenres.forEach((catId: any) => preferredCategoryIds.add(catId.toString()));
        }

        userBorrows.forEach((borrow: any) => {
            if (borrow.book_id) {
                borrowedBookIds.add(borrow.book_id._id.toString());
                if (borrow.book_id.genre) genres.add(borrow.book_id.genre);
                if (borrow.book_id.author) authors.add(borrow.book_id.author);
                // Also add borrowed book categories to preferences
                if (borrow.book_id.category_id) preferredCategoryIds.add(borrow.book_id.category_id.toString());
            }
        });

        // 3. Find Recommendations
        // If no history AND no favorites, return empty
        if (borrowedBookIds.size === 0 && preferredCategoryIds.size === 0) {
            return res.json([]);
        }

        const recommendations = await Book.find({
            _id: { $nin: Array.from(borrowedBookIds) }, // Exclude read books
            $or: [
                { genre: { $in: Array.from(genres) } },
                { author: { $in: Array.from(authors) } },
                { category_id: { $in: Array.from(preferredCategoryIds) } }
            ],
            status: { $ne: BookStatus.ARCHIVED }
        })
            .limit(8)
            .populate('category_id', 'name');

        res.json(recommendations);
    } catch (err) {
        next(err);
    }
};
