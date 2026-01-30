import { Request, Response, NextFunction } from 'express';
import { Readable } from 'stream';
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from '../utils/s3Service';
import Book from '../models/Book';
import User from '../models/User';
import Borrow from '../models/Borrow';
import { AuthRequest } from '../middleware/authMiddleware';
import { uploadToS3, getS3FileStream } from '../utils/s3Service';
import ActivityLog from '../models/ActivityLog';
import { notifySuperAdmins, notifyAllUsers } from '../utils/notification';
import { RoleName, BookStatus, BorrowStatus, MembershipName } from '../types/enums';

export const getAllBooks = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { search, category, genre, showArchived, isPremium, addedBy, language } = req.query;
        const query: any = {};

        if (addedBy) {
            query.addedBy = addedBy;
        }

        if (language) {
            query.language = { $regex: new RegExp(`^${language}$`, 'i') };
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

        if (userRole === RoleName.ADMIN) {
            await notifySuperAdmins(`Admin ${req.user!.name} added a new book: ${book.title}`);
        }

        // Notify all users about the new book
        await notifyAllUsers(`New Addition: "${book.title}" is now available!`, 'system', book._id);

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

            if (userRole === RoleName.ADMIN) {
                await notifySuperAdmins(`Admin ${req.user!.name} updated book: ${book.title}`);
            }
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

        if ((req.user!.role_id as any).name === RoleName.ADMIN) {
            await notifySuperAdmins(`Admin ${req.user!.name} deleted book: ${book.title}`);
        }

        res.json({ message: 'Book deleted' });
    } catch (err) {
        next(err);
    }
};

export const viewBookPdf = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const bookId = req.params.id;
        console.log(`[viewBookPdf] DIAGNOSTIC: Request received for book ID: ${bookId}`);

        const book = await Book.findById(bookId);
        if (!book) {
            console.error(`[viewBookPdf] DIAGNOSTIC: Book not found in database: ${bookId}`);
            return res.status(404).json({ error: 'Book not found in database', bookId });
        }

        console.log(`[viewBookPdf] DIAGNOSTIC: Book found: "${book.title}"`);
        console.log(`[viewBookPdf] DIAGNOSTIC: Book PDF URL: "${book.pdf_url}"`);

        if (!book.pdf_url) {
            console.error(`[viewBookPdf] DIAGNOSTIC: pdf_url is empty for book: "${book.title}"`);
            return res.status(404).json({ error: 'PDF URL is missing for this book' });
        }


        // Check premium access
        if (book.isPremium) {
            const user = await User.findById(req.user!._id).populate('role_id').populate('membership_id');
            const userRole = (user?.role_id as any)?.name;
            const membership = user?.membership_id as any;

            if (userRole !== RoleName.ADMIN && userRole !== RoleName.SUPER_ADMIN && !membership?.canAccessPremiumBooks) {
                return res.status(403).json({ error: 'This is a premium book. Upgrade to Premium membership to read this book.' });
            }
        }


        let key = '';

        try {
            // Robust key extraction
            try {
                // Check if it's already an S3 URL
                if (book.pdf_url.startsWith('http')) {
                    const urlObject = new URL(book.pdf_url);
                    // Remove leading slash and handle potential double slashes
                    key = decodeURIComponent(urlObject.pathname).replace(/^\/+/, '');
                } else {
                    // Assume it's a relative path or direct key
                    key = book.pdf_url.replace(/^\/+/, '');
                }
            } catch (urlErr) {
                key = book.pdf_url.replace(/^\/+/, '');
            }

            console.log(`[viewBookPdf] DIAGNOSTIC: Extracted S3 Key: "${key}"`);
            console.log(`[viewBookPdf] DIAGNOSTIC: Using Bucket: "${process.env.AWS_S3_BUCKET_NAME}"`);

            const s3Response = await getS3FileStream(key);

            console.log(`[viewBookPdf] DIAGNOSTIC: S3 Stream received. Status: ${s3Response.$metadata.httpStatusCode}`);
            console.log(`[viewBookPdf] DIAGNOSTIC: Content-Type: ${s3Response.ContentType}, Content-Length: ${s3Response.ContentLength}`);

            // Set headers for inline viewing
            res.setHeader('Content-Type', s3Response.ContentType || 'application/pdf');
            res.setHeader('Content-Disposition', 'inline');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Authorization');
            res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
            res.setHeader('Accept-Ranges', 'bytes');

            if (s3Response.ContentLength) {
                res.setHeader('Content-Length', s3Response.ContentLength);
            }

            if (s3Response.Body) {
                (s3Response.Body as Readable).pipe(res);
                console.log(`[viewBookPdf] DIAGNOSTIC: Streaming PDF content started`);
            } else {
                console.error(`[viewBookPdf] DIAGNOSTIC: S3 Body is empty for key: ${key}`);
                res.status(404).json({ error: 'PDF content stream is empty' });
            }
        } catch (s3Err: any) {
            console.error(`[viewBookPdf] DIAGNOSTIC: S3 Error:`, {
                name: s3Err.name,
                message: s3Err.message,
                code: s3Err.code,
                statusCode: s3Err.$metadata?.httpStatusCode
            });

            const statusCode = s3Err.name === 'NoSuchKey' ? 404 : (s3Err.$metadata?.httpStatusCode || 500);
            const message = s3Err.name === 'NoSuchKey' ? 'PDF file not found in S3 storage' : `S3 Error: ${s3Err.message}`;

            res.status(statusCode).json({
                error: message,
                s3Key: key || 'unknown',
                s3Error: s3Err.name
            });
        }
    } catch (err: any) {
        console.error(`[viewBookPdf] DIAGNOSTIC: Unexpected failure:`, err);
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



export const testS3Config = async (req: Request, res: Response) => {
    try {
        const bucketName = process.env.AWS_S3_BUCKET_NAME;
        const region = process.env.AWS_REGION;
        const accessKey = process.env.AWS_ACCESS_KEY_ID;
        const hasSecret = !!process.env.AWS_SECRET_ACCESS_KEY;

        const results: any = {
            env: {
                AWS_S3_BUCKET_NAME: bucketName ? 'Set' : 'MISSING',
                AWS_REGION: region ? region : 'MISSING (Defaults to ap-south-1)',
                AWS_ACCESS_KEY_ID: accessKey ? `Set (${accessKey.substring(0, 5)}...)` : 'MISSING',
                AWS_SECRET_ACCESS_KEY: hasSecret ? 'Set' : 'MISSING'
            }
        };

        if (!bucketName || !accessKey || !hasSecret) {
            return res.status(500).json({
                error: 'S3 Configuration Incomplete',
                details: results.env
            });
        }

        // Test one simple list operation or get
        try {
            await s3Client.send(new GetObjectCommand({
                Bucket: bucketName,
                Key: 'test-connection-dummy-key-' + Date.now()
            }));
            // We expect NoSuchKey error if connection is ok
        } catch (s3Err: any) {
            results.s3Test = {
                connected: true,
                message: s3Err.name === 'NoSuchKey' ? 'Connected (Bucket exists and credentials work)' : 'Possible issue',
                errorName: s3Err.name,
                errorMessage: s3Err.message
            };

            if (s3Err.name === 'CredentialsError' || s3Err.name === 'InvalidAccessKeyId' || s3Err.name === 'AccessDenied') {
                results.s3Test.connected = false;
                results.s3Test.message = 'Authentication or Permission Failed';
            }
        }

        res.json(results);
    } catch (err: any) {
        res.status(500).json({ error: 'Diagnostic Failed', details: err.message });
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
