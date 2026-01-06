import express, { Request, Response } from 'express';
import Review from '../models/Review';
import Borrow from '../models/Borrow';
import { auth, AuthRequest } from '../middleware/authMiddleware';

const router = express.Router();

// Get reviews for a book
router.get('/book/:bookId', async (req: Request, res: Response) => {
  try {
    const reviews = await Review.find({ book_id: req.params.bookId })
      .populate('user_id', 'name')
      .sort({ reviewed_at: -1 });
    res.json(reviews);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add Review
router.post('/', auth, async (req: AuthRequest, res: Response) => {
  const { book_id, rating, comment } = req.body;
  try {
    // Check if user has borrowed the book
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
      comment,
    });
    await review.save();
    res.status(201).json(review);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update Review
router.put('/:id', auth, async (req: AuthRequest, res: Response) => {
  const { rating, comment } = req.body;
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ error: 'Review not found' });

    // Check if the review belongs to the user
    if (review.user_id.toString() !== req.user!._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized to edit this review' });
    }

    review.rating = rating;
    review.comment = comment;
    review.reviewed_at = new Date();
    await review.save();

    res.json(review);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
