import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import Quiz from '../models/Quiz';
import QuizAttempt from '../models/QuizAttempt';
import Book from '../models/Book';
import { generateQuizForBook } from '../services/aiService';

export const getQuizByBookId = async (req: Request, res: Response) => {
  try {
    const { bookId } = req.params;
    let quiz: any = await Quiz.findOne({ book_id: bookId }).lean();

    if (!quiz) {
      // Lazy Load AI Generation
      const book = await Book.findById(bookId);
      if (!book) {
        return res.status(404).json({ message: 'Book not found' });
      }

      try {
        const generatedQuestions = await generateQuizForBook(book.title, book.author);
        const newQuiz = new Quiz({
          book_id: book._id,
          questions: generatedQuestions
        });
        await newQuiz.save();
        quiz = newQuiz.toObject();
      } catch (aiError: any) {
        require('fs').writeFileSync('d:/bookstack/e-library/backend/aiError.log', aiError.stack || aiError.message || String(aiError));
        console.error('Failed to auto-generate quiz:', aiError);
        return res.status(500).json({ message: 'Failed to auto-generate quiz: ' + aiError.message });
      }
    }

    // Remove correctOptionIndex to prevent cheating on the frontend
    const sanitizedQuestions = quiz.questions.map((q: any) => {
      const { correctOptionIndex, explanation, ...rest } = q;
      return rest;
    });

    res.status(200).json({
      _id: quiz._id,
      book_id: quiz.book_id,
      questions: sanitizedQuestions,
      createdAt: quiz.createdAt,
    });
  } catch (error) {
    console.error('Error fetching quiz:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const submitQuizAttempt = async (req: AuthRequest, res: Response) => {
  try {
    const { quizId } = req.params;
    const { answers, timeSpentSeconds } = req.body; // expected: array of selected indices
    const userId = req.user!._id;

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'Invalid payload: answers array is required' });
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Calculate score
    let score = 0;
    const totalQuestions = quiz.questions.length;
    let attempted = 0;
    let correct = 0;
    let wrong = 0;

    const feedback = quiz.questions.map((q, index) => {
      const userAnswer = answers[index];
      const isCorrect = userAnswer === q.correctOptionIndex;
      
      if (userAnswer !== undefined && userAnswer !== null && userAnswer !== -1) {
        attempted++;
        if (isCorrect) {
          correct++;
          score++;
        } else {
          wrong++;
        }
      }

      return {
        questionText: q.questionText,
        options: q.options,
        userAnswer,
        correctAnswer: q.correctOptionIndex,
        isCorrect,
        explanation: q.explanation,
      };
    });

    // Save attempt
    const attempt = new QuizAttempt({
      user_id: userId,
      book_id: quiz.book_id,
      quiz_id: quiz._id,
      score,
      totalQuestions,
      answers,
      timeSpentSeconds: timeSpentSeconds || 0,
    });

    await attempt.save();

    res.status(200).json({
      message: 'Quiz submitted successfully',
      scorecard: {
        totalQuestions,
        attempted,
        correct,
        wrong,
        score,
        timeSpentSeconds: attempt.timeSpentSeconds,
      },
      feedback,
      attemptId: attempt._id,
    });
  } catch (error) {
    console.error('Error submitting quiz attempt:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getUserAttemptsForBook = async (req: AuthRequest, res: Response) => {
  try {
    const { bookId } = req.params;
    const userId = req.user!._id;

    const attempts = await QuizAttempt.find({ user_id: userId, book_id: bookId }).sort({ createdAt: -1 });
    
    res.status(200).json(attempts);
  } catch (error) {
    console.error('Error fetching quiz attempts:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
