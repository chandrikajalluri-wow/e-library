import React, { useEffect, useState } from 'react';
import { getWishlist, removeFromWishlist } from '../services/wishlistService';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useBorrowCart } from '../context/BorrowCartContext';
import Loader from '../components/Loader';
import ConfirmationModal from '../components/ConfirmationModal';
import { BookStatus } from '../types/enums';
import { ArrowLeft, Bookmark, Search, Trash2 } from 'lucide-react';
import '../styles/UserDashboard.css';

const WishlistPage: React.FC = () => {
    const navigate = useNavigate();
    const { addToCart, isInCart } = useBorrowCart();
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
        const loadInitialData = async () => {
            try {
                setLoading(true);
                const wishData = await getWishlist();
                setWishlist(wishData);
            } catch (err) {
                toast.error('Failed to load data');
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
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
        <div className="wishlist-page dashboard-container saas-reveal">
            <div className="back-to-catalog-container" style={{ margin: '1.5rem 0 1.5rem 0' }}>
                <button
                    onClick={() => navigate('/books')}
                    className="btn-secondary back-to-catalog-link"
                    style={{ background: 'transparent', padding: '0.8rem 0.2' }}
                >
                    <ArrowLeft size={18} />
                    <span style={{ fontWeight: 700 }}>Back to Library</span>
                </button>
            </div>

            <header className="admin-header">
                <div className="admin-header-titles">
                    <h1 className="admin-header-title">My Wishlist</h1>
                    <p className="admin-header-subtitle">
                        Your private sanctuary of literature. Manage your future reads and add them to your collection when ready.
                    </p>
                </div>
            </header>

            <div className="grid-books"> {/* Reusing grid-books styles */}
                {wishlist.map((item: any) => {
                    const book = item.book_id;
                    if (!book) return null;
                    return (
                        <div
                            key={item._id}
                            className="card book-card cursor-pointer"
                            onClick={() => navigate(`/books/${book._id}`)}
                        >
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
                                    <div className="book-status-info">
                                        <span className={`status-badge status-${book.status} book-status-badge`}>
                                            {book.status === BookStatus.OUT_OF_STOCK ? 'OUT OF STOCK' : book.status.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="book-actions-row" style={{ marginTop: '0.5rem', display: 'flex', gap: '0.75rem' }}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (book.noOfCopies > 0) {
                                                    addToCart(book);
                                                    toast.success(`${book.title} added to cart!`);
                                                } else {
                                                    toast.error('Out of stock');
                                                }
                                            }}
                                            disabled={book.noOfCopies === 0 || isInCart(book._id)}
                                            className={`btn-primary book-action-btn ${isInCart(book._id) ? 'btn-in-cart' : ''}`}
                                            style={{ flex: 1 }}
                                        >
                                            {isInCart(book._id) ? 'In Cart' : 'Add to Cart'}
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemove(item._id);
                                            }}
                                            className="btn-secondary"
                                            title="Remove from wishlist"
                                            style={{
                                                width: '44px',
                                                minWidth: '44px',
                                                height: '44px',
                                                padding: 0,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                borderColor: 'rgba(239, 68, 68, 0.2)',
                                                color: '#ef4444',
                                                borderRadius: '12px'
                                            }}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {
                wishlist.length === 0 && (
                    <div className="admin-empty-state" style={{ textAlign: 'left', padding: '4rem 0', alignItems: 'flex-start' }}>
                        <div className="empty-state-icon-circle" style={{ width: '80px', height: '80px', background: 'rgba(var(--primary-rgb), 0.1)', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 0 1.5rem 0' }}>
                            <Bookmark size={40} color="var(--primary-color)" />
                        </div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Your wishlist is empty</h2>
                        <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 0 1.5rem 0' }}>
                            You haven't saved any books yet. Start exploring our vast collection and find your next favorite read!
                        </p>
                        <button onClick={() => navigate('/books')} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0' }}>
                            <Search size={18} />
                            <span>Explore Books</span>
                        </button>
                    </div>
                )
            }

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                type="danger"
                isLoading={confirmModal.isLoading}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal((prev: any) => ({ ...prev, isOpen: false }))}
            />
        </div >
    );
};

export default WishlistPage;
