import api from '../api';

const BASE_URL = 'logs';

export const getActivityLogs = async (): Promise<any[]> => {
    try {
        const res = await api.get(BASE_URL);
        return res.data;
    } catch (err) {
        console.error('Error fetching activity logs:', err);
        throw err;
    }
};
