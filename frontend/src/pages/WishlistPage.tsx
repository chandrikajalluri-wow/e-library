import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getWishlist, removeFromWishlist } from '../services/wishlistService';
import { toast } from 'react-toastify';
import Loader from '../components/Loader';
import ConfirmationModal from '../components/ConfirmationModal';
import '../styles/UserDashboard.css'; // Reusing dashboard or common styles

const WishlistPage: React.FC = () => {
    const [wishlist, setWishlist] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        isLoading: boolean;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        isLoading: false
    });

    useEffect(() => {
        fetchWishlist();
    }, []);

    const fetchWishlist = async () => {
        try {
            setLoading(true);
            const data = await getWishlist();
            setWishlist(data);
        } catch (err) {
            toast.error('Failed to load wishlist');
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Remove from Wishlist',
            message: 'Are you sure you want to remove this book from your wishlist?',
            isLoading: false,
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isLoading: true }));
                try {
                    await removeFromWishlist(id);
                    toast.success('Removed from wishlist');
                    fetchWishlist();
                    setConfirmModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
                } catch (err) {
                    toast.error('Failed to remove');
                    setConfirmModal(prev => ({ ...prev, isLoading: false }));
                }
            }
        });
    };

    if (loading) return <Loader />;

    return (
        <div className="wishlist-page">
            <header className="admin-header">
                <h2 className="admin-header-title">My Wishlist</h2>
                <p className="admin-header-subtitle">Your personally curated collection of must-reads</p>
            </header>

            <div className="grid-books"> {/* Reusing grid-books styles */}
                {wishlist.map((item) => {
                    const book = item.book_id;
                    if (!book) return null;
                    return (
                        <div key={item._id} className="card book-card">
                            <div className="book-cover-container">
                                {book.cover_image_url ? (
                                    <img src={book.cover_image_url} alt={book.title} className="book-cover-img" loading="lazy" />
                                ) : (
                                    <div className="no-image-placeholder">No Image</div>
                                )}
                            </div>
                            <div className="book-info-container">
                                <div className="book-category-tag">
                                    {book.genre || 'Book'}
                                </div>
                                <h3 className="book-title-h3">{book.title}</h3>
                                <p className="book-author-p">{book.author}</p>

                                <div className="book-footer">
                                    <span className={`status-badge status-${book.status}`}>
                                        {book.status}
                                    </span>
                                    <div className="admin-actions-flex">
                                        <Link to={`/books/${book._id}`} className="btn-primary view-book-btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                                            View
                                        </Link>
                                        <button
                                            onClick={() => handleRemove(item._id)}
                                            className="admin-btn-delete"
                                            style={{ border: 'none', cursor: 'pointer' }}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {wishlist.length === 0 && (
                <div className="admin-empty-state">
                    <p>Your wishlist is currently empty.</p>
                    <Link to="/books" className="btn-primary" style={{ display: 'inline-block', marginTop: '1rem' }}>
                        Explore Books
                    </Link>
                </div>
            )}

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                type="danger"
                isLoading={confirmModal.isLoading}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
};

export default WishlistPage;
