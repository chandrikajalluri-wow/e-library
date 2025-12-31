import axios from 'axios';

const API_URL = 'https://e-library-7k5l.onrender.com/api/contact';

export const sendContactMessage = async (formData: { name: string; email: string; message: string }) => {
    const res = await axios.post(API_URL, formData);
    return res.data;
};
