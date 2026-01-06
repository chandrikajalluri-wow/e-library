import axios from 'axios';

const API_URL = 'https://e-library-7k5l.onrender.com/api/reviews';

const getConfig = () => {
  const token = localStorage.getItem('token');
  return {
    headers: { Authorization: `Bearer ${token}` },
  };
};

export const getBookReviews = async (bookId: string) => {
  const res = await axios.get(`${API_URL}/book/${bookId}`);
  return res.data;
};

export const addReview = async (reviewData: {
  book_id: string;
  rating: number;
  comment: string;
}) => {
  const res = await axios.post(API_URL, reviewData, getConfig());
  return res.data;
};

export const updateReview = async (
  id: string,
  reviewData: { rating: number; comment: string }
) => {
  const res = await axios.put(`${API_URL}/${id}`, reviewData, getConfig());
  return res.data;
};
