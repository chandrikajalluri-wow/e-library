import express from 'express';
import { auth, checkRole } from '../middleware/authMiddleware';
import { RoleName } from '../types/enums';
import * as categoryController from '../controllers/categoryController';

const router = express.Router();

// Get all categories
router.get('/', auth, categoryController.getAllCategories);

// Create Category (Admin only)
router.post('/', auth, checkRole([RoleName.ADMIN, RoleName.SUPER_ADMIN]), categoryController.createCategory);

// Update Category (Admin only)
router.put('/:id', auth, checkRole([RoleName.ADMIN, RoleName.SUPER_ADMIN]), categoryController.updateCategory);

// Delete Category (Admin/Super Admin only)
router.delete('/:id', auth, checkRole([RoleName.ADMIN, RoleName.SUPER_ADMIN]), categoryController.deleteCategory);

export default router;
