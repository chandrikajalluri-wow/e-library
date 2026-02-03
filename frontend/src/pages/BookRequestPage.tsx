import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { requestBook } from '../services/userService';
import { getBooks } from '../services/bookService';
import { getMyMembership } from '../services/membershipService';
import { MembershipName } from '../types/enums';
import { toast } from 'react-toastify';
import { Lock, Send, BookOpen, User as UserIcon, MessageSquare, ChevronRight } from 'lucide-react';
import Loader from '../components/Loader';
import { motion } from 'framer-motion';
import '../styles/BookRequest.css';

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
            <motion.div
                className="request-page centered-locked-view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <header className="admin-header">
                    <div className="admin-header-titles">
                        <h1 className="admin-header-title">Request a Book</h1>
                        <p className="admin-header-subtitle">Expand your horizons with new titles</p>
                    </div>
                </header>

                <div className="locked-feature-card">
                    <div className="lock-sphere">
                        <Lock size={48} />
                    </div>
                    <h3 className="locked-title">Premium Access Required</h3>
                    <p className="locked-description">
                        Book requests are a <strong>Premium Exclusive</strong> feature.
                        Join our premium community to suggest new books, rare finds, and trending titles to our global collection.
                    </p>
                    <Link to="/memberships" className="upgrade-link-btn">
                        <span>Upgrade to Premium</span>
                        <ChevronRight size={18} />
                    </Link>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            className="request-page"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <header className="admin-header">
                <div className="admin-header-titles">
                    <h1 className="admin-header-title">Request a Book</h1>
                    <p className="admin-header-subtitle">Can't find what you're looking for? Let us know!</p>
                </div>
            </header>

            <div className="request-card">
                <form onSubmit={handleSubmit} className="request-form">
                    <div className="form-group-flex">
                        <div className="form-group">
                            <label><BookOpen size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Book Title</label>
                            <input
                                type="text"
                                value={request.title}
                                onChange={(e) => setRequest({ ...request, title: e.target.value })}
                                placeholder="e.g. The Pragmatic Programmer"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label><UserIcon size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Author</label>
                            <input
                                type="text"
                                value={request.author}
                                onChange={(e) => setRequest({ ...request, author: e.target.value })}
                                placeholder="e.g. Andrew Hunt"
                                required
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label><MessageSquare size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Why should we add this?</label>
                        <textarea
                            value={request.reason}
                            onChange={(e) => setRequest({ ...request, reason: e.target.value })}
                            rows={5}
                            placeholder="Help our curation team understand the value of this book..."
                        />
                    </div>
                    <button type="submit" className="request-submit-btn" disabled={isSubmitting}>
                        {isSubmitting ? (
                            'Processing...'
                        ) : (
                            <>
                                <span>Submit Request</span>
                                <Send size={20} />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </motion.div>
    );
};

export default BookRequestPage;

