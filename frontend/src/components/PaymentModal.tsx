import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { upgradeMembership, type Membership } from '../services/membershipService';
import '../styles/PaymentModal.css';

interface PaymentModalProps {
    membership: Membership;
    onClose: () => void;
    onSuccess: () => void;
    onSubmit?: () => Promise<void>;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ membership, onClose, onSuccess, onSubmit }) => {
    const [cardNumber, setCardNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvv, setCvv] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Basic validation
        if (!cardNumber || !expiry || !cvv) {
            toast.error('Please fill in all payment details');
            return;
        }

        if (cardNumber.length !== 16) {
            toast.error('Card number must be 16 digits');
            return;
        }

        if (cvv.length !== 3) {
            toast.error('CVV must be 3 digits');
            return;
        }

        setIsProcessing(true);

        // Simulate payment processing
        setTimeout(async () => {
            try {
                if (onSubmit) {
                    await onSubmit();
                    toast.success('Membership renewed successfully!');
                } else {
                    await upgradeMembership(membership._id);
                    toast.success(`Successfully upgraded to ${membership.displayName} membership!`);
                }
                onSuccess();
                onClose();
            } catch (err: any) {
                toast.error(err.response?.data?.error || 'Payment failed');
            } finally {
                setIsProcessing(false);
            }
        }, 1500);
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

                <div className="payment-modal-header">
                    <h2>{onSubmit ? 'Renew Plan' : `Upgrade to ${membership.displayName}`}</h2>
                    <p className="payment-modal-price">₹{membership.price}/month</p>
                </div>

                <form onSubmit={handleSubmit} className="payment-form">
                    <div className="payment-form-group">
                        <label>Card Number</label>
                        <input
                            type="text"
                            placeholder="1234 5678 9012 3456"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                            maxLength={16}
                            required
                        />
                    </div>

                    <div className="payment-form-row">
                        <div className="payment-form-group">
                            <label>Expiry Date</label>
                            <input
                                type="text"
                                placeholder="MM/YY"
                                value={expiry}
                                onChange={(e) => {
                                    let value = e.target.value.replace(/\D/g, '');
                                    if (value.length >= 2) {
                                        value = value.slice(0, 2) + '/' + value.slice(2, 4);
                                    }
                                    setExpiry(value);
                                }}
                                maxLength={5}
                                required
                            />
                        </div>

                        <div className="payment-form-group">
                            <label>CVV</label>
                            <input
                                type="text"
                                placeholder="123"
                                value={cvv}
                                onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                                maxLength={3}
                                required
                            />
                        </div>
                    </div>

                    <div className="payment-info">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                        <span>This is a demo payment. No actual charges will be made.</span>
                    </div>

                    <button
                        type="submit"
                        className="payment-submit-btn"
                        disabled={isProcessing}
                    >
                        {isProcessing ? 'Processing...' : `Pay ₹${membership.price}`}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default PaymentModal;
