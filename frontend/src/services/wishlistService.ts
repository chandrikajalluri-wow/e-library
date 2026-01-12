import api from '../api';

const BASE_URL = 'wishlists';

export const getWishlist = async () => {
  const res = await api.get(BASE_URL);
  return res.data;
};

export const addToWishlist = async (book_id: string) => {
  const res = await api.post(BASE_URL, { book_id });
  return res.data;
};

export const removeFromWishlist = async (id: string) => {
  const res = await api.delete(`${BASE_URL}/${id}`);
  return res.data;
};

export const getAllWishlists = async () => {
  const res = await api.get(`${BASE_URL}/all`);
  return res.data;
};
