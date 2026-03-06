import request from 'supertest';
import app from '../../src/app';
import Category from '../../src/models/Category';
import Book from '../../src/models/Book';
import User from '../../src/models/User';
import Role from '../../src/models/Role';
import { RoleName, BookStatus } from '../../src/types/enums';
import mongoose from 'mongoose';

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

jest.mock('../../src/utils/notification', () => ({
    notifySuperAdmins: jest.fn().mockResolvedValue(true),
    notifyAllUsers: jest.fn().mockResolvedValue(true),
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

describe('Catalog Integration Tests', () => {
    let adminToken: string;
    let adminId: mongoose.Types.ObjectId;
    let categoryId: string;

    beforeEach(async () => {
        const adminRole = await Role.create({ name: RoleName.ADMIN, description: 'Admin' });
        const adminUser = await User.create({
            name: 'Admin User',
            email: 'admin@example.com',
            password: 'hashedpassword',
            role_id: adminRole._id,
            isVerified: true,
        });
        adminId = adminUser._id as mongoose.Types.ObjectId;

        const jwt = require('jsonwebtoken');
        adminToken = jwt.sign(
            { id: adminId.toString(), role: RoleName.ADMIN },
            'test_secret',
            { expiresIn: '7d' }
        );

        const category = await Category.create({
            name: 'Science Fiction',
            description: 'Sci-Fi books',
            addedBy: adminId,
        });
        categoryId = category._id.toString();
    });

    describe('GET /api/categories', () => {
        it('should return all categories', async () => {
            const res = await request(app).get('/api/categories');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(1);
            expect(res.body[0].name).toBe('Science Fiction');
        });
    });

    describe('GET /api/books', () => {
        it('should return books with pagination', async () => {
            await Book.create({
                title: 'Dune',
                author: 'Frank Herbert',
                isbn: '1234567890',
                category_id: categoryId,
                addedBy: adminId,
                noOfCopies: 5,
                status: BookStatus.AVAILABLE,
            });

            const res = await request(app).get('/api/books');
            expect(res.status).toBe(200);
            expect(res.body.books).toBeDefined();
            expect(res.body.books.length).toBe(1);
            expect(res.body.books[0].title).toBe('Dune');
        });
    });
});
