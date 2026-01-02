import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBook } from '../services/bookService';
import { issueBook, getMyBorrows } from '../services/borrowService';
import {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
} from '../services/wishlistService';
import { getBookReviews, addReview } from '../services/reviewService';
import { toast } from 'react-toastify';
import Loader from '../components/Loader';
import '../styles/BookDetail.css';

const BookDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<any>(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistItemId, setWishlistItemId] = useState<string | null>(null);
  const [expectedReturnDate, setExpectedReturnDate] = useState<string | null>(
    null
  );
  const [reviews, setReviews] = useState<any[]>([]);
  const [hasBorrowed, setHasBorrowed] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeBorrowCount, setActiveBorrowCount] = useState(0);

  useEffect(() => {
    if (id) {
      fetchBook(id);
      checkWishlist(id);
      fetchReviews(id);
      checkBorrowStatus(id);
      fetchActiveBorrowCount();
    }
  }, [id]);

  const fetchActiveBorrowCount = async () => {
    try {
      const myBorrows = await getMyBorrows();
      const count = myBorrows.filter((b: any) =>
        ['borrowed', 'overdue', 'return_requested'].includes(b.status)
      ).length;
      setActiveBorrowCount(count);
    } catch (err) {
      console.error('Error fetching borrow count:', err);
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
        setExpectedReturnDate(item.expectedReturnDate || null);
      } else {
        setIsWishlisted(false);
        setWishlistItemId(null);
        setExpectedReturnDate(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const checkBorrowStatus = async (bookId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const myBorrows = await getMyBorrows();
      const borrowed = myBorrows.some((b: any) => b.book_id._id === bookId);
      setHasBorrowed(borrowed);
    } catch (err) {
      console.error('Error checking borrow status:', err);
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

  const handleBorrow = async () => {
    if (!book) return;
    try {
      await issueBook(book._id);
      toast.success('Book borrowed successfully!');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to borrow book');
    }
  };

  const handleToggleWishlist = async () => {
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
      await addReview({ book_id: id, ...newReview });
      toast.success('Review submitted!');
      setNewReview({ rating: 5, comment: '' });
      fetchReviews(id);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!book) return <Loader />;

  return (
    <div className="dashboard-container">
      <button
        onClick={() => navigate(-1)}
        className="btn-secondary back-to-catalog"
      >
        &larr; Back to Catalog
      </button>
      <div className="card book-detail-card">
        <div className="book-cover-wrapper">
          {book.cover_image_url ? (
            <img
              src={book.cover_image_url}
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
              {book.status.toUpperCase()}
            </span>
          </div>
          <h1 className="book-detail-title">{book.title}</h1>
          <h2 className="book-detail-author">by {book.author}</h2>

          <div className="book-specs-grid">
            <strong>Genre:</strong> <span>{book.genre}</span>
            <strong>Pages:</strong> <span>{book.pages}</span>
            <strong>Price:</strong> <span>${book.price}</span>
            <strong>ISBN:</strong> <span>{book.isbn}</span>
            <strong>Copies:</strong> <span>{book.noOfCopies} available</span>
          </div>

          <p className="book-description-p">{book.description}</p>

          <div>
            <div className="action-buttons">
              {book.noOfCopies > 0 ? (
                <div>
                  <button
                    onClick={handleBorrow}
                    disabled={activeBorrowCount >= 5}
                    className={`btn-primary borrow-btn ${activeBorrowCount >= 5 ? 'disabled-btn' : ''}`}
                    title={activeBorrowCount >= 5 ? 'Borrow limit (5) reached' : ''}
                  >
                    {activeBorrowCount >= 5 ? 'Borrow Limit Reached' : 'Borrow This Book'}
                  </button>
                  {activeBorrowCount >= 5 && (
                    <p className="limit-warning" style={{ color: 'var(--danger-color)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                      You have reached the maximum limit of 5 borrowed books.
                    </p>
                  )}
                </div>
              ) : (
                <div className="unavailable-container">
                  <button
                    disabled
                    className="btn-secondary unavailable-btn"
                  >
                    Currently Unavailable
                  </button>
                  {isWishlisted && expectedReturnDate && (
                    <p className="return-date-info">
                      Expected return:{' '}
                      {new Date(expectedReturnDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
              <button
                onClick={handleToggleWishlist}
                className="btn-secondary wishlist-toggle-btn"
                title={
                  isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'
                }
              >
                {isWishlisted ? '♥' : '♡'}
              </button>
            </div>
          </div>
        </div>
      </div>

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
                      </strong>
                      <div className="review-stars">
                        {'★'.repeat(r.rating)}
                        {'☆'.repeat(5 - r.rating)}
                      </div>
                    </div>
                    <p className="review-comment">{r.comment}</p>
                    <small className="review-date">
                      {new Date(r.reviewed_at).toLocaleDateString()}
                    </small>
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
          {hasBorrowed && (
            <div>
              <div className="review-form-container">
                <h3 className="review-form-title">Write a Review</h3>
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
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary submit-review-btn"
                  >
                    {isSubmitting ? <Loader small /> : 'Post Review'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookDetail;
