import mongoose from 'mongoose';
import Book from './models/Book';
import { getS3FileStream } from './utils/s3Service';
import dotenv from 'dotenv';

dotenv.config();

const inspectBook = async (bookId: string) => {
    try {
        await mongoose.connect(process.env.MONGO_URI as string);
        console.log('Connected to DB');

        const book = await Book.findById(bookId);
        if (!book) {
            console.log('Book not found');
            process.exit(0);
        }

        console.log('Book Details:');
        console.log(`Title: ${book.title}`);
        console.log(`PDF URL: ${book.pdf_url}`);

        if (book.pdf_url) {
            try {
                const urlObject = new URL(book.pdf_url);
                const key = decodeURIComponent(urlObject.pathname.substring(1));
                console.log(`Extracted S3 Key: ${key}`);

                console.log('Testing S3 Fetch...');
                try {
                    const s3Response = await getS3FileStream(key);
                    console.log('S3 Fetch Success!');
                    console.log(`Content-Type: ${s3Response.ContentType}`);
                    console.log(`Content-Length: ${s3Response.ContentLength}`);
                } catch (s3Err: any) {
                    console.error('S3 Fetch Failed:', s3Err.message);
                    if (s3Err.name) console.error('Error Name:', s3Err.name);
                }
            } catch (urlErr: any) {
                console.log('Error parsing PDF URL:', (urlErr as Error).message);
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

const bookId = '694ac26ef62d5a8af84bf15d';
inspectBook(bookId);
