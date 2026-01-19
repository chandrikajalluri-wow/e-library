import React, { useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const AxiosInterceptor: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const interceptor = api.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response && (error.response.status === 401)) {
                    // Check if we are already on login page to avoid loops or unnecessary actions
                    // Whitelist public pages that might trigger 401 but shouldn't redirect
                    const publicPaths = ['/login', '/', '/signup'];
                    if (!publicPaths.includes(window.location.pathname)) {
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
            api.interceptors.response.eject(interceptor);
        };
    }, [navigate]);

    return null;
};

export default AxiosInterceptor;
