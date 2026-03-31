import mongoose, { Document, Schema, Types } from 'mongoose';
import { IUser } from './User';
import { IBook } from './Book';
import { IQuiz } from './Quiz';

export interface IQuizAttempt extends Document {
  user_id: Types.ObjectId | IUser;
  book_id: Types.ObjectId | IBook;
  quiz_id: Types.ObjectId | IQuiz;
  score: number;
  totalQuestions: number;
  answers: number[];
  timeSpentSeconds: number;
  createdAt: Date;
}

const quizAttemptSchema = new Schema<IQuizAttempt>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    book_id: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
    quiz_id: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
    score: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    answers: { type: [Number], required: true }, // The indices the user selected
    timeSpentSeconds: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: 'quiz_attempts' }
);

// Indexes
quizAttemptSchema.index({ user_id: 1, book_id: 1 }); // Quick lookup for user's attempt on a specific book
quizAttemptSchema.index({ quiz_id: 1 });

export default mongoose.model<IQuizAttempt>('QuizAttempt', quizAttemptSchema);
