import axios from 'axios';

// Default to localhost if environment variable is not set
let API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Ensure trailing slash for reliable relative path joining
if (!API_URL.endsWith('/')) {
    API_URL += '/';
}

const api = axios.create({
    baseURL: API_URL,
});

// Request interceptor to add the auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
