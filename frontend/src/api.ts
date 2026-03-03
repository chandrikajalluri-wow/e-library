import axios from 'axios';

// Default to localhost if environment variable is not set
let API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Ensure trailing slash for reliable relative path joining
if (!API_URL.endsWith('/')) {
    API_URL += '/';
}

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    timeout: 15000,
});

export default api;
