import { Request } from 'express';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary';

const storage = new CloudinaryStorage({
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

export const upload = multer({ storage: storage });
