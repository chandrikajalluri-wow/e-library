import axios from 'axios';

const API_URL = 'https://e-library-7k5l.onrender.com/api/logs';

const getConfig = () => {
    const token = localStorage.getItem('token');
    return {
        headers: { Authorization: `Bearer ${token}` },
    };
};

export const getActivityLogs = async (): Promise<any[]> => {
    try {
        const res = await axios.get(API_URL, getConfig());
        return res.data;
    } catch (err) {
        console.error('Error fetching activity logs:', err);
        throw err;
    }
};
