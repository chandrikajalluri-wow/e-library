import axios from 'axios';

const API_URL = 'https://e-library-7k5l.onrender.com/api/users';

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
};

export const getDashboardStats = async () => {
    const res = await axios.get(`${API_URL}/dashboard-stats`, getAuthHeaders());
    return res.data;
};

export const getProfile = async () => {
    const res = await axios.get(`${API_URL}/me`, getAuthHeaders());
    return res.data;
};

export const updateProfile = async (name: string) => {
    const res = await axios.put(`${API_URL}/profile`, { name }, getAuthHeaders());
    return res.data;
};

export const changePassword = async (passwordData: any) => {
    const res = await axios.put(`${API_URL}/change-password`, passwordData, getAuthHeaders());
    return res.data;
};

export const requestBook = async (requestData: any) => {
    const res = await axios.post(`${API_URL}/book-requests`, requestData, getAuthHeaders());
    return res.data;
};

// Admin Methods
export const getAllBookRequests = async () => {
    const res = await axios.get(`${API_URL}/admin/book-requests`, getAuthHeaders());
    return res.data;
};

export const updateBookRequestStatus = async (id: string, status: string) => {
    const res = await axios.put(`${API_URL}/admin/book-requests/${id}`, { status }, getAuthHeaders());
    return res.data;
};

export const sendFineReminder = async (borrowId: string) => {
    const res = await axios.post(`${API_URL}/admin/send-fine-reminder/${borrowId}`, {}, getAuthHeaders());
    return res.data;
};
