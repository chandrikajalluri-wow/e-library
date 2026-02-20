import api from '../api';

const BASE_URL = '/notifications';

// --- User Notification Services ---

export const getMyNotifications = async (params?: any) => {
    const res = await api.get(`${BASE_URL}/my`, { params });
    return res.data;
};

export const markNotificationRead = async (id: string) => {
    const res = await api.put(`${BASE_URL}/read/${id}`);
    return res.data;
};

export const markAllNotificationsRead = async () => {
    const res = await api.put(`${BASE_URL}/read-all/my`);
    return res.data;
};


// --- Admin Notification Services ---

export const getNotifications = async (params?: any) => {
    const res = await api.get(`${BASE_URL}`, { params });
    return res.data;
};

export const markAsRead = async (id: string) => {
    const res = await api.put(`${BASE_URL}/${id}/read`);
    return res.data;
};

export const markAllAsRead = async () => {
    const res = await api.put(`${BASE_URL}/read-all`);
    return res.data;
};

export const notifyStockAlert = async (book_id: string) => {
    const res = await api.post(`${BASE_URL}/stock-alert`, { book_id });
    return res.data;
};

// Alias for consistency if needed elsewhere
export const getAllNotifications = getNotifications;
