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

const ReportedReviews: React.FC = () => {
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
                    <h3 className="section-title">Reported Reviews</h3>
                    <p className="section-subtitle">Moderation queue for user reports</p>
                </div>
                <div className="admin-premium-label" style={{ fontSize: '0.9rem', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fee2e2', color: '#dc2626' }}>
                    <AlertTriangle size={18} />
                    {reviews.length} Pending
                </div>
            </div>

            <div className="reports-grid">
                {reviews.length === 0 ? (
                    <div className="admin-empty-state">
                        <CheckCircle size={48} className="text-green-500 mb-3" style={{ color: '#10b981', marginBottom: '1rem' }} />
                        <p style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>All caught up!</p>
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
                                        <BookOpen size={18} style={{ opacity: 0.5 }} />
                                        <span>{review.book_id?.title}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                        <span>by {review.user_id?.name}</span>
                                        <span>•</span>
                                        <span style={{ color: '#f59e0b' }}>{'★'.repeat(review.rating)}</span>
                                    </div>
                                </div>

                                <div className="report-comment-box">
                                    <MessageCircle size={16} className="report-comment-icon" />
                                    <div>"{review.comment}"</div>
                                </div>

                                <div style={{ marginBottom: '1rem' }}>
                                    <h5 className="report-reasons-title">Report Reasons</h5>
                                    {review.reports.map((report, idx) => (
                                        <div key={idx} className="report-reason-item">
                                            <AlertTriangle size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                                            <span><span style={{ fontWeight: 700 }}>{report.user_id?.name}:</span> {report.reason}</span>
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
                                        className="admin-btn-delete"
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
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
