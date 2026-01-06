import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Contact.css'; // Reusing some base styles

import '../styles/StaticPages.css';

const TermsAndConditions: React.FC = () => {
    return (
        <div className="contact-page">
            <nav className="contact-nav">
                <Link to="/" className="contact-logo-link">
                    <div className="contact-logo-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v15.661a2.5 2.5 0 0 1-2.261 2.482L5 20.5a2.5 2.5 0 0 1-1-5z"></path></svg>
                    </div>
                    <span className="contact-logo-text">E-Library</span>
                </Link>
            </nav>

            <div className="contact-content policy-content">
                <h1 className="contact-heading">Terms & Conditions</h1>
                <p className="contact-description">Last updated: December 31, 2025</p>

                <div className="card policy-card">
                    <section className="policy-section">
                        <h2 className="policy-subtitle-h2">1. Acceptance of Terms</h2>
                        <p>By accessing and using the E-Library Global System, you agree to be bound by these Terms & Conditions. If you do not agree, please do not use our services.</p>
                    </section>

                    <section className="policy-section">
                        <h2 className="policy-subtitle-h2">2. User Responsibilities</h2>
                        <p>Users are responsible for maintaining the confidentiality of their account credentials. You agree to use the library resources for personal, non-commercial educational purposes only.</p>
                    </section>

                    <section className="policy-section">
                        <h2 className="policy-subtitle-h2">3. Borrowing Rules</h2>
                        <p>Users may borrow up to 5 books at a time. Books must be returned or renewed by the due date. Fines apply for overdue books at a rate of ₹10 per day.</p>
                    </section>

                    <section className="policy-section">
                        <h2 className="policy-subtitle-h2">4. Content Ownership</h2>
                        <p>All digital content available through E-Library is protected by copyright laws. Unauthorized distribution or copying of digital books is strictly prohibited.</p>
                    </section>

                    <section>
                        <h2 className="policy-subtitle-h2">5. Termination</h2>
                        <p>E-Library reserves the right to suspend or terminate accounts that violate these terms or engage in fraudulent activities.</p>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default TermsAndConditions;
