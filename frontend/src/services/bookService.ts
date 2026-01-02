import axios from 'axios';
import type { Book } from '../types';

const API_URL = 'https://e-library-7k5l.onrender.com/api/books';

const getConfig = () => {
  const token = localStorage.getItem('token');
  return {
    headers: { Authorization: `Bearer ${token}` },
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getBooks = async (query = ''): Promise<any> => {
  const res = await axios.get(`${API_URL}?${query}`);
  return res.data;
};

export const getBook = async (id: string): Promise<Book> => {
  const res = await axios.get(`${API_URL}/${id}`);
  return res.data;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createBook = async (bookData: any): Promise<Book> => {
  const isFormData = bookData instanceof FormData;
  const config = getConfig();
  if (isFormData) {
    // Axios will automatically set the correct Content-Type for FormData
  }
  const res = await axios.post(API_URL, bookData, config);
  return res.data;
};

export const updateBook = async (
  id: string,
  bookData: any
): Promise<Book> => {
  const res = await axios.put(`${API_URL}/${id}`, bookData, getConfig());
  return res.data;
};

export const deleteBook = async (id: string): Promise<unknown> => {
  const res = await axios.delete(`${API_URL}/${id}`, getConfig());
  return res.data;
};
