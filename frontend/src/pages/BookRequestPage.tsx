import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { requestBook } from '../services/userService';
import { getBooks } from '../services/bookService';
import { getMyMembership } from '../services/membershipService';
import { MembershipName } from '../types/enums';
import { toast } from 'react-toastify';
import Loader from '../components/Loader';
import '../styles/UserProfile.css';

const BookRequestPage: React.FC = () => {
    const [request, setRequest] = useState({ title: '', author: '', reason: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [membership, setMembership] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchMembership = async () => {
            try {
                const data = await getMyMembership();
                setMembership(data);
            } catch (err) {
                console.error(err);
                toast.error('Failed to verify membership status');
            } finally {
                setLoading(false);
            }
        };
        fetchMembership();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // Check if book already exists
            const data = await getBooks(`search=${request.title}&limit=1`);
            if (data.books && data.books.length > 0) {
                const existingBook = data.books.find((b: any) =>
                    b.title.toLowerCase() === request.title.toLowerCase()
                );
                if (existingBook) {
                    toast.info(`This book is already available in the library! Redirecting...`);
                    navigate(`/books/${existingBook._id}`);
                    return;
                }
            }

            await requestBook(request);
            toast.success('Book request submitted successfully');
            setRequest({ title: '', author: '', reason: '' });
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to submit request');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <Loader />;

    // Restrict access for Basic plan
    if (membership?.name === MembershipName.BASIC) {
        return (
            <div className="request-page saas-reveal">
                <div className="saas-page-header" style={{ textAlign: 'center' }}>
                    <h2 className="static-title-h1">Request a Book</h2>
                    <p className="static-subtitle">Upgrade your plan to unlock this feature</p>
                </div>
                <div className="card profile-card" style={{ maxWidth: '600px', margin: '2rem auto', textAlign: 'center', padding: '3rem 2rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
                    <h3>Premium Feature Locked</h3>
                    <p style={{ color: 'var(--text-secondary)', margin: '1rem 0 2rem' }}>
                        Book requests are exclusively available for <strong>Standard</strong> and <strong>Premium</strong> members.
                        Upgrade your plan to suggest new titles for our collection.
                    </p>
                    <Link to="/memberships" className="btn-primary">
                        View Membership Plans
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="request-page saas-reveal">
            <div className="saas-page-header" style={{ textAlign: 'center' }}>
                <h2 className="static-title-h1">Request a Book</h2>
                <p className="static-subtitle">Help us expand our collection with your suggestions</p>
            </div>

            <div className="card profile-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Book Title</label>
                        <input
                            type="text"
                            value={request.title}
                            onChange={(e) => setRequest({ ...request, title: e.target.value })}
                            placeholder="Enter the book title"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Author</label>
                        <input
                            type="text"
                            value={request.author}
                            onChange={(e) => setRequest({ ...request, author: e.target.value })}
                            placeholder="Enter the author's name"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Reason for Request (Optional)</label>
                        <textarea
                            value={request.reason}
                            onChange={(e) => setRequest({ ...request, reason: e.target.value })}
                            rows={4}
                            placeholder="Why should we add this book to our library?"
                            className="form-textarea"
                        />
                    </div>
                    <button type="submit" className="btn-primary" disabled={isSubmitting}>
                        {isSubmitting ? 'Submitting...' : 'Submit Request'}
                    </button>
                </form>
            </div>
        </div>
    );
};
export default BookRequestPage;
