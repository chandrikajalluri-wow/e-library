import api from '../api';

api.defaults.baseURL = `${api.defaults.baseURL}/users`;

export const getDashboardStats = async () => {
    const res = await api.get('/dashboard-stats');
    return res.data;
};

export const getProfile = async () => {
    const res = await api.get('/me');
    return res.data;
};

export const updateProfile = async (name: string) => {
    const res = await api.put('/profile', { name });
    return res.data;
};

export const changePassword = async (passwordData: any) => {
    const res = await api.put('/change-password', passwordData);
    return res.data;
};

export const requestBook = async (requestData: any) => {
    const res = await api.post('/book-requests', requestData);
    return res.data;
};

// Admin Methods
export const getAllBookRequests = async () => {
    const res = await api.get('/admin/book-requests');
    return res.data;
};

export const updateBookRequestStatus = async (id: string, status: string) => {
    const res = await api.put(`/admin/book-requests/${id}`, { status });
    return res.data;
};

export const sendFineReminder = async (borrowId: string) => {
    const res = await api.post(`/admin/send-fine-reminder/${borrowId}`, {});
    return res.data;
};
