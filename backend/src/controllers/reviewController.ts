import { Request, Response } from 'express';
import Review from '../models/Review';
import Borrow from '../models/Borrow';
import Book from '../models/Book';
import { AuthRequest } from '../middleware/authMiddleware';
import { maskProfanity } from '../utils/profanityFilter';

export const getReviewsForBook = async (req: Request, res: Response) => {
    try {
        const reviews = await Review.find({ book_id: req.params.bookId })
            .populate('user_id', 'name')
            .sort({ reviewed_at: -1 });
        res.json(reviews);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const addReview = async (req: AuthRequest, res: Response) => {
    const { book_id, rating, comment } = req.body;
    try {
        const hasBorrowed = await Borrow.findOne({
            user_id: req.user!._id,
            book_id: book_id,
        });
        if (!hasBorrowed) {
            return res
                .status(403)
                .json({
                    error: 'Only users who have borrowed this book can leave a review',
                });
        }

        const existing = await Review.findOne({ user_id: req.user!._id, book_id });
        if (existing)
            return res
                .status(400)
                .json({ error: 'You have already reviewed this book' });

        const review = new Review({
            user_id: req.user!._id,
            book_id,
            rating,
            comment: maskProfanity(comment),
        });
        await review.save();

        const allReviews = await Review.find({ book_id });
        const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
        await Book.findByIdAndUpdate(book_id, { rating: Number(avgRating.toFixed(1)) });

        res.status(201).json(review);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const updateReview = async (req: AuthRequest, res: Response) => {
    const { rating, comment } = req.body;
    try {
        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ error: 'Review not found' });

        if (review.user_id.toString() !== req.user!._id.toString()) {
            return res.status(403).json({ error: 'Unauthorized to edit this review' });
        }

        review.rating = rating;
        review.comment = maskProfanity(comment);
        review.reviewed_at = new Date();
        await review.save();

        const allReviews = await Review.find({ book_id: review.book_id });
        const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
        await Book.findByIdAndUpdate(review.book_id, { rating: Number(avgRating.toFixed(1)) });

        res.json(review);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const likeReview = async (req: AuthRequest, res: Response) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ error: 'Review not found' });

        const userId = req.user!._id;

        // Initialize if missing (for legacy reviews)
        if (!review.likes) review.likes = [];
        if (!review.dislikes) review.dislikes = [];

        const userIdStr = userId.toString();

        // Toggle Like
        if (review.likes.some(id => id.toString() === userIdStr)) {
            review.likes = review.likes.filter(id => id.toString() !== userIdStr);
        } else {
            review.likes.push(userId);
            // Remove Dislike if exists
            review.dislikes = review.dislikes.filter(id => id.toString() !== userIdStr);
        }

        await review.save();
        res.json({ likes: review.likes.length, dislikes: review.dislikes.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const dislikeReview = async (req: AuthRequest, res: Response) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ error: 'Review not found' });

        const userId = req.user!._id;

        // Initialize if missing (for legacy reviews)
        if (!review.likes) review.likes = [];
        if (!review.dislikes) review.dislikes = [];

        const userIdStr = userId.toString();

        // Toggle Dislike
        if (review.dislikes.some(id => id.toString() === userIdStr)) {
            review.dislikes = review.dislikes.filter(id => id.toString() !== userIdStr);
        } else {
            review.dislikes.push(userId);
            // Remove Like if exists
            review.likes = review.likes.filter(id => id.toString() !== userIdStr);
        }

        await review.save();
        res.json({ likes: review.likes.length, dislikes: review.dislikes.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const reportReview = async (req: AuthRequest, res: Response) => {
    const { reason } = req.body;
    try {
        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ error: 'Review not found' });

        // Initialize if missing
        if (!review.reports) review.reports = [];

        const hasAlreadyReported = review.reports.some(
            (r) => r.user_id.toString() === req.user!._id.toString()
        );

        if (hasAlreadyReported) {
            return res.status(400).json({ error: 'You have already reported this review' });
        }

        review.reports.push({
            user_id: req.user!._id,
            reason,
            reported_at: new Date(),
        });

        await review.save();
        res.json({ message: 'Review reported successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};
