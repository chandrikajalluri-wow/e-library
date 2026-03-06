import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { initCronJobs } from './utils/cron';
import connectDB from './config/db';

// Import Routes
import authRoutes from './routes/auth';
import catalogRoutes from './routes/catalog';
import wishlistRoutes from './routes/wishlists';
import reviewRoutes from './routes/reviews';
import activityLogRoutes from './routes/activityLogs';
import userRoutes from './routes/users';
import communicationRoutes from './routes/communication';
import notificationRoutes from './routes/notifications';
import membershipRoutes from './routes/memberships';
import superAdminRoutes from './routes/superAdmin';
import orderRoutes from './routes/orders';
import aiRoutes from './routes/ai';
import { AppError } from './utils/errors';

dotenv.config();

const app = express();

app.use(express.json());
app.use(cookieParser());

// Connect to MongoDB (skip in tests, setup.ts handles it)
if (process.env.NODE_ENV !== 'test') {
    connectDB();
    initCronJobs();
}

app.use(
    cors({
        origin: process.env.ALLOWED_ORIGINS
            ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
            : ["http://localhost:5173", "https://e-library-three-pi.vercel.app"],
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        allowedHeaders: ["Content-Type", "Authorization", "Range"],
        exposedHeaders: ["Content-Range", "Accept-Ranges", "Content-Length"],
        credentials: true,
        optionsSuccessStatus: 200,
    })
);

// Routes
app.use('/api', catalogRoutes);
app.use('/api', communicationRoutes);
app.use('/api', superAdminRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/wishlists', wishlistRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/logs', activityLogRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/memberships', membershipRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/ai', aiRoutes);

// Global Error Handler
app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    let statusCode = 500;
    let message = 'Internal Server Error';
    let stack = process.env.NODE_ENV === 'development' ? (err as Error).stack : undefined;

    if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
    } else if (err instanceof Error) {
        message = err.message;
        if (process.env.NODE_ENV !== 'test') {
            console.error("SYSTEM ERROR:", err);
        }
    } else {
        if (process.env.NODE_ENV !== 'test') {
            console.error("UNKNOWN ERROR:", err);
        }
    }

    res.status(statusCode).json({
        error: message,
        stack
    });
});

export default app;
