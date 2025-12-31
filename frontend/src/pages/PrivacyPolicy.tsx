import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Contact.css'; // Reusing some base styles

const PrivacyPolicy: React.FC = () => {
    return (
        <div className="contact-page">
            <nav className="contact-nav">
                <Link to="/" className="contact-logo-link">
                    <div className="contact-logo-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v15.661a2.5 2.5 0 0 1-2.261 2.482L5 20.5a2.5 2.5 0 0 1-1-5z"></path></svg>
                    </div>
                    <span className="contact-logo-text">E-Library</span>
                </Link>
                <Link to="/login" className="contact-login-link">Login</Link>
            </nav>

            <div className="contact-content" style={{ display: 'block', maxWidth: '800px' }}>
                <h1 className="contact-heading">Privacy Policy</h1>
                <p className="contact-description">Last updated: December 31, 2025</p>

                <div className="card" style={{ padding: '2rem', lineHeight: '1.6' }}>
                    <section style={{ marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>1. Data Collection</h2>
                        <p>We collect personal information such as your name, email address, and borrowing history to provide and improve our library services.</p>
                    </section>

                    <section style={{ marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>2. Use of Information</h2>
                        <p>Your data is used to manage your account, track book loans, calculate fines, and send essential notifications about your account status.</p>
                    </section>

                    <section style={{ marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>3. Data Security</h2>
                        <p>We implement industry-standard security measures to protect your personal information from unauthorized access, alteration, or disclosure.</p>
                    </section>

                    <section style={{ marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>4. Third-Party Services</h2>
                        <p>We may use third-party transactional email services (like Brevo) to send account-related information. We do not sell your personal data to third parties.</p>
                    </section>

                    <section>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>5. Your Rights</h2>
                        <p>You have the right to access, update, or request deletion of your personal data. Contact us if you have any questions regarding your privacy.</p>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
