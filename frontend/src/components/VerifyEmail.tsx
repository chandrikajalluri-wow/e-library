import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/VerifyEmail.css';

const VerifyEmail: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const [status, setStatus] = useState<
        'verifying' | 'success' | 'error'
    >('verifying');
    const [message, setMessage] = useState('');
    const hasCalledVerify = useRef(false);

    useEffect(() => {
        const verify = async () => {
            if (hasCalledVerify.current) return;
            hasCalledVerify.current = true;

            try {
                await axios.get(`https://e-library-7k5l.onrender.com/api/auth/verify/${token}`);
                setStatus('success');
                setTimeout(() => {
                    navigate('/login');
                }, 3000);
            } catch (err: any) {
                setStatus('error');
                setMessage(
                    err.response?.data?.error || 'Verification failed. Invalid token.'
                );
            }
        };

        if (token) {
            verify();
        }
    }, [token, navigate]);

    return (
        <div className="verify-container">
            {status === 'verifying' && <h2>Verifying your email...</h2>}
            {status === 'success' && (
                <div>
                    <h2 className="verify-success">Email Verified Successfully!</h2>
                    <p>Redirecting to login...</p>
                </div>
            )}
            {status === 'error' && (
                <div>
                    <h2 className="verify-error">Verification Failed</h2>
                    <p>{message}</p>
                </div>
            )}
        </div>
    );
};

export default VerifyEmail;
