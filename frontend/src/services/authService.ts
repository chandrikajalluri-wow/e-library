import axios from 'axios';

const API = 'https://e-library-7k5l.onrender.com/api/auth';

// Signup
export const signup = async (name: string, email: string, password: string) => {
  await axios.post(`${API}/signup`, { name, email, password });
};

// Login
export const login = async (email: string, password: string) => {
  const res = await axios.post(`${API}/login`, { email, password });
  return res.data; // { token, role }
};

// Forgot Password -> sends reset link to email
export const forgotPassword = async (email: string) => {
  await axios.post(`${API}/forgot`, { email });
};

// Reset Password -> updates password in DB
export const resetPassword = async (token: string, password: string) => {
  await axios.post(`${API}/reset/${token}`, { password });
};
