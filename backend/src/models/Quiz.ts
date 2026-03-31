import mongoose, { Document, Schema, Types } from 'mongoose';
import { IBook } from './Book';

export interface IQuestion {
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string;
}

export interface IQuiz extends Document {
  book_id: Types.ObjectId | IBook;
  questions: IQuestion[];
  createdAt: Date;
  updatedAt: Date;
}

const questionSchema = new Schema<IQuestion>({
  questionText: { type: String, required: true },
  options: { type: [String], required: true, validate: [(val: string[]) => val.length === 4, '{PATH} must have 4 options'] },
  correctOptionIndex: { type: Number, required: true, min: 0, max: 3 },
  explanation: { type: String }
});

const quizSchema = new Schema<IQuiz>(
  {
    book_id: { type: Schema.Types.ObjectId, ref: 'Book', required: true, unique: true },
    questions: { 
      type: [questionSchema], 
      required: true,
      validate: [(val: IQuestion[]) => val.length > 0 && val.length <= 5, '{PATH} must have between 1 and 5 questions']
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: 'quizzes' }
);

// Index for getting quiz by book
quizSchema.index({ book_id: 1 });

export default mongoose.model<IQuiz>('Quiz', quizSchema);
