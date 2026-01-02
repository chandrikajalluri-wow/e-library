import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary';

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        // @ts-ignore
        folder: 'book-covers',
        id: (req, file) => `book_${Date.now()}`,
        allowed_formats: ['jpg', 'png', 'jpeg'],
    },
});

export const upload = multer({ storage: storage });
