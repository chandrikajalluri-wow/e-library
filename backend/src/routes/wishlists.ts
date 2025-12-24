/* eslint-disable @typescript-eslint/no-explicit-any */
import express, { Response } from 'express';
import Wishlist from '../models/Wishlist';
import Borrow from '../models/Borrow';
import { auth, AuthRequest } from '../middleware/authMiddleware';

const router = express.Router();

// Get My Wishlist
router.get('/', auth, async (req: AuthRequest, res: Response) => {
  try {
    const items = await Wishlist.find({ user_id: req.user!._id }).populate(
      'book_id'
    );

    const itemsWithReturnDate = await Promise.all(
      items.map(async (item: any) => {
        const book = item.book_id;
        if (book && book.noOfCopies === 0) {
          // Find nearest return date
          const nearestBorrow = await Borrow.findOne({
            book_id: book._id,
            status: { $ne: 'returned' },
          }).sort({ return_date: 1 });

          if (nearestBorrow) {
            const itemObj = item.toObject();
            itemObj.expectedReturnDate = nearestBorrow.return_date;
            return itemObj;
          }
        }
        return item.toObject();
      })
    );

    res.json(itemsWithReturnDate);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add to Wishlist
router.post('/', auth, async (req: AuthRequest, res: Response) => {
  const { book_id } = req.body;
  try {
    const existing = await Wishlist.findOne({
      user_id: req.user!._id,
      book_id,
    });
    if (existing) return res.status(400).json({ error: 'Already in wishlist' });

    const item = new Wishlist({ user_id: req.user!._id, book_id });
    await item.save();
    res.status(201).json(item);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove from Wishlist
router.delete('/:id', auth, async (req: AuthRequest, res: Response) => {
  try {
    await Wishlist.findByIdAndDelete(req.params.id);
    res.json({ message: 'Removed from wishlist' });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
