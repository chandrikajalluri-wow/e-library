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
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ["http://localhost:5173", "http://localhost:5174", "https://e-library-three-pi.vercel.app"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

// Routes
import authRoutes from './routes/auth';
import categoryRoutes from './routes/categories';
import bookRoutes from './routes/books';
import borrowRoutes from './routes/borrows';
import wishlistRoutes from './routes/wishlists';
import reviewRoutes from './routes/reviews';
import activityLogRoutes from './routes/activityLogs';
import userRoutes from './routes/users';
import contactRoutes from './routes/contact';
import notificationRoutes from './routes/notifications';
import membershipRoutes from './routes/memberships';
import borrowRenewalRoutes from './routes/borrows_renewal';
import superAdminRoutes from './routes/superAdmin';

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/borrows', borrowRoutes);
app.use('/api/wishlists', wishlistRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/logs', activityLogRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/memberships', membershipRoutes);
app.use('/api/borrows', borrowRenewalRoutes);
app.use('/api/super-admin', superAdminRoutes);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
