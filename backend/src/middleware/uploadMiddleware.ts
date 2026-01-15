import { Request } from 'express';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary';

const cloudinaryStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        // @ts-ignore
        folder: 'book-covers',
        public_id: (req: Request, file: Express.Multer.File) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            return `book_${file.fieldname}_${uniqueSuffix}`;
        },
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    },
});

const memoryStorage = multer.memoryStorage();

// Custom storage engine to route files based on fieldname
const combinedStorage: multer.StorageEngine = {
    _handleFile: (req, file, cb) => {
        if (file.fieldname === 'pdf') {
            memoryStorage._handleFile(req, file, cb);
        } else {
            cloudinaryStorage._handleFile(req, file, cb);
        }
    },
    _removeFile: (req, file, cb) => {
        if (file.fieldname === 'pdf') {
            memoryStorage._removeFile(req, file, cb);
        } else {
            cloudinaryStorage._removeFile(req, file, cb);
        }
    }
};

export const upload = multer({
    storage: combinedStorage,
    fileFilter: (req: Request, file: Express.Multer.File, cb: any) => {
        if (file.fieldname === 'pdf') {
            const isPdfMime = ['application/pdf', 'application/x-pdf'].includes(file.mimetype);
            const isPdfExt = file.originalname.toLowerCase().endsWith('.pdf');

            if (isPdfMime || isPdfExt) {
                cb(null, true);
            } else {
                cb(new Error('Only PDF files are allowed for the book content. Your file: ' + file.mimetype), false);
            }
        } else {
            // Images
            if (['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new Error('Only image files (jpg, jpeg, png, webp) are allowed'), false);
            }
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    }
});
