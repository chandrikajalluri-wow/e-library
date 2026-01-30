import React, { useState } from 'react';
import '../styles/PaymentModal.css'; // Reuse existing modal styles

interface CancellationModalProps {
    onClose: () => void;
    onConfirm: (reason: string) => void;
    isProcessing?: boolean;
}

const CancellationModal: React.FC<CancellationModalProps> = ({ onClose, onConfirm, isProcessing }) => {
    const [reason, setReason] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason.trim()) return;
        onConfirm(reason);
    };

    return (
        <div className="payment-modal-overlay" onClick={onClose}>
            <div className="payment-modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="payment-modal-close" onClick={onClose}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>

                <div className="payment-modal-header" style={{ marginBottom: '1.5rem' }}>
                    <h2 style={{ color: 'var(--text-primary)' }}>Cancel Membership</h2>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                        We're sorry to see you go. Please tell us why you want to cancel your premium membership.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="payment-form">
                    <div className="payment-form-group">
                        <label style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Reason for cancellation</label>
                        <textarea
                            placeholder="Please provide a reason..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                minHeight: '120px',
                                padding: '0.75rem',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                fontSize: '1rem',
                                resize: 'vertical',
                                marginTop: '0.5rem'
                            }}
                        />
                    </div>

                    <div className="payment-info" style={{ marginTop: '1.5rem' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                        <span>Your membership will be immediately moved to the Basic plan.</span>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={onClose}
                            style={{ flex: 1, padding: '0.75rem' }}
                            disabled={isProcessing}
                        >
                            Go Back
                        </button>
                        <button
                            type="submit"
                            className="btn-danger"
                            disabled={isProcessing || !reason.trim()}
                            style={{
                                flex: 1,
                                padding: '0.75rem',
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: 600,
                                cursor: isProcessing || !reason.trim() ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {isProcessing ? 'Processing...' : 'Confirm Cancellation'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CancellationModal;
