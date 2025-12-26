import React, { useState } from 'react';
import { payFine } from '../services/borrowService';
import { toast } from 'react-toastify';
import Loader from './Loader';
import '../styles/FinePaymentModal.css';

interface FinePaymentModalProps {
    borrow: any;
    onClose: () => void;
    onSuccess: () => void;
}

const FinePaymentModal: React.FC<FinePaymentModalProps> = ({ borrow, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'details' | 'processing' | 'success'>('details');

    const calculateFine = () => {
        let fine = borrow.fine_amount || 0;
        if (borrow.status !== 'returned' && borrow.status !== 'archived' && new Date() > new Date(borrow.return_date)) {
            const diffTime = Math.abs(new Date().getTime() - new Date(borrow.return_date).getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            fine += diffDays * 10;
        }
        return fine;
    };

    const fineAmount = calculateFine();

    const handlePay = async () => {
        setLoading(true);
        setStep('processing');
        try {
            // Fake delay for realistic feel
            await new Promise(resolve => setTimeout(resolve, 2000));
            await payFine(borrow._id);
            setStep('success');
            toast.success('Payment successful!');
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 2000);
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.error || 'Payment failed');
            setStep('details');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                {step === 'details' && (
                    <>
                        <h2 className="modal-title">Settle Outstanding Fine</h2>
                        <p className="modal-description">
                            You have an outstanding fine for <strong>{borrow.book_id?.title}</strong>.
                            Please pay the fine to proceed with the return request.
                        </p>

                        <div className="fine-amount-box">
                            <div className="fine-amount-row">
                                <span className="fine-amount-label">Total Fine Amount</span>
                                <span className="fine-amount-value">₹{fineAmount.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="payment-method-container">
                            <label className="payment-method-label">Payment Method</label>
                            <div className="payment-method-box">
                                <div className="payment-method-icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                                </div>
                                <div>
                                    <div className="payment-method-info">Secure Online Payment</div>
                                    <div className="payment-method-subtext">Credit / Debit / UPI</div>
                                </div>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button
                                onClick={onClose}
                                className="btn-secondary btn-cancel"
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePay}
                                className="btn-primary btn-pay"
                                disabled={loading}
                            >
                                Pay Now
                            </button>
                        </div>
                    </>
                )}

                {step === 'processing' && (
                    <div className="processing-container">
                        <Loader />
                        <h3>Processing Payment...</h3>
                        <p className="modal-description">Please do not close this window</p>
                    </div>
                )}

                {step === 'success' && (
                    <div className="success-container">
                        <div className="success-icon-box">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                        <h2 className="success-title">Payment Successful!</h2>
                        <p className="modal-description">The fine has been settled. You can now request the book return.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FinePaymentModal;
