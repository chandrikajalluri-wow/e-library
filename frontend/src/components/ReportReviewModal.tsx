import React, { useState } from 'react';
import '../styles/ConfirmationModal.css'; // Reusing modal styles
import Loader from './Loader';

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
        <div className="modal-overlay">
            <div className="modal-content confirmation-modal warning">
                <div className="modal-header">
                    <h2 className="modal-title">Report Review</h2>
                </div>
                <div className="modal-body">
                    <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                        Please provide a reason for reporting this review. This helps our moderators keep the community safe.
                    </p>
                    <form onSubmit={handleSubmit} id="report-form">
                        <textarea
                            className="form-textarea-field"
                            placeholder="Reason for reporting..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            required
                            rows={4}
                            autoFocus
                        />
                    </form>
                </div>
                <div className="modal-actions">
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="report-form"
                        className="btn-primary btn-danger"
                        disabled={isLoading || !reason.trim()}
                    >
                        {isLoading ? <Loader small /> : 'Submit Report'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReportReviewModal;
