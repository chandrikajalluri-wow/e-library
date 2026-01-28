import mongoose from 'mongoose';
import Book from './models/Book';
import dotenv from 'dotenv';
import { getS3FileStream } from './utils/s3Service';

dotenv.config();

const inspectBook = async (bookId: string) => {
    try {
        await mongoose.connect(process.env.MONGO_URI as string);
        console.log('Connected to DB');

        const book = await Book.findById(bookId);
        if (!book) {
            console.log(`Book with ID ${bookId} not found in database.`);
            process.exit(0);
        }

        console.log('Book Details:');
        console.log(`Title: ${book.title}`);
        console.log(`PDF URL: ${book.pdf_url}`);

        if (book.pdf_url) {
            let key;
            try {
                const urlObject = new URL(book.pdf_url);
                key = decodeURIComponent(urlObject.pathname).replace(/^\/+/, '');
                console.log(`Extracted S3 Key: ${key}`);

                console.log('Testing S3 connectivity for this key...');
                try {
                    const s3Response = await getS3FileStream(key);
                    console.log('S3 Fetch Success!');
                    console.log(`Content-Type: ${s3Response.ContentType}`);
                } catch (s3Err: any) {
                    console.error('S3 Fetch Failed:', s3Err.message);
                    console.error('Error Name:', s3Err.name);
                }
            } catch (urlErr: any) {
                console.log('Error parsing PDF URL:', urlErr.message);
            }
        } else {
            console.log('PDF URL is missing');
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

const bookId = '694abc84f62d5a8af84bf0f2'; // ID from the browser log
inspectBook(bookId);
