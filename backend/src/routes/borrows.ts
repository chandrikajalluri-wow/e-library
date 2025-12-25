/* eslint-disable @typescript-eslint/no-explicit-any */
import express, { Request, Response } from 'express';
import Borrow from '../models/Borrow';
import Book from '../models/Book';
import { auth, checkRole, AuthRequest } from '../middleware/authMiddleware';

const router = express.Router();

// Issue a book (User)
router.post('/issue', auth, async (req: AuthRequest, res: Response) => {
  const { book_id, days = 14 } = req.body;
  try {
    const book = await Book.findById(book_id);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    if (book.noOfCopies <= 0)
      return res.status(400).json({ error: 'No copies available' });

    // Check if user already has an active borrow for this book
    const activeBorrow = await Borrow.findOne({
      user_id: req.user!._id,
      book_id: book._id,
      status: { $in: ['borrowed', 'overdue', 'return_requested'] },
    });

    if (activeBorrow) {
      return res.status(400).json({
        error: 'You already have an active borrow for this book. Please return it before borrowing again.',
      });
    }

    const returnDate = new Date();
    returnDate.setDate(returnDate.getDate() + days);

    const borrow = new Borrow({
      user_id: req.user!._id,
      book_id: book._id,
      return_date: returnDate,
    });
    await borrow.save();

    // Update book status and inventory
    try {
      book.noOfCopies -= 1;
      if (book.noOfCopies === 0) {
        book.status = 'issued';
      }
      await book.save();
    } catch (updateError: any) {
      // Compensation: Delete the borrow record if book update fails
      await Borrow.findByIdAndDelete(borrow._id);
      console.error('Book update failed, reverted borrow:', updateError);
      return res
        .status(500)
        .json({
          error: 'Failed to update book inventory: ' + updateError.message,
        });
    }

    res.status(201).json(borrow);
  } catch (err: any) {
    console.error('Borrow error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Request return (User)
router.post('/return/:id', auth, async (req: AuthRequest, res: Response) => {
  try {
    const borrow = await Borrow.findById(req.params.id);
    if (!borrow) return res.status(404).json({ error: 'Record not found' });
    if (borrow.status !== 'borrowed' && borrow.status !== 'overdue') {
      return res
        .status(400)
        .json({
          error: 'Cannot request return for this status: ' + borrow.status,
        });
    }

    // Check if there is an outstanding fine
    let currentFine = borrow.fine_amount || 0;
    const now = new Date();
    if (now > borrow.return_date) {
      const diffTime = Math.abs(now.getTime() - borrow.return_date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      currentFine += diffDays * 10;
    }

    if (currentFine > 0 && !borrow.isFinePaid) {
      return res.status(400).json({
        error: `Please pay the outstanding fine of ₹${currentFine.toFixed(2)} before requesting return.`
      });
    }

    borrow.status = 'return_requested';
    await borrow.save();

    res.json(borrow);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Pay fine (User - Dummy)
router.post('/pay-fine/:id', auth, async (req: AuthRequest, res: Response) => {
  try {
    const borrow = await Borrow.findById(req.params.id);
    if (!borrow) return res.status(404).json({ error: 'Record not found' });

    // Calculate current fine to ensure they are paying the right amount
    let fine = borrow.fine_amount || 0;
    if (borrow.status !== 'returned' && borrow.status !== 'archived') {
      const now = new Date();
      if (now > borrow.return_date) {
        const diffTime = Math.abs(now.getTime() - borrow.return_date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        fine += diffDays * 10;
      }
    }

    if (fine <= 0) {
      return res.status(400).json({ error: 'No fine to pay' });
    }

    borrow.fine_amount = fine;
    borrow.isFinePaid = true;
    await borrow.save();

    res.json({ message: 'Fine paid successfully', borrow });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Accept return (Admin)
router.post(
  '/accept-return/:id',
  auth,
  checkRole(['admin']),
  async (req: Request, res: Response) => {
    try {
      const borrow = await Borrow.findById(req.params.id);
      if (!borrow) return res.status(404).json({ error: 'Record not found' });
      if (borrow.status !== 'return_requested') {
        return res
          .status(400)
          .json({ error: 'No return request found for this record' });
      }

      // Mark returned
      borrow.returned_at = new Date();
      borrow.status = 'returned';

      // Calculate fine (₹10 per day overdue)
      const now = new Date();
      if (now > borrow.return_date) {
        const diffTime = Math.abs(now.getTime() - borrow.return_date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        borrow.fine_amount = diffDays * 10; // ₹10 per day
      }

      await borrow.save();

      // Update Book status and inventory
      const book = await Book.findById(borrow.book_id);
      if (book) {
        book.noOfCopies += 1;
        book.status = 'available';
        await book.save();
      }

      res.json(borrow);
    } catch (err) {
      console.log(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// My Borrows (User)
router.get('/my', auth, async (req: AuthRequest, res: Response) => {
  try {
    const borrows = await Borrow.find({ user_id: req.user!._id })
      .populate('book_id', 'title author cover_image_url')
      .sort({ issued_date: -1 });
    res.json(borrows);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// All Borrows (Admin)
router.get(
  '/',
  auth,
  checkRole(['admin']),
  async (req: Request, res: Response) => {
    try {
      const borrows = await Borrow.find()
        .populate('user_id', 'name email')
        .populate('book_id', 'title');
      res.json(borrows);
    } catch (err) {
      console.log(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

export default router;
