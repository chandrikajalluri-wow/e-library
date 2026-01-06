import api from '../api';
import type { Borrow } from '../types';

const BASE_URL = '/borrows';

export const issueBook = async (
  book_id: string,
  days: number = 14
): Promise<Borrow> => {
  const res = await api.post(`${BASE_URL}/issue`, { book_id, days });
  return res.data;
};

export const returnBook = async (borrow_id: string): Promise<Borrow> => {
  const res = await api.post(`${BASE_URL}/return/${borrow_id}`, {});
  return res.data;
};

export const payFine = async (borrow_id: string): Promise<any> => {
  const res = await api.post(`${BASE_URL}/pay-fine/${borrow_id}`, {});
  return res.data;
};

export const acceptReturn = async (borrow_id: string): Promise<Borrow> => {
  const res = await api.post(`${BASE_URL}/accept-return/${borrow_id}`, {});
  return res.data;
};

export const getMyBorrows = async (): Promise<Borrow[]> => {
  const res = await api.get(`${BASE_URL}/my`);
  return res.data;
};

export const getAllBorrows = async (query = ''): Promise<any> => {
  const res = await api.get(`${BASE_URL}?${query}`); // Admin only
  return res.data;
};
