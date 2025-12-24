import axios from 'axios';

const API_URL = 'http://localhost:5000/api/reviews';

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
