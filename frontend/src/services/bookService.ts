import axios from 'axios';
import type { Book } from '../types';

const API_URL = 'http://localhost:5000/api/books';

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

export const createBook = async (bookData: Partial<Book>): Promise<Book> => {
  const res = await axios.post(API_URL, bookData, getConfig());
  return res.data;
};

export const updateBook = async (
  id: string,
  bookData: Partial<Book>
): Promise<Book> => {
  const res = await axios.put(`${API_URL}/${id}`, bookData, getConfig());
  return res.data;
};

export const deleteBook = async (id: string): Promise<unknown> => {
  const res = await axios.delete(`${API_URL}/${id}`, getConfig());
  return res.data;
};
