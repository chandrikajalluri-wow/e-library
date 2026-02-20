import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { CheckCircle, XCircle, Loader, Mail, User, Clock, Eye, EyeOff } from 'lucide-react';
import api from '../api';
import '../styles/AcceptAdminInvite.css';

const AcceptAdminInvite: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState(false);
    const [showAccountSetup, setShowAccountSetup] = useState(false);
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

    const handleAcceptInviteClick = () => {
        setShowAccountSetup(true);
    };

    const handleFinalSubmit = async () => {
        if (!token) return;

        if (!name.trim()) {
            toast.error('Please enter your full name');
            return;
        }

        const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            toast.error('Password must be at least 8 characters long and contain at least one uppercase letter, one number, and one special character');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setAccepting(true);
        try {
            const response = await api.post('/admin-invite/accept-invite', {
                token,
                name,
                password
            });
            toast.success(response.data.message || 'Admin account setup successfully!');
            setAccepted(true);

            // Redirect to login after 2 seconds
            setTimeout(() => {
                navigate('/login', { state: { message: 'Please log in with your new admin credentials' } });
            }, 2000);
        } catch (err: any) {
            console.error('Accept invite error:', err);
            toast.error(err.response?.data?.error || 'Failed to accept invitation');
            setAccepting(false);
        }
    };

    const handleDeclineInvite = async () => {
        if (!token) return;

        try {
            await api.post('/admin-invite/decline-invite', { token });
            toast.info('Invitation declined. Redirecting to login...');
            setTimeout(() => {
                navigate('/login', { state: { message: 'Invitation declined. You can continue as a regular user.' } });
            }, 2000);
        } catch (err: any) {
            console.error('Decline invite error:', err);
            // Even if it fails, navigate to login as the user wants out
            navigate('/login');
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
                {!showAccountSetup ? (
                    <>
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
                                <li>Manage categories</li>
                                <li>Handling chat support</li>
                            </ul>
                        </div>

                        <div className="invite-actions">
                            <button
                                onClick={handleAcceptInviteClick}
                                className="btn-accept"
                            >
                                Accept Invitation
                            </button>
                            <button onClick={handleDeclineInvite} className="btn-decline">
                                Decline
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="invite-header">
                            <div className="invite-icon-wrapper">
                                <User size={48} className="invite-icon" />
                            </div>
                            <h1>Account Setup</h1>
                            <p className="invite-subtitle">Complete your profile to activate admin access</p>
                        </div>

                        <div className="account-setup-form">
                            <div className="form-group">
                                <label>Full Name</label>
                                <div className="input-wrapper">
                                    <input
                                        type="text"
                                        placeholder="John Doe"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Create Password</label>
                                <div className="input-wrapper">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="toggle-password"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Confirm Password</label>
                                <div className="input-wrapper">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="toggle-password"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="invite-actions">
                            <button
                                onClick={handleFinalSubmit}
                                disabled={accepting}
                                className="btn-accept"
                            >
                                {accepting ? (
                                    <>
                                        <Loader className="btn-spinner" size={18} />
                                        Setting Up...
                                    </>
                                ) : (
                                    'Complete & Join'
                                )}
                            </button>
                            <button onClick={() => setShowAccountSetup(false)} className="btn-secondary">
                                Back
                            </button>
                        </div>
                    </>
                )}

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
