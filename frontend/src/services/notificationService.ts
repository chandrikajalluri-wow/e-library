import api from '../api';

const BASE_URL = '/notifications';

export const getNotifications = async () => {
    const res = await api.get(BASE_URL);
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
