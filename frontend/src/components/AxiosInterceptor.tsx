import React, { useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const AxiosInterceptor: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const interceptor = axios.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response && (error.response.status === 401)) {
                    // Check if we are already on login page to avoid loops or unnecessary actions
                    if (window.location.pathname !== '/login') {
                        localStorage.removeItem('token');
                        localStorage.removeItem('role');
                        toast.error('Session expired. Please login again.');
                        navigate('/login');
                    }
                }
                return Promise.reject(error);
            }
        );

        return () => {
            axios.interceptors.response.eject(interceptor);
        };
    }, [navigate]);

    return null;
};

export default AxiosInterceptor;
