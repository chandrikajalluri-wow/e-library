import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getMyBookRequests, requestBook } from '../services/userService';
import { getBooks } from '../services/bookService';
import { getMyMembership } from '../services/membershipService';
import { MembershipName, RequestStatus } from '../types/enums';
import { toast } from 'react-toastify';
import { Lock, Send, BookOpen, User as UserIcon, MessageSquare, ChevronRight, Clock, CheckCircle2, XCircle, ExternalLink, Filter, ArrowUpDown } from 'lucide-react';
import Loader from '../components/Loader';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/BookRequest.css';

const BookRequestPage: React.FC = () => {
    const [request, setRequest] = useState({ title: '', author: '', reason: '' });
    const [requests, setRequests] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [membership, setMembership] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [sortOrder, setSortOrder] = useState<string>('newest');
    const navigate = useNavigate();

    const fetchRequests = async () => {
        try {
            const data = await getMyBookRequests();
            setRequests(data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [membershipData, requestsData] = await Promise.all([
                    getMyMembership(),
                    getMyBookRequests()
                ]);
                setMembership(membershipData);
                setRequests(requestsData);
            } catch (err) {
                console.error(err);
                toast.error('Failed to load data');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
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
            fetchRequests();
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
                    <div className="request-form-actions">
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
                    </div>
                </form>
            </div>

            <div className="requests-history-section">
                <div className="section-header-row">
                    <div className="section-title-group">
                        <h2 className="section-title">Your Requests</h2>
                        <p className="section-subtitle">Track the status of your suggestions</p>
                    </div>
                    <div className="requests-filter-bar">
                        <div className="request-filter-pill">
                            <Filter size={14} className="filter-pill-icon" />
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="request-filter-select"
                            >
                                <option value="all">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>
                        <div className="request-filter-pill">
                            <ArrowUpDown size={14} className="filter-pill-icon" />
                            <select
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value)}
                                className="request-filter-select"
                            >
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="requests-grid">
                    <AnimatePresence>
                        {(() => {
                            let filtered = [...requests];
                            if (filterStatus !== 'all') {
                                filtered = filtered.filter(r => r.status === filterStatus);
                            }
                            if (sortOrder === 'newest') {
                                filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                            } else {
                                filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                            }
                            return filtered.length > 0 ? (
                                filtered.map((req, index) => (
                                    <motion.div
                                        key={req._id}
                                        className="user-request-card"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: index * 0.1 }}
                                    >
                                        <div className="request-status-badge-container">
                                            <span className={`request-status-badge status-${req.status}`}>
                                                {req.status === RequestStatus.PENDING && <Clock size={14} />}
                                                {req.status === RequestStatus.APPROVED && <CheckCircle2 size={14} />}
                                                {req.status === RequestStatus.REJECTED && <XCircle size={14} />}
                                                {req.status}
                                            </span>
                                        </div>
                                        <div className="request-info">
                                            <h3 className="request-book-title">{req.title}</h3>
                                            <p className="request-book-author">by {req.author}</p>
                                            <div className="request-date">
                                                Requested on {new Date(req.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>

                                        {req.status === RequestStatus.APPROVED && req.book_id && (
                                            <div className="request-actions">
                                                <Link to={`/books/${req.book_id._id || req.book_id}`} className="view-book-btn">
                                                    <span>View Book</span>
                                                    <ExternalLink size={16} />
                                                </Link>
                                            </div>
                                        )}
                                    </motion.div>
                                ))
                            ) : (
                                <div className="no-requests-state">
                                    <BookOpen size={48} />
                                    <p>{filterStatus !== 'all' ? `No ${filterStatus} requests found.` : "You haven't made any book requests yet."}</p>
                                </div>
                            );
                        })()}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div >
    );
};

export default BookRequestPage;

