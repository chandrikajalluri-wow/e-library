import request from 'supertest';
import mongoose from 'mongoose';

// Mock mailer and sessionManager exactly like auth.test.ts
jest.mock('../../src/utils/mailer', () => ({
    sendEmail: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../src/utils/sessionManager', () => ({
    ...jest.requireActual('../../src/utils/sessionManager'),
    isValidSession: jest.fn().mockResolvedValue(true),
    isTokenBlacklisted: jest.fn().mockResolvedValue(false),
    saveSession: jest.fn().mockResolvedValue(true),
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

jest.mock('../../src/utils/notification', () => ({
    sendNotification: jest.fn().mockResolvedValue(true),
    notifyAdmins: jest.fn().mockResolvedValue(true),
}));

import app from '../../src/app';
import User from '../../src/models/User';
import Role from '../../src/models/Role';
import Book from '../../src/models/Book';
import Category from '../../src/models/Category';
import Address from '../../src/models/Address';
import Order from '../../src/models/Order';
import Membership from '../../src/models/Membership';
import { RoleName, BookStatus, MembershipName } from '../../src/types/enums';

describe('Orders Integration Tests', () => {
    let userToken: string;
    let userId: mongoose.Types.ObjectId;
    let bookId: mongoose.Types.ObjectId;
    let addressId: mongoose.Types.ObjectId;

    beforeEach(async () => {
        const userRole = await Role.findOneAndUpdate(
            { name: RoleName.USER },
            { name: RoleName.USER, description: 'User' },
            { upsert: true, new: true }
        );

        const basicMembership = await Membership.findOneAndUpdate(
            { name: MembershipName.BASIC },
            {
                name: MembershipName.BASIC,
                displayName: 'Basic',
                price: 0,
                monthlyLimit: 5,
                accessDuration: 30,
                description: 'Basic Membership',
            },
            { upsert: true, new: true }
        );

        const user = await User.create({
            name: 'Regular User',
            email: 'user@example.com',
            password: 'hashedpassword',
            role_id: userRole._id,
            membership_id: basicMembership._id,
            isVerified: true,
        });
        userId = user._id as mongoose.Types.ObjectId;

        const jwt = require('jsonwebtoken');
        process.env.JWT_SECRET = 'test_secret';
        userToken = jwt.sign(
            { id: userId.toString(), role: RoleName.USER },
            'test_secret',
            { expiresIn: '7d' }
        );

        const category = await Category.create({ name: 'Fiction', addedBy: userId });
        const book = await Book.create({
            title: 'The Great Gatsby',
            author: 'F. Scott Fitzgerald',
            isbn: '1112223334',
            category_id: category._id,
            addedBy: userId,
            noOfCopies: 5,
            price: 200,
            status: BookStatus.AVAILABLE,
        });
        bookId = book._id as mongoose.Types.ObjectId;

        const address = await Address.create({
            user_id: userId,
            phoneNumber: '1234567890',
            street: '123 Test St',
            city: 'Test City',
            state: 'Test State',
            zipCode: '12345',
            country: 'Test Country',
        });
        addressId = address._id as mongoose.Types.ObjectId;
    });

    describe('GET /api/orders/my-orders', () => {
        it('should return user orders', async () => {
            await Order.create({
                user_id: userId,
                items: [{ book_id: bookId, quantity: 1, priceAtOrder: 200 }],
                address_id: addressId,
                totalAmount: 250,
                deliveryFee: 50,
                status: 'pending',
            });

            const res = await request(app)
                .get('/api/orders/my-orders')
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(1);
        });
    });
});
