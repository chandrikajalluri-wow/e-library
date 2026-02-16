import React, { useEffect, useState } from 'react';
import { getAllReviews, deleteReview } from '../../services/superAdminService';
import { toast } from 'react-toastify';
import ConfirmationModal from '../ConfirmationModal';

const ContentModeration: React.FC = () => {
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Modal State
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    const fetchReviews = async () => {
        setLoading(true);
        try {
            const data = await getAllReviews();
            setReviews(data);
        } catch (err) {
            console.error(err);
            toast.error('Failed to fetch reviews');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReviews();
    }, []);

    const confirmDelete = (id: string) => {
        setSelectedId(id);
        setModalOpen(true);
    };

    const handleDelete = async () => {
        if (!selectedId) return;
        try {
            await deleteReview(selectedId);
            toast.success('Review deleted');
            fetchReviews();
        } catch (err) {
            toast.error('Failed to delete review');
        } finally {
            setModalOpen(false);
            setSelectedId(null);
        }
    };

    return (
        <div className="card admin-table-section">
            <div className="admin-table-header-box">
                <h3 className="admin-table-title">Content Moderation</h3>
                <button onClick={fetchReviews} className="admin-refresh-stats-btn btn-compact">
                    Refresh
                </button>
            </div>
            <div className="admin-table-wrapper">
                {loading ? (
                    <div className="admin-loading-container"><div className="spinner"></div></div>
                ) : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>User</th>
                                <th>Book</th>
                                <th>Rating</th>
                                <th>Comment</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reviews.map(review => (
                                <tr key={review._id}>
                                    <td className="table-cell-date">
                                        {new Date(review.reviewed_at).toLocaleDateString()}
                                    </td>
                                    <td>
                                        <div className="user-info-box">
                                            <span className="user-main-name">{review.user_id?.name || 'Unknown'}</span>
                                            <span className="user-sub-email">{review.user_id?.email}</span>
                                        </div>
                                    </td>
                                    <td><span className="book-main-title">{review.book_id?.title || 'Unknown'}</span></td>
                                    <td><span className="table-cell-rating-star">★ {review.rating}</span></td>
                                    <td className="table-cell-comment">{review.comment}</td>
                                    <td className="admin-actions-cell">
                                        <button onClick={() => confirmDelete(review._id)} className="admin-btn-delete">Remove</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {reviews.length === 0 && !loading && <div className="admin-empty-state">No reviews found.</div>}
            </div>

            <ConfirmationModal
                isOpen={modalOpen}
                title="Delete Review"
                message="Are you sure you want to delete this review? This action cannot be undone."
                onConfirm={handleDelete}
                onCancel={() => setModalOpen(false)}
                confirmText="Delete"
                type="danger"
            />
        </div>
    );
};

export default ContentModeration;
