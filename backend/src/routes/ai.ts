import express from 'express';
import { generateBookContentController, explainBookController } from '../controllers/aiController';
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

// POST /api/ai/explain-book - Explain book details (Authenticated users)
router.post(
    '/explain-book',
    auth,
    explainBookController
);

export default router;
