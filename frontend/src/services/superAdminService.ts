import api from '../api';

export const getAllUsers = async () => {
    const response = await api.get('/super-admin/users');
    return response.data;
};

export const manageAdmin = async (userId: string, action: 'promote' | 'demote') => {
    const response = await api.post('/super-admin/manage-admin', { userId, action });
    return response.data;
};

export const deleteUser = async (userId: string) => {
    const response = await api.delete(`/super-admin/user/${userId}`);
    return response.data;
};

export const getSystemLogs = async () => {
    const response = await api.get('/super-admin/system-logs');
    return response.data;
};

export const getSystemMetrics = async () => {
    const response = await api.get('/super-admin/metrics');
    return response.data;
};

export const getAnnouncements = async () => {
    const response = await api.get('/super-admin/announcements');
    return response.data;
};

export const createAnnouncement = async (title: string, content: string) => {
    const response = await api.post('/super-admin/announcements', { title, content });
    return response.data;
};

export const deleteAnnouncement = async (id: string) => {
    const response = await api.delete(`/super-admin/announcements/${id}`);
    return response.data;
};

export const getAllReviews = async () => {
    const response = await api.get('/super-admin/reviews');
    return response.data;
};

export const deleteReview = async (id: string) => {
    const response = await api.delete(`/super-admin/review/${id}`);
    return response.data;
};
