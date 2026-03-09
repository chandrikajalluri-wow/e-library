import { Request, Response, NextFunction } from 'express';
import { Readable } from 'stream';
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from '../utils/s3Service';
import { AuthRequest } from '../middleware/authMiddleware';
import { getS3FileStream } from '../utils/s3Service';
import * as catalogService from '../services/catalogService';
import { clearCache } from '../middleware/cacheMiddleware';

// --- Category Logic ---

export const getAllCategories = async (req: any, res: Response) => {
    try {
        const categories = await catalogService.getAllCategories();
        res.json(categories);
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const createCategory = async (req: any, res: Response) => {
    const { name, description } = req.body;
    try {
        const category = await catalogService.createCategory(name, description, req.user);
        await clearCache('cat:all');
        res.status(201).json(category);
    } catch (err: any) {
        console.error(err);
        if (err.message === 'Category already exists') {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Server error' });
    }
};

export const updateCategory = async (req: any, res: Response) => {
    const { name, description } = req.body;
    try {
        const category = await catalogService.updateCategory(req.params.id, name, description, req.user);
        await clearCache('cat:all');
        res.json(category);
    } catch (err: any) {
        console.error(err);
        if (err.message === 'Category not found') {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: 'Server error' });
    }
};

export const deleteCategory = async (req: any, res: Response) => {
    try {
        const result = await catalogService.deleteCategory(req.params.id, req.user);
        await clearCache('cat:all');
        res.json(result);
    } catch (err: any) {
        console.error(err);
        if (err.message === 'Category not found') {
            return res.status(404).json({ error: err.message });
        }
        if (err.message === 'Cannot delete category because there are books assigned to it.') {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Server error' });
    }
};

// --- Book Logic ---

export const getAllBooks = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const filters = {
            search: req.query.search,
            category: req.query.category,
            genre: req.query.genre,
            showArchived: req.query.showArchived,
            isPremium: req.query.isPremium,
            addedBy: req.query.addedBy,
            language: req.query.language,
            stock: req.query.stock
        };

        const pagination = {
            page: req.query.page ? parseInt(req.query.page as string) : undefined,
            limit: parseInt(req.query.limit as string) || 10,
            after: req.query.after as string
        };

        let sort: any = { _id: -1 };
        if (req.query.sort) {
            let sortStr = req.query.sort as string;
            // Map legacy createdAt/timestamp to _id for stable cursor pagination
            if (sortStr.includes('createdAt') || sortStr.includes('timestamp')) {
                sortStr = sortStr.replace('createdAt', '_id').replace('timestamp', '_id');
            }

            if (sortStr.startsWith('-')) {
                sort = { [sortStr.substring(1)]: -1 };
            } else {
                sort = { [sortStr]: 1 };
            }
        }

        const result = await catalogService.getAllBooks(filters, pagination, sort);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const getBookById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const book = await catalogService.getBookById(req.params.id);
        res.json(book);
    } catch (err) {
        next(err);
    }
};

export const createBook = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const book = await catalogService.createBook(req.body, req.files, req.user);
        res.status(201).json(book);
    } catch (err) {
        next(err);
    }
};

export const updateBook = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const book = await catalogService.updateBook(req.params.id, req.body, req.files, req.user);
        res.json(book);
    } catch (err) {
        next(err);
    }
};

export const deleteBook = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await catalogService.deleteBook(req.params.id, req.user);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const viewBookPdf = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const bookId = req.params.id;
        const book = await catalogService.validatePdfAccess(bookId, req.user);

        if (!book.pdf_url) {
            return res.status(404).json({ error: 'PDF not found for this book' });
        }

        let key = '';
        try {
            if (book.pdf_url.startsWith('http')) {
                const urlObject = new URL(book.pdf_url);
                key = decodeURIComponent(urlObject.pathname).replace(/^\/+/, '');
            } else {
                key = book.pdf_url.replace(/^\/+/, '');
            }

            const s3Response = await getS3FileStream(key);

            res.setHeader('Content-Type', s3Response.ContentType || 'application/pdf');
            res.setHeader('Content-Disposition', 'inline');
            res.setHeader('Accept-Ranges', 'bytes');

            if (s3Response.ContentLength) {
                res.setHeader('Content-Length', s3Response.ContentLength);
            }

            if (s3Response.Body) {
                (s3Response.Body as Readable).pipe(res);
            } else {
                res.status(404).json({ error: 'PDF content stream is empty' });
            }
        } catch (s3Err: any) {
            next(s3Err);
        }
    } catch (err) {
        next(err);
    }
};

export const getSimilarBooks = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const similarBooks = await catalogService.getSimilarBooks(req.params.id);
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

        try {
            await s3Client.send(new GetObjectCommand({
                Bucket: bucketName,
                Key: 'test-connection-dummy-key-' + Date.now()
            }));
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
        const recommendations = await catalogService.getRecommendedBooks(req.user);
        res.json(recommendations);
    } catch (err) {
        next(err);
    }
};

export const checkDeletionSafety = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await catalogService.checkDeletionSafety(req.params.id);
        res.json(result);
    } catch (err) {
        next(err);
    }
};
