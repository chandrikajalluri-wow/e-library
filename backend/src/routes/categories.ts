import express, { Request, Response } from 'express';
import Category from '../models/Category';
import { auth, checkRole } from '../middleware/authMiddleware';

const router = express.Router();

// Get all categories
router.get('/', async (req: Request, res: Response) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create Category (Admin only)
router.post(
  '/',
  auth,
  checkRole(['admin']),
  async (req: Request, res: Response) => {
    const { name, description } = req.body;
    try {
      const existing = await Category.findOne({ name });
      if (existing)
        return res.status(400).json({ error: 'Category already exists' });

      const category = new Category({ name, description });
      await category.save();
      res.status(201).json(category);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Update Category (Admin only)
router.put(
  '/:id',
  auth,
  checkRole(['admin']),
  async (req: Request, res: Response) => {
    const { name, description } = req.body;
    try {
      const category = await Category.findByIdAndUpdate(
        req.params.id,
        { name, description },
        { new: true }
      );
      if (!category)
        return res.status(404).json({ error: 'Category not found' });
      res.json(category);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Delete Category (Admin only)
router.delete(
  '/:id',
  auth,
  checkRole(['admin']),
  async (req: Request, res: Response) => {
    try {
      const category = await Category.findByIdAndDelete(req.params.id);
      if (!category)
        return res.status(404).json({ error: 'Category not found' });
      res.json({ message: 'Category deleted' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

export default router;
