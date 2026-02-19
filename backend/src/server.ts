import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db';
import cors from 'cors';
import { initCronJobs } from './utils/cron';

dotenv.config();

const app = express();
app.use(express.json());

// Connect to MongoDB
connectDB();
initCronJobs();
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : ["http://localhost:5173", "http://localhost:5174", "https://e-library-three-pi.vercel.app"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "Range"],
    exposedHeaders: ["Content-Range", "Accept-Ranges", "Content-Length"],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

// Routes
import authRoutes from './routes/auth';
import categoryRoutes from './routes/categories';
import bookRoutes from './routes/books';
import wishlistRoutes from './routes/wishlists';
import reviewRoutes from './routes/reviews';
import activityLogRoutes from './routes/activityLogs';
import userRoutes from './routes/users';
import contactRoutes from './routes/contact';
import notificationRoutes from './routes/notifications';
import membershipRoutes from './routes/memberships';
import superAdminRoutes from './routes/superAdmin';
import orderRoutes from './routes/orders';
import aiRoutes from './routes/ai';
import chatRoutes from './routes/chat';
import adminInviteRoutes from './routes/adminInvite';

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/wishlists', wishlistRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/logs', activityLogRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/memberships', membershipRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin-invite', adminInviteRoutes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("GLOBAL ERROR:", err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

import { createServer } from 'http';
import { Server } from 'socket.io';
import { initSocket } from './socket/socketManager';

const PORT = process.env.PORT || 5001;
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : ["http://localhost:5173", "http://localhost:5174", "https://e-library-three-pi.vercel.app"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
    optionsSuccessStatus: 200,
  }
});

initSocket(io);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
