import React, { useState, useEffect } from 'react';
import { getQuizForBook, submitQuizAttempt, getUserQuizAttemptsForBook } from '../services/quizService';
import { toast } from 'react-toastify';
import { X, CheckCircle, XCircle, Clock } from 'lucide-react';
import Loader from './Loader';
import '../styles/QuizModal.css';

interface QuizModalProps {
  bookId: string;
  isOpen: boolean;
  onClose: () => void;
}

const QuizModal: React.FC<QuizModalProps> = ({ bookId, isOpen, onClose }) => {
  const [quiz, setQuiz] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [scorecard, setScorecard] = useState<any>(null);
  const [feedback, setFeedback] = useState<any[]>([]);
  
  // Stopwatch state
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Past attempts
  const [pastAttempts, setPastAttempts] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchQuizData();
    } else {
      resetState();
    }
  }, [isOpen, bookId]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isTimerRunning && !scorecard) {
      interval = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, scorecard]);

  const resetState = () => {
    setQuiz(null);
    setAnswers([]);
    setScorecard(null);
    setFeedback([]);
    setSecondsElapsed(0);
    setIsTimerRunning(false);
    setLoading(true);
  };

  const fetchQuizData = async () => {
    setLoading(true);
    try {
      // First check past attempts
      const attempts = await getUserQuizAttemptsForBook(bookId);
      setPastAttempts(attempts);

      // Fetch quiz questions
      const quizData = await getQuizForBook(bookId);
      if (quizData) {
         setQuiz(quizData);
         setAnswers(new Array(quizData.questions.length).fill(-1));
         if (attempts.length === 0) {
            setIsTimerRunning(true);
         }
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setQuiz(null);
      } else {
        toast.error('Failed to load quiz data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (qIndex: number, optIndex: number) => {
    if (scorecard) return; // Prevent changing answers after submit
    const newAnswers = [...answers];
    newAnswers[qIndex] = optIndex;
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    if (!quiz) return;
    
    // Check if all questions are answered
    if (answers.includes(-1)) {
        if (!window.confirm('You have unanswered questions. Are you sure you want to submit?')) {
            return;
        }
    }

    setIsTimerRunning(false);
    setSubmitting(true);
    try {
      const res = await submitQuizAttempt(quiz._id, answers, secondsElapsed);
      setScorecard(res.scorecard);
      setFeedback(res.feedback);
      toast.success('Quiz submitted successfully!');
      
      // Refresh past attempts
      const attempts = await getUserQuizAttemptsForBook(bookId);
      setPastAttempts(attempts);
    } catch (err: any) {
      toast.error('Failed to submit quiz');
      setIsTimerRunning(true);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay quiz-modal-overlay">
      <div className="modal-container quiz-modal-container saas-reveal">
        <div className="modal-header quiz-modal-header">
          <h2>Knowledge Check</h2>
          <button onClick={onClose} className="modal-close-btn" title="Close"><X size={20} /></button>
        </div>

        <div className="modal-body quiz-modal-body">
          {loading ? (
            <div className="quiz-loader-container"><Loader /></div>
          ) : !quiz ? (
            <div className="no-quiz-msg">
              <p>No quiz available for this book yet.</p>
              <button onClick={onClose} className="btn-primary mt-4">Close</button>
            </div>
          ) : (
            <>
              {pastAttempts.length > 0 && !scorecard && (
                <div className="past-attempts-banner">
                  <p>You have taken this quiz before (Best: {Math.max(...pastAttempts.map(a => a.score))}/{quiz.questions.length}). Retaking will record a new attempt.</p>
                </div>
              )}

              {/* Timer */}
              <div className="quiz-timer">
                <Clock size={18} />
                <span>{formatTime(scorecard ? scorecard.timeSpentSeconds : secondsElapsed)}</span>
              </div>

              {!scorecard ? (
                // Quiz Attempt View
                <div className="quiz-questions-list">
                  {quiz.questions.map((q: any, qIndex: number) => (
                    <div key={qIndex} className="quiz-question-card">
                      <h4>{qIndex + 1}. {q.questionText}</h4>
                      <div className="quiz-options-grid">
                        {q.options.map((opt: string, optIndex: number) => (
                          <div 
                            key={optIndex} 
                            className={`quiz-option ${answers[qIndex] === optIndex ? 'selected' : ''}`}
                            onClick={() => handleOptionSelect(qIndex, optIndex)}
                          >
                            <span className="quiz-option-letter">{String.fromCharCode(65 + optIndex)}</span>
                            <span className="quiz-option-text">{opt}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="quiz-submit-section">
                    <button 
                      onClick={handleSubmit} 
                      disabled={submitting} 
                      className="btn-primary submit-quiz-btn"
                    >
                      {submitting ? 'Submitting...' : 'Submit Quiz'}
                    </button>
                  </div>
                </div>
              ) : (
                // Scorecard View
                <div className="quiz-scorecard-view saas-reveal">
                  <div className="scorecard-header">
                    <h3>Quiz Results</h3>
                    <div 
                      className="final-score-circle"
                      style={{ '--progress': `${(scorecard.score / scorecard.totalQuestions) * 100}%` } as React.CSSProperties}
                    >
                      <div className="score-value">{scorecard.score}/{scorecard.totalQuestions}</div>
                      <div className="score-label">Points</div>
                    </div>
                    <div className="score-stats">
                        <div className="stat-pill correct"><CheckCircle size={14} /> {scorecard.correct} Correct</div>
                        <div className="stat-pill wrong"><XCircle size={14} /> {scorecard.wrong} Wrong</div>
                        <div className="stat-pill neutral">Attempted: {scorecard.attempted}/{scorecard.totalQuestions}</div>
                    </div>
                  </div>

                  <div className="scorecard-review">
                    <h4>Review your answers:</h4>
                    {feedback.map((f: any, fIndex: number) => (
                      <div key={fIndex} className={`review-question-card ${f.isCorrect ? 'correct-card' : 'wrong-card'}`}>
                        <h5>{fIndex + 1}. {f.questionText}</h5>
                        
                        <div className="review-options">
                            {f.options.map((opt: string, optIndex: number) => {
                                let cName = "review-option";
                                if (optIndex === f.correctAnswer) cName += " correct-ans";
                                else if (optIndex === f.userAnswer && !f.isCorrect) cName += " wrong-ans";
                                
                                return (
                                    <div key={optIndex} className={cName}>
                                        <span className="opt-letter">{String.fromCharCode(65 + optIndex)}</span>
                                        <span className="opt-text">{opt}</span>
                                        {optIndex === f.correctAnswer && <CheckCircle size={16} className="status-icon" />}
                                        {optIndex === f.userAnswer && !f.isCorrect && <XCircle size={16} className="status-icon" />}
                                    </div>
                                );
                            })}
                        </div>
                        {f.explanation && (
                            <div className="review-explanation">
                                <strong>Explanation:</strong> {f.explanation}
                            </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="scorecard-actions">
                     <button onClick={onClose} className="btn-secondary">Close</button>
                     <button onClick={resetState} className="btn-primary">Try Again</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizModal;
