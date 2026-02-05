import express from 'express';
import { generateBookContentController } from '../controllers/aiController';
import { auth, checkRole } from '../middleware/authMiddleware';
import { RoleName } from '../types/enums';

const router = express.Router();

// POST /api/ai/generate-book-content - Generate book content with AI
router.post(
    '/generate-book-content',
    auth,
    checkRole([RoleName.ADMIN, RoleName.SUPER_ADMIN]),
    generateBookContentController
);

export default router;
