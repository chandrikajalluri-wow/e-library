import api from '../api';

const BASE_URL = 'reviews';

export const getBookReviews = async (bookId: string) => {
  const res = await api.get(`${BASE_URL}/book/${bookId}`);
  return res.data;
};

export const addReview = async (reviewData: {
  book_id: string;
  rating: number;
  comment: string;
}) => {
  const res = await api.post(BASE_URL, reviewData);
  return res.data;
};

export const updateReview = async (
  id: string,
  reviewData: { rating: number; comment: string }
) => {
  const res = await api.put(`${BASE_URL}/${id}`, reviewData);
  return res.data;
};

export const likeReview = async (id: string) => {
  const res = await api.post(`${BASE_URL}/${id}/like`);
  return res.data;
};

export const dislikeReview = async (id: string) => {
  const res = await api.post(`${BASE_URL}/${id}/dislike`);
  return res.data;
};

export const reportReview = async (id: string, reason: string) => {
  const res = await api.post(`${BASE_URL}/${id}/report`, { reason });
  return res.data;
};
