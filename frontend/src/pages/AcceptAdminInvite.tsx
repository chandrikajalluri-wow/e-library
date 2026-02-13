import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { CheckCircle, XCircle, Loader, Mail, User, Clock } from 'lucide-react';
import api from '../api';
import '../styles/AcceptAdminInvite.css';

const AcceptAdminInvite: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState(false);
    const [inviteDetails, setInviteDetails] = useState<{
        email: string;
        inviterName: string;
        expiresAt: string;
        isValid: boolean;
    } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [accepted, setAccepted] = useState(false);

    useEffect(() => {
        if (!token) {
            setError('Invalid invitation link - no token provided');
            setLoading(false);
            return;
        }

        verifyToken();
    }, [token]);

    const verifyToken = async () => {
        try {
            const response = await api.get(`/admin-invite/verify-invite/${token}`);
            setInviteDetails(response.data);
            setLoading(false);
        } catch (err: any) {
            console.error('Token verification error:', err);
            setError(err.response?.data?.error || 'Invalid or expired invitation link');
            setLoading(false);
        }
    };

    const handleAcceptInvite = async () => {
        if (!token) return;

        setAccepting(true);
        try {
            const response = await api.post('/admin-invite/accept-invite', { token });
            toast.success(response.data.message || 'Admin invitation accepted successfully!');
            setAccepted(true);

            // Redirect to login after 2 seconds
            setTimeout(() => {
                navigate('/login', { state: { message: 'Please log in with your new admin privileges' } });
            }, 2000);
        } catch (err: any) {
            console.error('Accept invite error:', err);
            toast.error(err.response?.data?.error || 'Failed to accept invitation');
            setAccepting(false);
        }
    };

    if (loading) {
        return (
            <div className="accept-invite-container">
                <div className="accept-invite-card loading-card">
                    <Loader className="loading-spinner" size={48} />
                    <p>Verifying your invitation...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="accept-invite-container">
                <div className="accept-invite-card error-card">
                    <XCircle size={64} className="error-icon" />
                    <h2>Invalid Invitation</h2>
                    <p className="error-message">{error}</p>
                    <button onClick={() => navigate('/')} className="btn-secondary">
                        Go to Home
                    </button>
                </div>
            </div>
        );
    }

    if (accepted) {
        return (
            <div className="accept-invite-container">
                <div className="accept-invite-card success-card">
                    <CheckCircle size={64} className="success-icon" />
                    <h2>Welcome to the Admin Team!</h2>
                    <p>Your admin privileges have been activated.</p>
                    <p className="redirect-message">Redirecting to login...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="accept-invite-container">
            <div className="accept-invite-card">
                <div className="invite-header">
                    <div className="invite-icon-wrapper">
                        <CheckCircle size={48} className="invite-icon" />
                    </div>
                    <h1>Admin Invitation</h1>
                    <p className="invite-subtitle">You've been invited to join the BookStack admin team</p>
                </div>

                <div className="invite-details">
                    <div className="detail-row">
                        <Mail size={20} />
                        <div className="detail-content">
                            <span className="detail-label">Your Email</span>
                            <span className="detail-value">{inviteDetails?.email}</span>
                        </div>
                    </div>

                    <div className="detail-row">
                        <User size={20} />
                        <div className="detail-content">
                            <span className="detail-label">Invited By</span>
                            <span className="detail-value">{inviteDetails?.inviterName}</span>
                        </div>
                    </div>

                    <div className="detail-row">
                        <Clock size={20} />
                        <div className="detail-content">
                            <span className="detail-label">Expires At</span>
                            <span className="detail-value">
                                {inviteDetails?.expiresAt
                                    ? new Date(inviteDetails.expiresAt).toLocaleString('en-IN', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })
                                    : 'N/A'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="invite-permissions">
                    <h3>As an admin, you'll be able to:</h3>
                    <ul>
                        <li>Manage the book collection</li>
                        <li>Handle user requests and orders</li>
                        <li>Monitor system activity</li>
                        <li>Access advanced analytics</li>
                    </ul>
                </div>

                <div className="invite-actions">
                    <button
                        onClick={handleAcceptInvite}
                        disabled={accepting}
                        className="btn-accept"
                    >
                        {accepting ? (
                            <>
                                <Loader className="btn-spinner" size={18} />
                                Accepting...
                            </>
                        ) : (
                            'Accept Invitation'
                        )}
                    </button>
                    <button onClick={() => navigate('/')} className="btn-decline">
                        Decline
                    </button>
                </div>

                <div className="invite-security-notice">
                    <p>
                        🔒 <strong>Security Notice:</strong> This invitation link is unique and can only be used once.
                        If you did not expect this invitation, please contact support immediately.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AcceptAdminInvite;
