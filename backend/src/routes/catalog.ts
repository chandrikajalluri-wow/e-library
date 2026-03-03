import express from 'express';
import { auth, checkRole } from '../middleware/authMiddleware';
import { RoleName } from '../types/enums';
import { upload } from '../middleware/uploadMiddleware';
import * as catalogController from '../controllers/catalogController';

const router = express.Router();

// --- Category Routes ---

router.get('/categories', catalogController.getAllCategories);
router.post('/categories', auth, checkRole([RoleName.ADMIN, RoleName.SUPER_ADMIN]), catalogController.createCategory);
router.put('/categories/:id', auth, checkRole([RoleName.ADMIN, RoleName.SUPER_ADMIN]), catalogController.updateCategory);
router.delete('/categories/:id', auth, checkRole([RoleName.ADMIN, RoleName.SUPER_ADMIN]), catalogController.deleteCategory);

// --- Book Routes ---

router.get('/books', catalogController.getAllBooks);
router.get('/books/recommendations', auth, catalogController.getRecommendedBooks);
router.get('/books/:id', catalogController.getBookById);
router.get('/books/:id/similar', catalogController.getSimilarBooks);

router.post(
    '/books',
    auth,
    checkRole([RoleName.ADMIN, RoleName.SUPER_ADMIN]),
    upload.fields([
        { name: 'cover_image', maxCount: 1 },
        { name: 'author_image', maxCount: 1 },
        { name: 'pdf', maxCount: 1 },
    ]),
    catalogController.createBook
);

router.put(
    '/books/:id',
    auth,
    checkRole([RoleName.ADMIN, RoleName.SUPER_ADMIN]),
    upload.fields([
        { name: 'cover_image', maxCount: 1 },
        { name: 'author_image', maxCount: 1 },
        { name: 'pdf', maxCount: 1 },
    ]),
    catalogController.updateBook
);

router.delete('/books/:id', auth, checkRole([RoleName.ADMIN, RoleName.SUPER_ADMIN]), catalogController.deleteBook);
router.get('/books/:id/delete-check', auth, checkRole([RoleName.ADMIN, RoleName.SUPER_ADMIN]), catalogController.checkDeletionSafety);
router.get('/books/:id/view', auth, catalogController.viewBookPdf);
router.get('/books/debug/test-s3', catalogController.testS3Config);

export default router;
