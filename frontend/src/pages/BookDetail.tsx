import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBook, getSimilarBooks } from '../services/bookService';
import { Heart, ShoppingCart, ThumbsUp, ThumbsDown, Zap, Truck, ShieldCheck, BookOpen, Flag, ArrowLeft, Sparkles, Bot } from 'lucide-react';
import { addToWishlist, removeFromWishlist, getWishlist } from '../services/wishlistService';
import { getBookReviews, addReview, likeReview, dislikeReview, updateReview, reportReview } from '../services/reviewService';
import { getMyMembership, type Membership } from '../services/membershipService';
import { getProfile, checkBookAccess, addToReadlist } from '../services/userService';
import { explainBook } from '../services/aiService';
import { RoleName, BookStatus } from '../types/enums';
import type { User } from '../types';
import { toast } from 'react-toastify';
import { useBorrowCart } from '../context/BorrowCartContext';
import Loader from '../components/Loader';
import ReportReviewModal from '../components/ReportReviewModal';
import '../styles/BookDetail.css';

const BookDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart, isInCart } = useBorrowCart();
  const [book, setBook] = useState<any>(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistItemId, setWishlistItemId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [hasBorrowed, setHasBorrowed] = useState(false); // Renamed to hasAccess in logic
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userMembership, setUserMembership] = useState<Membership | null>(null);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [similarBooks, setSimilarBooks] = useState<any[]>([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportingReviewId, setReportingReviewId] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);
  const currentUserId = localStorage.getItem('userId');

  const ensureHttps = (url: string) => {
    if (!url) return url;
    return url.replace(/^http:\/\//i, 'https://');
  };

  useEffect(() => {
    if (id) {
      fetchBook(id);
      checkWishlist(id);
      fetchReviews(id);
      checkAccessStatus(id);
      fetchUserMembership();
      fetchUserProfile();
      fetchSimilarBooks(id);
    }
  }, [id]);



  const fetchSimilarBooks = async (bookId: string) => {
    try {
      const data = await getSimilarBooks(bookId);
      setSimilarBooks(data);
    } catch (err) {
      console.error('Error fetching similar books:', err);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const profile = await getProfile();
      setCurrentUser(profile);
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };



  const fetchUserMembership = async () => {
    try {
      const data = await getMyMembership();
      setUserMembership(data);
    } catch (err) {
      console.error('Error fetching membership:', err);
    }
  };



  const fetchBook = async (bookId: string) => {
    try {
      const data = await getBook(bookId);
      setBook(data);
    } catch (err) {
      console.error(err);
    }
  };

  const checkWishlist = async (bookId: string) => {
    try {
      const wishlist = await getWishlist();
      const item = wishlist.find((item: any) => item.book_id._id === bookId);
      if (item) {
        setIsWishlisted(true);
        setWishlistItemId(item._id);
      } else {
        setIsWishlisted(false);
        setWishlistItemId(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const [hasAccess, setHasAccess] = useState(false);

  const checkAccessStatus = async (bookId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const accessData = await checkBookAccess(bookId);
      console.log(`[BookDetail] Access Debug for ${bookId}:`, accessData);
      setHasAccess(accessData.hasAccess);
      // setHasBorrowed is used for reviews - we want it true if they EVER had book
      setHasBorrowed(accessData.inReadlist || accessData.hasBorrow || accessData.hasPurchased || accessData.isExpired);
    } catch (err) {
      console.error('Error checking access status:', err);
    }
  };

  const fetchReviews = async (bookId: string) => {
    try {
      const data = await getBookReviews(bookId);
      setReviews(data);
    } catch (err) {
      console.error('Error fetching reviews:', err);
    }
  };



  const handleAddToReadlist = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login to add to library');
        navigate('/login');
        return;
      }
      setIsSubmitting(true);
      await addToReadlist(book._id);
      setHasBorrowed(true);
      toast.success('Saved to your Library! Happy reading.');
      // Refresh access status
      checkAccessStatus(book._id);
      navigate('/dashboard');
    } catch (err: any) {
      if (err.response?.status === 403 && err.response?.data?.requiresUpgrade) {
        toast.info(err.response.data.error);
        navigate('/memberships');
      } else {
        toast.error(err.response?.data?.error || 'Failed to save to library');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleWishlist = async () => {
    if (!localStorage.getItem('token')) {
      toast.info('Please sign in to add books to your wishlist');
      navigate('/login');
      return;
    }
    if (!book) return;

    if (isWishlisted && wishlistItemId) {
      // Remove
      try {
        await removeFromWishlist(wishlistItemId);
        toast.info('Removed from wishlist');
        setIsWishlisted(false);
        setWishlistItemId(null);
      } catch (err: any) {
        console.log(err);
        toast.error('Failed to remove');
      }
    } else {
      // Add
      try {
        await addToWishlist(book._id);
        toast.success('Added to wishlist');
        setIsWishlisted(true);
        checkWishlist(book._id);
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Failed to add to wishlist');
      }
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setIsSubmitting(true);
    try {
      if (editingReviewId) {
        await updateReview(editingReviewId, newReview);
        toast.success('Review updated!');
      } else {
        await addReview({ book_id: id, ...newReview });
        toast.success('Review submitted!');
      }
      setNewReview({ rating: 5, comment: '' });
      setEditingReviewId(null);
      fetchReviews(id);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditReview = (review: any) => {
    setEditingReviewId(review._id);
    setNewReview({ rating: review.rating, comment: review.comment });
    window.scrollTo({ top: document.querySelector('.reviews-section-container')?.getBoundingClientRect().top! + window.scrollY, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingReviewId(null);
    setNewReview({ rating: 5, comment: '' });
  };

  const handleLike = async (reviewId: string) => {
    if (!localStorage.getItem('token') || !currentUserId) {
      toast.info('Please sign in to like reviews');
      return;
    }

    // Optimistic Update
    const previousReviews = [...reviews];
    setReviews(prev => prev.map(r => {
      if (r._id === reviewId) {
        const isLiked = r.likes?.includes(currentUserId);
        const isDisliked = r.dislikes?.includes(currentUserId);

        // Remove from dislikes if it was there
        let newDislikes = r.dislikes || [];
        if (isDisliked) {
          newDislikes = newDislikes.filter((id: string) => id !== currentUserId);
        }

        // Toggle like
        let newLikes = r.likes || [];
        if (isLiked) {
          newLikes = newLikes.filter((id: string) => id !== currentUserId);
        } else {
          newLikes = [...newLikes, currentUserId];
        }

        return { ...r, likes: newLikes, dislikes: newDislikes };
      }
      return r;
    }));

    try {
      await likeReview(reviewId);
      // No need to fetchReviews here as we already updated optimistically
      // and we expect the server to be in sync.
    } catch (err: any) {
      setReviews(previousReviews); // Rollback
      console.error('Like error:', err.response || err);
      const msg = err.response?.data?.error || 'Failed to like review';
      toast.error(msg);
    }
  };

  const handleDislike = async (reviewId: string) => {
    if (!localStorage.getItem('token') || !currentUserId) {
      toast.info('Please sign in to dislike reviews');
      return;
    }

    // Optimistic Update
    const previousReviews = [...reviews];
    setReviews(prev => prev.map(r => {
      if (r._id === reviewId) {
        const isLiked = r.likes?.includes(currentUserId);
        const isDisliked = r.dislikes?.includes(currentUserId);

        // Remove from likes if it was there
        let newLikes = r.likes || [];
        if (isLiked) {
          newLikes = newLikes.filter((id: string) => id !== currentUserId);
        }

        // Toggle dislike
        let newDislikes = r.dislikes || [];
        if (isDisliked) {
          newDislikes = newDislikes.filter((id: string) => id !== currentUserId);
        } else {
          newDislikes = [...newDislikes, currentUserId];
        }

        return { ...r, likes: newLikes, dislikes: newDislikes };
      }
      return r;
    }));

    try {
      await dislikeReview(reviewId);
    } catch (err: any) {
      setReviews(previousReviews); // Rollback
      console.error('Dislike error:', err.response || err);
      const msg = err.response?.data?.error || 'Failed to dislike review';
      toast.error(msg);
    }
  };

  const handleReport = (reviewId: string) => {
    if (!localStorage.getItem('token')) {
      toast.info('Please sign in to report reviews');
      return;
    }
    setReportingReviewId(reviewId);
    setIsReportModalOpen(true);
  };

  const submitReport = async (reason: string) => {
    if (!reportingReviewId) return;
    try {
      await reportReview(reportingReviewId, reason);
      toast.success('Review reported. Thank you.');
    } catch (err: any) {
      console.error('Report error:', err.response || err);
      const msg = err.response?.data?.error || 'Failed to report review';
      toast.error(msg);
    }
  };

  const handleAskAI = async () => {
    if (!book) return;
    setIsExplaining(true);
    try {
      const data = await explainBook(book.title, book.author, book.description);
      setExplanation(data.explanation);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsExplaining(false);
    }
  };




  if (!book) return <Loader />;

  return (
    <div className="dashboard-container saas-reveal">
      <div className="book-detail-back-nav">
        <button
          onClick={() => navigate(-1)}
          className="back-to-catalog-premium"
        >
          <ArrowLeft size={18} />
          Back to Catalog
        </button>
      </div>
      <div className="card book-detail-card">
        <div className="book-cover-wrapper">
          {book.cover_image_url ? (
            <img
              src={ensureHttps(book.cover_image_url)}
              alt={book.title}
              className="book-detail-cover"
              loading="lazy"
            />
          ) : (
            <div className="book-image-placeholder">
              No Image Cards
            </div>
          )}
        </div>
        <div className="book-info-main">
          <div className="status-badge-container">
            <span className={`status-badge status-${book.status}`}>
              {book.status === BookStatus.OUT_OF_STOCK ? 'OUT OF STOCK' : book.status.toUpperCase()}
            </span>
            {book.isPremium && (
              <span className="premium-badge">
                PREMIUM
              </span>
            )}
          </div>
          <h1 className="book-detail-title">{book.title}</h1>
          <h2 className="book-detail-author">by {book.author}</h2>

          <div className="book-specs-grid">
            <strong>Genre:</strong> <span>{book.genre}</span>
            <strong>Pages:</strong> <span>{book.pages}</span>
            <strong>Price:</strong> <span>₹{book.price}</span>
            <strong>Published:</strong> <span>{book.publishedYear}</span>
            <strong>ISBN:</strong> <span>{book.isbn}</span>
            <strong>Copies:</strong> <span>{book.noOfCopies} available</span>
          </div>

          <p className="book-description-p">{book.description}</p>

          {/* AI Assistant Section */}
          <div className="ai-assistant-section">
            {!explanation && !isExplaining && (
              <button onClick={handleAskAI} className="ask-ai-btn">
                <Sparkles size={18} />
                Ask AI About This Book
              </button>
            )}

            {isExplaining && (
              <div className="ai-loading">
                <div className="spinner-mini"></div>
                <span>Asking the librarian...</span>
              </div>
            )}

            {explanation && (
              <div className="ai-explanation-card">
                <div className="ai-header">
                  <Bot size={20} className="ai-icon" />
                  <h4>Librarian's Insight</h4>
                </div>
                <p>{explanation}</p>
              </div>
            )}
          </div>


          <div>
            <div className="action-buttons" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {hasAccess ? (
                  book.pdf_url ? (
                    <button
                      onClick={() => navigate(`/read/${book._id}`)}
                      className="btn-primary readlist-btn"
                      style={{ background: 'var(--success-color)', color: 'white' }}
                    >
                      <BookOpen size={18} />
                      Read Book
                    </button>
                  ) : (
                    <button
                      disabled
                      className="btn-primary readlist-btn disabled-btn"
                      style={{ background: 'var(--text-secondary)', color: 'white', cursor: 'not-allowed', opacity: 0.7 }}
                      title="No PDF available for this book"
                    >
                      <BookOpen size={18} />
                      Not Available to Read Online
                    </button>
                  )
                ) : (
                  book.pdf_url ? (
                    <button
                      onClick={handleAddToReadlist}
                      disabled={isSubmitting}
                      className="btn-primary readlist-btn"
                      style={{ background: 'var(--accent-color)' }}
                    >
                      <BookOpen size={18} />
                      {isSubmitting ? 'Saving...' : 'Save to Library'}
                    </button>
                  ) : (
                    <button
                      disabled
                      className="btn-primary readlist-btn disabled-btn"
                      style={{ background: 'var(--text-secondary)', color: 'white', cursor: 'not-allowed', opacity: 0.7 }}
                      title="No PDF available for this book"
                    >
                      <BookOpen size={18} />
                      Not Available to Read Online
                    </button>
                  )
                )}

                <button
                  onClick={() => {
                    addToCart(book);
                    toast.success(`${book.title} added to cart!`);
                  }}
                  disabled={isInCart(book._id)}
                  className={`btn-primary add-to-cart-btn-detail ${isInCart(book._id) ? 'btn-in-cart' : ''}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 'fit-content',
                    minWidth: '140px',
                    height: '44px',
                    padding: '0 1.25rem',
                    fontSize: '0.875rem'
                  }}
                  title={isInCart(book._id) ? 'Already in cart' : (book.noOfCopies === 0 ? 'Item out of stock, but you can add to verify later' : 'Add to cart')}
                >
                  <ShoppingCart size={16} />
                  {isInCart(book._id) ? 'In Cart' : (book.noOfCopies === 0 ? 'Add to Cart' : 'Add to Cart')}
                </button>

                {book.noOfCopies > 0 && (
                  <button
                    onClick={() => {
                      if (!isInCart(book._id)) {
                        addToCart(book);
                      }
                      navigate('/checkout');
                    }}
                    className="btn-primary buy-now-btn-detail"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 'fit-content',
                      minWidth: '140px',
                      height: '44px',
                      padding: '0 1.25rem',
                      fontSize: '0.875rem',
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      border: 'none'
                    }}
                    title="Proceed to checkout immediately"
                  >
                    <Zap size={16} fill="currentColor" />
                    Buy Now
                  </button>
                )}
              </div>

              <button
                onClick={handleToggleWishlist}
                className="btn-secondary wishlist-toggle-btn"
                title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
              >
                {isWishlisted ? <Heart fill="currentColor" size={24} /> : <Heart size={24} />}
              </button>


            </div>

          </div>
        </div>
      </div>

      {/* Shop with Confidence Section - Moved outside */}
      <div className="card confidence-card-wrapper" style={{ marginTop: '2rem' }}>
        <div className="confidence-section" style={{ marginTop: 0, border: 'none', background: 'transparent', padding: 0 }}>
          <h4 className="confidence-title" style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>Shop with confidence</h4>
          <ul className="confidence-list" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: '1rem' }}>
            <li className="confidence-card">
              <Truck size={24} className="confidence-icon" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 600 }}>Fast Delivery</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Delivered by BookStack</span>
              </div>
            </li>
            <li className="confidence-card">
              <ShieldCheck size={24} className="confidence-icon" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 600 }}>Verified Seller</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Sold by BookStack</span>
              </div>
            </li>
            {(!userMembership || userMembership.name !== 'Premium') && (
              <li className="confidence-card">
                <Zap size={24} className="confidence-icon" style={{ color: '#eab308' }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 600 }}>Premium Delivery</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Free for Premium members</span>
                </div>
              </li>
            )}
            {userMembership?.name === 'Premium' && (
              <li className="confidence-card" style={{ borderColor: '#eab308', background: 'rgba(234, 179, 8, 0.05)' }}>
                <Zap size={24} className="confidence-icon" style={{ color: '#eab308' }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 600, color: '#eab308' }}>Premium Applied</span>
                  <span style={{ fontSize: '0.8rem', color: '#eab308' }}>Free delivery included</span>
                </div>
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Author Section - Separate Card */}
      {
        (book.author_image_url || book.author_description) && (
          <div className="card author-card-wrapper" style={{ marginTop: '2rem' }}>
            <div className="author-section">
              <h3 className="author-section-title">About the Author</h3>
              <div className="author-content">
                {book.author_image_url && (
                  <img src={book.author_image_url} alt={book.author} className="author-image" />
                )}
                <div className="author-text">
                  <h4>{book.author}</h4>
                  <p>{book.author_description}</p>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Similar Books Section */}
      {
        similarBooks.length > 0 && (
          <div className="card similar-books-card-wrapper" style={{ marginTop: '2rem' }}>
            <h3 className="section-title" style={{ marginBottom: '1.5rem', fontWeight: 700, fontSize: '1.25rem' }}>
              Similar Books
            </h3>
            <div className="similar-books-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1.5rem' }}>
              {similarBooks.map((b) => (
                <div
                  key={b._id}
                  className="similar-book-card"
                  onClick={() => {
                    navigate(`/books/${b._id}`);
                    window.scrollTo(0, 0);
                  }}
                  style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                >
                  <div className="similar-book-cover" style={{ height: '260px', borderRadius: '12px', overflow: 'hidden', marginBottom: '0.75rem', border: '1px solid var(--border-color)' }}>
                    {b.cover_image_url ? (
                      <img src={b.cover_image_url} alt={b.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                        No Cover
                      </div>
                    )}
                  </div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</h4>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{b.author}</p>
                </div>
              ))}
            </div>
          </div>
        )
      }

      {/* Reviews Section */}
      <div className="reviews-section-container">
        <h2 className="reviews-title">Customer Reviews</h2>

        <div className={`reviews-grid ${hasBorrowed ? 'reviews-grid-borrowed' : 'reviews-grid-guest'}`}>
          {/* Reviews List */}
          <div>
            {reviews.length > 0 ? (
              <div className="reviews-list-container">
                {reviews.map((r) => (
                  <div key={r._id} className="review-item">
                    <div className="review-header">
                      <strong className="reviewer-name">
                        {r.user_id?.name || 'Anonymous'}
                        {currentUser?.role === RoleName.SUPER_ADMIN && (
                          <span className="admin-badge-small" style={{ marginLeft: '0.5rem', fontSize: '0.7rem', background: 'var(--primary-color)', color: 'white', padding: '1px 6px', borderRadius: '4px' }}>ADMIN</span>
                        )}
                      </strong>
                      <div className="review-stars">
                        {'★'.repeat(r.rating)}
                        {'☆'.repeat(5 - r.rating)}
                      </div>
                    </div>
                    <p className="review-comment">{r.comment}</p>
                    <div className="review-item-footer">
                      <small className="review-date">
                        {new Date(r.reviewed_at).toLocaleDateString()}
                      </small>
                      {(r.user_id?._id === currentUserId || r.user_id === currentUserId) && (
                        <button
                          onClick={() => handleEditReview(r)}
                          className="btn-link-edit"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                    <div className="review-interactions">
                      <div className="interaction-left">
                        <button
                          className={`interaction-btn ${r.likes?.includes(currentUserId) ? 'active' : ''}`}
                          onClick={() => handleLike(r._id)}
                        >
                          <ThumbsUp size={16} />
                          <span>{r.likes?.length || 0}</span>
                        </button>
                        <button
                          className={`interaction-btn ${r.dislikes?.includes(currentUserId) ? 'active' : ''}`}
                          onClick={() => handleDislike(r._id)}
                        >
                          <ThumbsDown size={16} />
                          <span>{r.dislikes?.length || 0}</span>
                        </button>
                      </div>
                      <button
                        className="interaction-btn report-btn"
                        onClick={() => handleReport(r._id)}
                        title="Report review"
                      >
                        <Flag size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-reviews-msg">
                No reviews yet. Be the first to share your thoughts!
              </p>
            )}
          </div>

          {/* Review Form */}
          {(hasBorrowed || editingReviewId) && (
            <div>
              <div className="review-form-container">
                <h3 className="review-form-title">
                  {editingReviewId ? 'Edit Your Review' : 'Write a Review'}
                </h3>
                <form onSubmit={handleSubmitReview}>
                  <div className="form-group">
                    <label className="form-label">Rating</label>
                    <select
                      value={newReview.rating}
                      onChange={(e) =>
                        setNewReview({
                          ...newReview,
                          rating: parseInt(e.target.value),
                        })
                      }
                      className="form-input-field"
                    >
                      <option value="5">5 - Excellent</option>
                      <option value="4">4 - Very Good</option>
                      <option value="3">3 - Good</option>
                      <option value="2">2 - Fair</option>
                      <option value="1">1 - Poor</option>
                    </select>
                  </div>
                  <div className="form-group-last">
                    <label className="form-label">Your Experience</label>
                    <textarea
                      rows={4}
                      value={newReview.comment}
                      onChange={(e) =>
                        setNewReview({ ...newReview, comment: e.target.value })
                      }
                      placeholder="What did you think of this book?"
                      className="form-textarea-field"
                      required
                    />
                  </div>
                  <div className="review-form-actions">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-primary submit-review-btn"
                    >
                      {isSubmitting ? <Loader small /> : (editingReviewId ? 'Update Review' : 'Post Review')}
                    </button>
                    {editingReviewId && (
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="btn-secondary review-cancel-btn"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      <ReportReviewModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onReport={submitReport}
      />
    </div >
  );
};

export default BookDetail;
