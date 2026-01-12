import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestBook } from '../services/userService';
import { getBooks } from '../services/bookService';
import { toast } from 'react-toastify';
import '../styles/UserProfile.css';

const BookRequestPage: React.FC = () => {
    const [request, setRequest] = useState({ title: '', author: '', reason: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();

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
        } catch (err) {
            toast.error('Failed to submit request');
        } finally {
            setIsSubmitting(false);
        }
    };

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
