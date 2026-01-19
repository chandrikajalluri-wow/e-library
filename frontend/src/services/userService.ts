import api from '../api';

const BASE_URL = 'users';

export const getDashboardStats = async () => {
    const res = await api.get(`${BASE_URL}/dashboard-stats`);
    return res.data;
};

export const getProfile = async () => {
    const res = await api.get(`${BASE_URL}/me`);
    return res.data;
};

export const updateProfile = async (formData: FormData) => {
    const res = await api.put(`${BASE_URL}/profile`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
};

export const changePassword = async (passwordData: any) => {
    const res = await api.put(`${BASE_URL}/change-password`, passwordData);
    return res.data;
};

export const renewMembership = async () => {
    const res = await api.post(`${BASE_URL}/renew-membership`, {});
    return res.data;
};

export const requestBook = async (requestData: any) => {
    const res = await api.post(`${BASE_URL}/book-requests`, requestData);
    return res.data;
};

// Admin Methods
export const getAllBookRequests = async () => {
    const res = await api.get(`${BASE_URL}/admin/book-requests`);
    return res.data;
};

export const updateBookRequestStatus = async (id: string, status: string) => {
    const res = await api.put(`${BASE_URL}/admin/book-requests/${id}`, { status });
    return res.data;
};

export const sendFineReminder = async (borrowId: string) => {
    const res = await api.post(`${BASE_URL}/admin/send-fine-reminder/${borrowId}`, {});
    return res.data;
};

export const getSessions = async () => {
    const res = await api.get(`${BASE_URL}/sessions`);
    return res.data;
};

export const logoutAll = async () => {
    const res = await api.post(`${BASE_URL}/logout-all`, {});
    return res.data;
};

export const deleteAccount = async (password: string) => {
    const res = await api.delete(`${BASE_URL}/me`, { data: { password } });
    return res.data;
};
