import React from 'react';
import UserNavbar from '../components/UserNavbar';

import '../styles/StaticPages.css';

const PrivacyPolicy: React.FC = () => {
    return (
        <div className="static-page-container">
            <UserNavbar />
            <div className="static-content-wrapper">
                <div className="static-hero saas-reveal">
                    <h1 className="static-title-h1">Privacy Policy</h1>
                    <p className="static-subtitle">Your security and data protection are our top priorities.</p>
                </div>

                <div className="policy-container saas-reveal">
                    <div className="policy-card">
                        <section className="policy-section">
                            <h2 className="policy-subtitle-h2">1. Data Collection</h2>
                            <p className="static-text-p">
                                We collect minimal information required to provide you with a personalized library experience, including your name, email, and reading preferences.
                            </p>
                        </section>

                        <section className="policy-section">
                            <h2 className="policy-subtitle-h2">2. How We Use Information</h2>
                            <p className="static-text-p">
                                Your information is solely used to manage your borrows, maintain your wishlist, and communicate important library updates. We never sell your data.
                            </p>
                        </section>

                        <section className="policy-section">
                            <h2 className="policy-subtitle-h2">3. Security</h2>
                            <p className="static-text-p">
                                We implement industry-standard encryption and security protocols to protect your personal data and account integrity.
                            </p>
                        </section>

                        <section className="policy-section">
                            <h2 className="policy-subtitle-h2">4. Your Rights</h2>
                            <p className="static-text-p">
                                You have the right to access, update, or request deletion of your personal data at any time. Bookstack is committed to your digital privacy.
                            </p>
                        </section>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default PrivacyPolicy;
