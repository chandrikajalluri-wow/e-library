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
                const token = localStorage.getItem('token');

                // Only trigger "Session expired" if the user WAS supposed to be logged in (has token)
                // AND we got a 401, AND they aren't already on a public page.
                if (error.response && error.response.status === 401 && token) {
                    const publicPaths = ['/login', '/', '/signup', '/about', '/contact', '/help', '/memberships'];
                    if (!publicPaths.includes(window.location.pathname)) {
                        localStorage.removeItem('token');
                        localStorage.removeItem('role');
                        localStorage.removeItem('userId');
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
