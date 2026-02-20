import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import * as reviewService from '../services/reviewService';

export const getReviewsForBook = async (req: Request, res: Response) => {
    try {
        const reviews = await reviewService.getReviewsForBook(req.params.bookId);
        res.json(reviews);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const addReview = async (req: AuthRequest, res: Response) => {
    try {
        const { book_id, rating, comment } = req.body;
        const review = await reviewService.addReview(req.user!._id, book_id, rating, comment, req.user!.name);
        res.status(201).json(review);
    } catch (err: any) {
        console.log(err);
        res.status(err.message.includes('Only users') ? 403 : 400).json({ error: err.message });
    }
};

export const updateReview = async (req: AuthRequest, res: Response) => {
    try {
        const { rating, comment } = req.body;
        const review = await reviewService.updateReview(req.params.id, req.user!._id, rating, comment);
        res.json(review);
    } catch (err: any) {
        console.log(err);
        res.status(err.message === 'Review not found' ? 404 : err.message === 'Unauthorized to edit this review' ? 403 : 500).json({ error: err.message });
    }
};

export const likeReview = async (req: AuthRequest, res: Response) => {
    try {
        const result = await reviewService.likeReview(req.params.id, req.user!._id);
        res.json(result);
    } catch (err: any) {
        console.error(err);
        res.status(err.message === 'Review not found' ? 404 : 500).json({ error: err.message });
    }
};

export const dislikeReview = async (req: AuthRequest, res: Response) => {
    try {
        const result = await reviewService.dislikeReview(req.params.id, req.user!._id);
        res.json(result);
    } catch (err: any) {
        console.error(err);
        res.status(err.message === 'Review not found' ? 404 : 500).json({ error: err.message });
    }
};

export const reportReview = async (req: AuthRequest, res: Response) => {
    try {
        const { reason } = req.body;
        await reviewService.reportReview(req.params.id, req.user!._id, req.user!.name, reason);
        res.json({ message: 'Review reported successfully' });
    } catch (err: any) {
        console.error(err);
        res.status(err.message === 'Review not found' ? 404 : 400).json({ error: err.message });
    }
};

