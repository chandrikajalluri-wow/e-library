import api from '../api';

export const getQuizForBook = async (bookId: string) => {
  const response = await api.get(`/quizzes/book/${bookId}`, {
    withCredentials: true
  });
  return response.data;
};

export const submitQuizAttempt = async (quizId: string, answers: number[], timeSpentSeconds: number) => {
  const response = await api.post(`/quizzes/${quizId}/submit`, {
    answers,
    timeSpentSeconds
  }, {
    withCredentials: true
  });
  return response.data;
};

export const getUserQuizAttemptsForBook = async (bookId: string) => {
  const response = await api.get(`/quizzes/attempts/book/${bookId}`, {
    withCredentials: true
  });
  return response.data;
};
