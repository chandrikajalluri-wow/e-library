import api from '../api';

const BASE_URL = 'contact';

export const sendContactMessage = async (formData: { name: string; email: string; message: string }) => {
    const res = await api.post(BASE_URL, formData);
    return res.data;
};
