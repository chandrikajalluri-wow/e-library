import React, { useEffect, useState } from 'react';
import { getReportedReviews, dismissReviewReports, deleteReview } from '../../services/superAdminService';
import { AlertTriangle, Trash2, CheckCircle, BookOpen, MessageCircle } from 'lucide-react';
import ConfirmationModal from '../ConfirmationModal';

interface Review {
    _id: string;
    user_id: { _id: string; name: string; email: string };
    book_id: { _id: string; title: string };
    rating: number;
    comment: string;
    reports: {
        user_id: { name: string; email: string };
        reason: string;
        reported_at: string;
    }[];
    reviewed_at: string;
}

interface ReportedReviewsProps {
    hideTitle?: boolean;
}

const ReportedReviews: React.FC<ReportedReviewsProps> = ({ hideTitle = false }) => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionId, setActionId] = useState<string | null>(null);
    const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; type: 'dismiss' | 'delete' | null }>({
        isOpen: false,
        type: null
    });

    useEffect(() => {
        fetchReviews();
    }, []);

    const fetchReviews = async () => {
        try {
            setLoading(true);
            const data = await getReportedReviews();
            setReviews(data);
        } catch (err) {
            console.error('Failed to fetch reported reviews', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDismiss = async () => {
        if (!actionId) return;
        try {
            await dismissReviewReports(actionId);
            setReviews(prev => prev.filter(r => r._id !== actionId));
            setModalConfig({ isOpen: false, type: null });
        } catch (err) {
            console.error('Failed to dismiss reports', err);
        }
    };

    const handleDelete = async () => {
        if (!actionId) return;
        try {
            await deleteReview(actionId);
            setReviews(prev => prev.filter(r => r._id !== actionId));
            setModalConfig({ isOpen: false, type: null });
        } catch (err) {
            console.error('Failed to delete review', err);
        }
    };

    const openModal = (id: string, type: 'dismiss' | 'delete') => {
        setActionId(id);
        setModalConfig({ isOpen: true, type });
    };

    if (loading) return <div className="admin-loading-container"><div className="spinner"></div><p>Loading reports...</p></div>;

    return (
        <div className="admin-section-container">
            <div className="admin-section-header">
                <div>
                    {!hideTitle && (
                        <>
                            <h3 className="section-title">Reported Reviews</h3>
                            <p className="section-subtitle">Moderation queue for user reports</p>
                        </>
                    )}
                </div>
                <div className="reported-reviews-premium-label">
                    <AlertTriangle size={18} />
                    {reviews.length} Pending
                </div>
            </div>

            <div className="reports-grid">
                {reviews.length === 0 ? (
                    <div className="admin-empty-state">
                        <CheckCircle size={48} className="text-success mb-4" />
                        <p className="mb-2" style={{ color: 'var(--text-primary)' }}>All caught up!</p>
                        <p className="section-subtitle">No reported reviews pending moderation.</p>
                    </div>
                ) : (
                    reviews.map(review => (
                        <div key={review._id} className="report-card">
                            <div className="report-card-header-warning">
                                <span>Reported Content</span>
                                <span>{review.reports.length} Report{review.reports.length !== 1 ? 's' : ''}</span>
                            </div>

                            <div className="report-content">
                                <div className="report-book-info">
                                    <div className="report-book-title">
                                        <BookOpen size={18} className="opacity-50" />
                                        <span>{review.book_id?.title}</span>
                                    </div>
                                    <div className="book-info-meta">
                                        <span>by {review.user_id?.name}</span>
                                        <span>•</span>
                                        <span className="text-warning">{'★'.repeat(review.rating)}</span>
                                    </div>
                                </div>

                                <div className="report-comment-box">
                                    <MessageCircle size={16} className="report-comment-icon" />
                                    <div>"{review.comment}"</div>
                                </div>

                                <div className="mb-4">
                                    <h5 className="report-reasons-title">Report Reasons</h5>
                                    {review.reports.map((report, idx) => (
                                        <div key={idx} className="report-reason-item">
                                            <AlertTriangle size={14} className="mt-xs flex-shrink-0" />
                                            <span><span className="font-semibold">{report.user_id?.name}:</span> {report.reason}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="report-actions">
                                    <button
                                        onClick={() => openModal(review._id, 'dismiss')}
                                        className="report-btn-dismiss"
                                    >
                                        Dismiss Reports
                                    </button>
                                    <button
                                        onClick={() => openModal(review._id, 'delete')}
                                        className="admin-btn-delete delete-review-btn-flex"
                                    >
                                        <Trash2 size={16} />
                                        Delete Review
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <ConfirmationModal
                isOpen={modalConfig.isOpen}
                title={modalConfig.type === 'delete' ? 'Delete Review' : 'Dismiss Reports'}
                message={modalConfig.type === 'delete'
                    ? "Are you sure you want to permanently delete this review? This action cannot be undone."
                    : "Are you sure you want to dismiss all reports for this review? It will remain visible on the site."}
                onConfirm={modalConfig.type === 'delete' ? handleDelete : handleDismiss}
                onCancel={() => setModalConfig({ isOpen: false, type: null })}
                type={modalConfig.type === 'delete' ? 'danger' : 'warning'}
                confirmText={modalConfig.type === 'delete' ? 'Delete Review' : 'Dismiss'}
            />
        </div>
    );
};

export default ReportedReviews;
