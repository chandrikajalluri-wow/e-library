import express from 'express';
import { auth, checkRole } from '../middleware/authMiddleware';
import { RoleName } from '../types/enums';
import { upload } from '../middleware/uploadMiddleware';
import * as bookController from '../controllers/bookController';

const router = express.Router();

// Get all books (Public, with filters)
router.get('/', bookController.getAllBooks);

// Get single book
router.get('/:id', bookController.getBookById);

// Create Book (Admin/Super Admin only)
router.post(
  '/',
  auth,
  checkRole([RoleName.ADMIN, RoleName.SUPER_ADMIN]),
  upload.fields([
    { name: 'cover_image', maxCount: 1 },
    { name: 'author_image', maxCount: 1 },
    { name: 'pdf', maxCount: 1 },
  ]),
  bookController.createBook
);

// Update Book (Admin/Super Admin only)
router.put(
  '/:id',
  auth,
  checkRole([RoleName.ADMIN, RoleName.SUPER_ADMIN]),
  upload.fields([
    { name: 'cover_image', maxCount: 1 },
    { name: 'author_image', maxCount: 1 },
    { name: 'pdf', maxCount: 1 },
  ]),
  bookController.updateBook
);

// Delete Book (Admin/Super Admin only)
router.delete('/:id', auth, checkRole([RoleName.ADMIN, RoleName.SUPER_ADMIN]), bookController.deleteBook);

// View Book PDF (Proxied through backend for CORS)
router.get('/:id/view', auth, bookController.viewBookPdf);

export default router;
