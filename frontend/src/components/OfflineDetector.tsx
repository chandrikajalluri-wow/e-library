import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

const OfflineDetector: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    useEffect(() => {
        const handleOnline = () => {
            setIsOffline(false);
            toast.success('Back online! You can now access full features.', {
                position: 'top-center',
                autoClose: 3000,
            });
        };

        const handleOffline = () => {
            setIsOffline(true);
            toast.warning('You are currently offline. Access your Offline Library to read saved books.', {
                position: 'top-center',
                autoClose: false,
                closeOnClick: true,
            });
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return (
        <>
            {isOffline && (
                <div style={{
                    background: '#e67e22',
                    color: 'white',
                    textAlign: 'center',
                    padding: '0.5rem',
                    fontSize: '0.9rem',
                    zIndex: 9999,
                    position: 'sticky',
                    top: 0
                }}>
                    ⚠️ You are offline. Reading is limited to your <a href="/offline" style={{ color: 'white', fontWeight: 'bold', textDecoration: 'underline' }}>Offline Library</a>.
                </div>
            )}
            {children}
        </>
    );
};

export default OfflineDetector;
