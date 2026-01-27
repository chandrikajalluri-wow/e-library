import api from '../api';

const BASE_URL = 'auth';

// Signup
export const signup = async (name: string, email: string, password: string) => {
  await api.post(`${BASE_URL}/signup`, { name, email, password });
};

// Login
export const login = async (email: string, password: string) => {
  const res = await api.post(`${BASE_URL}/login`, { email, password });
  return res.data; // { token, role }
};

// Forgot Password -> sends reset link to email
export const forgotPassword = async (email: string) => {
  await api.post(`${BASE_URL}/forgot`, { email });
};

// Reset Password -> updates password in DB
export const resetPassword = async (token: string, password: string) => {
  await api.post(`${BASE_URL}/reset/${token}`, { password });
};

// Google Login
export const googleLogin = async (credential: string) => {
  const res = await api.post(`${BASE_URL}/google-login`, { credential });
  return res.data;
};
