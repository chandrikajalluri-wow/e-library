import request from 'supertest';
import app from '../../src/app';
import Role from '../../src/models/Role';
import Membership from '../../src/models/Membership';
import User from '../../src/models/User';
import { RoleName, MembershipName } from '../../src/types/enums';

// Mock mailer and redis
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

import bcrypt from 'bcryptjs';

describe('Authentication Integration Tests', () => {
    beforeEach(async () => {
        // Seed required data
        await Role.create({ name: RoleName.USER, description: 'User' });
        await Membership.create({
            name: MembershipName.BASIC,
            displayName: 'Basic',
            price: 0,
            monthlyLimit: 5,
            accessDuration: 30,
            description: 'Basic Membership',
        });
    });

    describe('POST /api/auth/signup', () => {
        it('should register a new user successfully', async () => {
            const res = await request(app)
                .post('/api/auth/signup')
                .send({
                    name: 'Test User',
                    email: 'test@example.com',
                    password: 'Password123!',
                });

            expect(res.status).toBe(200);
            expect(res.body.message).toContain('Signup successful');

            const user = await User.findOne({ email: 'test@example.com' });
            expect(user).toBeDefined();
            expect(user?.isVerified).toBe(false);
        });

        it('should fail with missing fields', async () => {
            const res = await request(app)
                .post('/api/auth/signup')
                .send({
                    email: 'test@example.com',
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toBeDefined();
        });
    });

    describe('POST /api/auth/login', () => {
        it('should fail login for unverified user', async () => {
            // Create unverified user
            const userRole = await Role.findOne({ name: RoleName.USER });
            const basicMembership = await Membership.findOne({ name: MembershipName.BASIC });

            const password = 'Password123!';
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            await User.create({
                name: 'Unverified User',
                email: 'unverified@example.com',
                password: hashedPassword,
                role_id: userRole?._id,
                membership_id: basicMembership?._id,
                isVerified: false,
            });

            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'unverified@example.com',
                    password: password,
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('Account not verified');
        });

        it('should login successfully for verified user', async () => {
            const userRole = await Role.findOne({ name: RoleName.USER });
            const basicMembership = await Membership.findOne({ name: MembershipName.BASIC });

            const password = 'Password123!';
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            await User.create({
                name: 'Verified User',
                email: 'verified@example.com',
                password: hashedPassword,
                role_id: userRole?._id,
                membership_id: basicMembership?._id,
                isVerified: true,
            });

            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'verified@example.com',
                    password: password,
                });

            expect(res.status).toBe(200);
            expect(res.body.token).toBeDefined();
        });
    });
});
