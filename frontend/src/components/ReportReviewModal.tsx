import React, { useState } from 'react';
import '../styles/ReportReviewModal.css';
import Loader from './Loader';
import { Flag, X } from 'lucide-react';

interface ReportReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onReport: (reason: string) => Promise<void>;
    isLoading?: boolean;
}

const ReportReviewModal: React.FC<ReportReviewModalProps> = ({
    isOpen,
    onClose,
    onReport,
    isLoading = false
}) => {
    const [reason, setReason] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason.trim()) return;
        await onReport(reason);
        setReason('');
        onClose();
    };

    return (
        <div className="report-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="report-modal-container">
                <div className="report-modal-content">
                    <button className="report-modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>

                    <div className="report-modal-header">
                        <div className="report-icon-container">
                            <Flag size={24} className="report-flag-icon" />
                        </div>
                        <h2 className="report-modal-title">Report Content</h2>
                        <p className="report-modal-subtitle">Help us understand what's wrong with this review.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="report-modal-form">
                        <div className="report-form-group">
                            <label htmlFor="report-reason">Reason for reporting</label>
                            <textarea
                                id="report-reason"
                                className="report-textarea"
                                placeholder="Tell us why you're reporting this review (e.g., spam, inappropriate language, spoilers)..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                required
                                rows={5}
                                autoFocus
                            />
                        </div>

                        <div className="report-modal-actions">
                            <button
                                type="button"
                                className="report-btn-cancel"
                                onClick={onClose}
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="report-btn-submit"
                                disabled={isLoading || !reason.trim()}
                            >
                                {isLoading ? <Loader small /> : 'Submit Report'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ReportReviewModal;
