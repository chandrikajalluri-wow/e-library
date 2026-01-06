import axios from 'axios';

const API_URL = 'https://e-library-7k5l.onrender.com/api/wishlists';

const getConfig = () => {
  const token = localStorage.getItem('token');
  return {
    headers: { Authorization: `Bearer ${token}` },
  };
};

export const getWishlist = async () => {
  const res = await axios.get(API_URL, getConfig());
  return res.data;
};

export const addToWishlist = async (book_id: string) => {
  const res = await axios.post(API_URL, { book_id }, getConfig());
  return res.data;
};

export const removeFromWishlist = async (id: string) => {
  const res = await axios.delete(`${API_URL}/${id}`, getConfig());
  return res.data;
};

export const getAllWishlists = async () => {
  const res = await axios.get(`${API_URL}/all`, getConfig());
  return res.data;
};
