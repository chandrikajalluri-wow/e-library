import axios from 'axios';
import type { Category } from '../types';

const API_URL = 'https://e-library-7k5l.onrender.com/api/categories';

const getConfig = () => {
  const token = localStorage.getItem('token');
  return {
    headers: { Authorization: `Bearer ${token}` },
  };
};

export const getCategories = async (): Promise<Category[]> => {
  const res = await axios.get(API_URL);
  return res.data;
};

export const createCategory = async (
  data: Partial<Category>
): Promise<Category> => {
  const res = await axios.post(API_URL, data, getConfig());
  return res.data;
};

export const deleteCategory = async (id: string): Promise<unknown> => {
  const res = await axios.delete(`${API_URL}/${id}`, getConfig());
  return res.data;
};
