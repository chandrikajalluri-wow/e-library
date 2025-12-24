import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGO_URI as string;

const bookSchema = new mongoose.Schema({
  title: String,
  status: String,
  addedBy: { type: mongoose.Schema.Types.ObjectId, required: true },
  category_id: { type: mongoose.Schema.Types.ObjectId, required: true },
});

const Book = mongoose.model('Book', bookSchema);

async function run() {
  try {
    await mongoose.connect(uri);
    console.log('Connected to DB');

    const books = await Book.find({});
    console.log(`Found ${books.length} books total.`);

    let invalidCount = 0;
    for (const book of books) {
      const validationError = book.validateSync();
      if (validationError) {
        console.error(
          `[INVALID] Book "${book.title}" (ID: ${book._id}) is invalid:`,
          validationError.message
        );
        invalidCount++;
      }
    }

    if (invalidCount === 0) {
      console.log('All books are valid according to schema.');
    } else {
      console.log(`Found ${invalidCount} invalid books.`);
    }
  } catch (e) {
    console.error('Script error:', e);
  } finally {
    await mongoose.disconnect();
  }
}

run();
