import axios from 'axios';

const API_URL = 'https://e-library-7k5l.onrender.com/api/notifications';

const getConfig = () => {
    const token = localStorage.getItem('token');
    return {
        headers: { Authorization: `Bearer ${token}` },
    };
};

export const getNotifications = async () => {
    const res = await axios.get(API_URL, getConfig());
    return res.data;
};

export const markAsRead = async (id: string) => {
    const res = await axios.put(`${API_URL}/${id}/read`, {}, getConfig());
    return res.data;
};

export const markAllAsRead = async () => {
    const res = await axios.put(`${API_URL}/read-all`, {}, getConfig());
    return res.data;
};
