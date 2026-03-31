import request from 'supertest';
import app from '../../src/app';
import Category from '../../src/models/Category';
import Book from '../../src/models/Book';
import User from '../../src/models/User';
import Role from '../../src/models/Role';
import Quiz from '../../src/models/Quiz';
import QuizAttempt from '../../src/models/QuizAttempt';
import { RoleName, BookStatus } from '../../src/types/enums';
import mongoose from 'mongoose';
import * as aiService from '../../src/services/aiService';

jest.mock('../../src/utils/s3Service', () => ({
    s3Client: { send: jest.fn() },
    getS3FileStream: jest.fn(),
    uploadToS3: jest.fn().mockResolvedValue('http://mock-s3-url.com/file.pdf'),
}));

jest.mock('../../src/utils/sessionManager', () => ({
    ...jest.requireActual('../../src/utils/sessionManager'),
    isValidSession: jest.fn().mockResolvedValue(true),
    isTokenBlacklisted: jest.fn().mockResolvedValue(false),
}));

jest.mock('../../src/config/redis', () => ({
    __esModule: true,
    default: {
        set: jest.fn().mockResolvedValue('OK'),
        get: jest.fn().mockResolvedValue(null),
        del: jest.fn().mockResolvedValue(1),
        exists: jest.fn().mockResolvedValue(1),
        keys: jest.fn().mockResolvedValue([]),
    },
}));

describe('Quiz API Integration Tests', () => {
    let token: string;
    let userId: mongoose.Types.ObjectId;
    let categoryId: string;
    let bookId: string;
    let quizId: string;

    beforeEach(async () => {
        const userRole = await Role.create({ name: RoleName.USER, description: 'Basic User' });
        const user = await User.create({
            name: 'Test User',
            email: 'testuser@example.com',
            password: 'hashedpassword',
            role_id: userRole._id,
            isVerified: true,
        });
        userId = user._id as mongoose.Types.ObjectId;

        const jwt = require('jsonwebtoken');
        token = jwt.sign(
            { id: userId.toString(), role: RoleName.USER },
            process.env.JWT_SECRET || 'test_secret',
            { expiresIn: '7d' }
        );

        const category = await Category.create({
            name: 'Science Fiction',
            description: 'Sci-Fi books',
            addedBy: userId,
        });
        categoryId = category._id.toString();

        const book = await Book.create({
            title: 'Dune',
            author: 'Frank Herbert',
            isbn: '1234567890',
            category_id: categoryId,
            addedBy: userId,
            noOfCopies: 5,
            status: BookStatus.AVAILABLE,
        });
        bookId = book._id.toString();

        const quiz = await Quiz.create({
            book_id: bookId,
            questions: [
                {
                    questionText: 'Who wrote Dune?',
                    options: ['Isaac Asimov', 'Frank Herbert', 'Arthur C. Clarke', 'Philip K. Dick'],
                    correctOptionIndex: 1,
                    explanation: 'Frank Herbert wrote Dune in 1965.'
                },
                {
                    questionText: 'What is the most valuable resource?',
                    options: ['Water', 'Spice', 'Gold', 'Oil'],
                    correctOptionIndex: 1,
                    explanation: 'Spice Melange is the most valuable substance.'
                }
            ]
        });
        quizId = quiz._id.toString();
        
        jest.spyOn(aiService, 'generateQuizForBook').mockResolvedValue([
            {
                questionText: 'Mock generated question?',
                options: ['A', 'B', 'C', 'D'],
                correctOptionIndex: 0,
                explanation: 'Mock generated explanation.'
            }
        ]);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('GET /api/quizzes/book/:bookId', () => {
        it('should return the quiz without correct answers', async () => {
            const res = await request(app)
                .get(`/api/quizzes/book/${bookId}`);
            
            expect(res.status).toBe(200);
            expect(res.body.questions.length).toBe(2);
            expect(res.body.questions[0].correctOptionIndex).toBeUndefined();
            expect(res.body.questions[0].explanation).toBeUndefined();
            expect(res.body.questions[0].questionText).toBe('Who wrote Dune?');
        });

        it('should return 404 for a book without a quiz if book does not exist', async () => {
            const emptyBookId = new mongoose.Types.ObjectId().toString();
            const res = await request(app)
                .get(`/api/quizzes/book/${emptyBookId}`);
            
            expect(res.status).toBe(404);
        });

        it('should generate a quiz for a valid book without a quiz (lazy load)', async () => {
            // Create a book with no quiz
            const newBook = await Book.create({
                title: 'New Book',
                author: 'Author',
                isbn: '0987654321',
                category_id: categoryId,
                addedBy: userId,
                noOfCopies: 5,
                status: BookStatus.AVAILABLE,
            });

            const res = await request(app)
                .get(`/api/quizzes/book/${newBook._id}`);
            
            expect(res.status).toBe(200);
            expect(res.body.questions.length).toBe(1);
            expect(res.body.questions[0].questionText).toBe('Mock generated question?');
            
            // Should also be saved to DB
            const savedQuiz = await Quiz.findOne({ book_id: newBook._id });
            expect(savedQuiz).toBeTruthy();
        });
    });

    describe('POST /api/quizzes/:quizId/submit', () => {
        it('should submit a quiz successfully and calculate the score', async () => {
            const res = await request(app)
                .post(`/api/quizzes/${quizId}/submit`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    answers: [1, 0], // Correct, Wrong
                    timeSpentSeconds: 45
                });
            
            expect(res.status).toBe(200);
            expect(res.body.scorecard.score).toBe(1);
            expect(res.body.scorecard.totalQuestions).toBe(2);
            expect(res.body.scorecard.correct).toBe(1);
            expect(res.body.scorecard.wrong).toBe(1);
            expect(res.body.scorecard.attempted).toBe(2);
            expect(res.body.feedback.length).toBe(2);
            expect(res.body.feedback[0].isCorrect).toBe(true);
            expect(res.body.feedback[1].isCorrect).toBe(false);

            // Check if attempt is saved
            const attempts = await QuizAttempt.find({ user_id: userId, book_id: bookId });
            expect(attempts.length).toBe(1);
            expect(attempts[0].score).toBe(1);
        });
    });

    describe('GET /api/quizzes/attempts/book/:bookId', () => {
        it('should return user previous attempts', async () => {
            // Create an attempt
            await QuizAttempt.create({
                user_id: userId,
                book_id: bookId,
                quiz_id: quizId,
                score: 2,
                totalQuestions: 2,
                answers: [1, 1],
                timeSpentSeconds: 30
            });

            const res = await request(app)
                .get(`/api/quizzes/attempts/book/${bookId}`)
                .set('Authorization', `Bearer ${token}`);
            
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(1);
            expect(res.body[0].score).toBe(2);
        });
    });
});
