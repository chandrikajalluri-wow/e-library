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
app.use(cors({ origin: ["http://localhost:5173", "https://chic-gelato-5dc4d2.netlify.app/"] }));

// Routes
import authRoutes from './routes/auth';
import categoryRoutes from './routes/categories';
import bookRoutes from './routes/books';
import borrowRoutes from './routes/borrows';
import wishlistRoutes from './routes/wishlists';
import reviewRoutes from './routes/reviews';
import activityLogRoutes from './routes/activityLogs';
import userRoutes from './routes/users';

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/borrows', borrowRoutes);
app.use('/api/wishlists', wishlistRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/logs', activityLogRoutes);
app.use('/api/users', userRoutes);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
