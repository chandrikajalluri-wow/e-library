import api from '../api';
import type { Book } from '../types';

const BASE_URL = 'books';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getBooks = async (query = ''): Promise<any> => {
  const res = await api.get(`${BASE_URL}?${query}`);
  return res.data;
};

export const getBook = async (id: string): Promise<Book> => {
  const res = await api.get(`${BASE_URL}/${id}`);
  return res.data;
};

export const getSimilarBooks = async (id: string): Promise<Book[]> => {
  const res = await api.get(`${BASE_URL}/${id}/similar`);
  return res.data;
};

export const getRecommendedBooks = async (): Promise<Book[]> => {
  const res = await api.get(`${BASE_URL}/recommendations`);
  return res.data;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createBook = async (bookData: any): Promise<Book> => {
  // Axios automatically sets Content-Type for FormData
  const res = await api.post(BASE_URL, bookData);
  return res.data;
};

export const updateBook = async (
  id: string,
  bookData: any
): Promise<Book> => {
  const res = await api.put(`${BASE_URL}/${id}`, bookData);
  return res.data;
};

export const deleteBook = async (id: string): Promise<unknown> => {
  const res = await api.delete(`${BASE_URL}/${id}`);
  return res.data;
};

