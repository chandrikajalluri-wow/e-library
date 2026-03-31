import express from 'express';
import {
  getQuizByBookId,
  submitQuizAttempt,
  getUserAttemptsForBook,
} from '../controllers/quizController';
import { auth } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/book/:bookId', getQuizByBookId);
router.post('/:quizId/submit', auth, submitQuizAttempt);
router.get('/attempts/book/:bookId', auth, getUserAttemptsForBook);

export default router;
