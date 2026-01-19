import React from 'react';
import UserNavbar from '../components/UserNavbar';

import '../styles/StaticPages.css';

const TermsAndConditions: React.FC = () => {
    return (
        <div className="static-page-container">
            <UserNavbar />
            <div className="static-content-wrapper">
                <div className="static-hero saas-reveal">
                    <h1 className="static-title-h1">Terms & Conditions</h1>
                    <p className="static-subtitle">The framework for how we protect and serve our readers.</p>
                </div>

                <div className="policy-container saas-reveal">
                    <div className="policy-card">
                        <section className="policy-section">
                            <h2 className="policy-subtitle-h2">1. Acceptance of Terms</h2>
                            <p className="static-text-p">By accessing and using the Bookstack Global System, you agree to be bound by these Terms & Conditions. If you do not agree, please do not use our services.</p>
                        </section>

                        <section className="policy-section">
                            <h2 className="policy-subtitle-h2">2. User Responsibilities</h2>
                            <p className="static-text-p">Users are responsible for maintaining the confidentiality of their account credentials. You agree to use the library resources for personal, non-commercial educational purposes only.</p>
                        </section>

                        <section className="policy-section">
                            <h2 className="policy-subtitle-h2">3. Borrowing Rules</h2>
                            <p className="static-text-p">Users may borrow up to 5 books at a time. Books must be returned or renewed by the due date. Fines apply for overdue books at a rate of ₹10 per day.</p>
                        </section>

                        <section className="policy-section">
                            <h2 className="policy-subtitle-h2">4. Content Ownership</h2>
                            <p className="static-text-p">All digital content available through Bookstack is protected by copyright laws. Unauthorized distribution or copying of digital books is strictly prohibited.</p>
                        </section>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default TermsAndConditions;
