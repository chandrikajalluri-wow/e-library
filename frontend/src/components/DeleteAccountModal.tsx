import React, { useState } from 'react';
import { deleteAccount } from '../services/userService';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

interface DeleteAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({ isOpen, onClose }) => {
    const [step, setStep] = useState(1);
    const [password, setPassword] = useState('');
    const [understood, setUnderstood] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    if (!isOpen) return null;

    const handleDelete = async () => {
        if (!understood) {
            return toast.error("Please confirm that you understand this action is permanent.");
        }
        if (!password) {
            return toast.error("Password is required to confirm deletion.");
        }

        setLoading(true);
        try {
            const res = await deleteAccount(password);
            toast.success(res.message);
            // Logout and redirect
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            localStorage.removeItem('userId');
            navigate('/');
            window.location.reload(); // To clear app state
        } catch (err: any) {
            const errorMsg = err.response?.data?.error || "Failed to delete account";
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content confirmation-modal danger saas-reveal" style={{ maxWidth: '500px' }}>
                <div className="modal-header">
                    <h2 className="modal-title danger-title">
                        {step === 1 ? 'Delete your account?' : 'Confirm your identity'}
                    </h2>
                </div>

                <div className="modal-body">
                    {step === 1 ? (
                        <>
                            <div className="danger-zone-warning" style={{ color: '#ef4444', fontWeight: 600, marginBottom: '1rem' }}>
                                This action is permanent and cannot be undone.
                            </div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                                All your data including:
                                <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem' }}>
                                    <li>Borrowed books history</li>
                                    <li>Wishlist items</li>
                                    <li>Reviews & ratings</li>
                                    <li>Notifications</li>
                                    <li>Profile information</li>
                                </ul>
                                will be permanently deleted from our servers.
                            </p>
                        </>
                    ) : (
                        <div className="reauth-form">
                            <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
                                For your security, please enter your password to confirm this action.
                            </p>
                            <div className="form-group">
                                <label>Confirm Password</label>
                                <input
                                    type="password"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="form-control"
                                    autoFocus
                                />
                            </div>
                            <label className="checkbox-label" style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={understood}
                                    onChange={(e) => setUnderstood(e.target.checked)}
                                    style={{ width: '16px', height: '16px', margin: 0, cursor: 'pointer', flexShrink: 0 }}
                                />
                                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', userSelect: 'none', lineHeight: 1 }}>
                                    I understand that this action cannot be undone
                                </span>
                            </label>
                        </div>
                    )}
                </div>

                <div className="modal-actions" style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button className="btn-secondary" onClick={onClose} disabled={loading}>
                        Cancel
                    </button>
                    {step === 1 ? (
                        <button className="btn-danger" onClick={() => setStep(2)}>
                            Continue
                        </button>
                    ) : (
                        <button className="btn-danger" onClick={handleDelete} disabled={loading || !understood || !password}>
                            {loading ? 'Deleting...' : 'Permanently Delete'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DeleteAccountModal;
