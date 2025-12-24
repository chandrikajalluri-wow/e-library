import axios from 'axios';
import type { Borrow } from '../types';

const API_URL = 'https://e-library-7k5l.onrender.com/api/borrows';

const getConfig = () => {
  const token = localStorage.getItem('token');
  return {
    headers: { Authorization: `Bearer ${token}` },
  };
};

export const issueBook = async (
  book_id: string,
  days: number = 14
): Promise<Borrow> => {
  const res = await axios.post(
    `${API_URL}/issue`,
    { book_id, days },
    getConfig()
  );
  return res.data;
};

export const returnBook = async (borrow_id: string): Promise<Borrow> => {
  const res = await axios.post(
    `${API_URL}/return/${borrow_id}`,
    {},
    getConfig()
  );
  return res.data;
};

export const payFine = async (borrow_id: string): Promise<any> => {
  const res = await axios.post(
    `${API_URL}/pay-fine/${borrow_id}`,
    {},
    getConfig()
  );
  return res.data;
};

export const acceptReturn = async (borrow_id: string): Promise<Borrow> => {
  const res = await axios.post(
    `${API_URL}/accept-return/${borrow_id}`,
    {},
    getConfig()
  );
  return res.data;
};

export const getMyBorrows = async (): Promise<Borrow[]> => {
  const res = await axios.get(`${API_URL}/my`, getConfig());
  return res.data;
};

export const getAllBorrows = async (): Promise<Borrow[]> => {
  const res = await axios.get(API_URL, getConfig()); // Admin only
  return res.data;
};
