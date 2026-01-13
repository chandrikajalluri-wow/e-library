import api from '../api';

const BASE_URL = '/notifications';

// --- User Notification Services ---

export const getMyNotifications = async () => {
    const res = await api.get(`${BASE_URL}/my`);
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

export const getNotifications = async () => {
    const res = await api.get(`${BASE_URL}`);
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

// Alias for consistency if needed elsewhere
export const getAllNotifications = getNotifications;
