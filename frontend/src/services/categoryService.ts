import api from '../api';
import type { Category } from '../types';

const BASE_URL = 'categories';

export const getCategories = async (query: string = ''): Promise<Category[]> => {
  const url = query ? `${BASE_URL}?${query}` : BASE_URL;
  const res = await api.get(url);
  return res.data;
};

export const createCategory = async (
  data: Partial<Category>
): Promise<Category> => {
  const res = await api.post(BASE_URL, data);
  return res.data;
};

export const deleteCategory = async (id: string): Promise<unknown> => {
  const res = await api.delete(`${BASE_URL}/${id}`);
  return res.data;
};

export const updateCategory = async (
  id: string,
  data: Partial<Category>
): Promise<Category> => {
  const res = await api.put(`${BASE_URL}/${id}`, data);
  return res.data;
};
