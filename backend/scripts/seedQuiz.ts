import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Book from '../src/models/Book';
import Quiz from '../src/models/Quiz';

dotenv.config();

const seedQuiz = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI as string);
        console.log('Connected to MongoDB');

        // Find a random book to attach the quiz to
        const book = await Book.findOne().sort({ createdAt: -1 });

        if (!book) {
            console.log('No books found in the database. Add a book first.');
            process.exit(0);
        }

        // Check if book already has a quiz
        const existingQuiz = await Quiz.findOne({ book_id: book._id });
        if (existingQuiz) {
            console.log(`Book "${book.title}" already has a quiz. Try opening that book.`);
            process.exit(0);
        }

        const newQuiz = new Quiz({
            book_id: book._id,
            questions: [
                {
                    questionText: 'What is the main theme of this book?',
                    options: ['Adventure', 'Discovery', 'Romance', 'Mystery'],
                    correctOptionIndex: 1,
                    explanation: 'The book heavily emphasizes the journey of discovery.'
                },
                {
                    questionText: 'Which of these is a key element in the story?',
                    options: ['Magic wands', 'Spaceships', 'Ancient artifacts', 'Time travel'],
                    correctOptionIndex: 2,
                    explanation: 'The characters spend a lot of time analyzing ancient artifacts.'
                },
                {
                    questionText: 'How does the protagonist usually solve problems?',
                    options: ['Physical combat', 'Logic and reasoning', 'Asking for help', 'Running away'],
                    correctOptionIndex: 1,
                    explanation: 'The protagonist prefers using logic to overcome obstacles.'
                }
            ]
        });

        await newQuiz.save();
        console.log(`✅ Successfully seeded a quiz for the book: "${book.title}"`);
        console.log(`Open Book details page for "${book.title}" to see the "Take Quiz" button!`);
    } catch (err) {
        console.error('Error seeding quiz:', err);
    } finally {
        mongoose.disconnect();
        process.exit(0);
    }
};

seedQuiz();
