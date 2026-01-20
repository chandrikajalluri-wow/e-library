import express from 'express';
import { auth } from '../middleware/authMiddleware';
import * as reviewController from '../controllers/reviewController';

const router = express.Router();

// Get reviews for a book
router.get('/book/:bookId', reviewController.getReviewsForBook);

// Add Review
router.post('/', auth, reviewController.addReview);

// Update Review
router.put('/:id', auth, reviewController.updateReview);

export default router;
