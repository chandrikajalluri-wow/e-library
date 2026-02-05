import React from 'react';

import '../styles/StaticPages.css';

const TermsAndConditions: React.FC = () => {
    return (
        <div className="static-page-container">
            <div className="static-content-wrapper">
                <div className="static-hero saas-reveal">
                    <h1 className="static-title-h1">Terms & Conditions</h1>
                    <p className="static-subtitle">Please read our library policies carefully</p>
                </div>

                <div className="policy-container saas-reveal">
                    <div className="policy-card">
                        <div className="terms-intro">
                            <p><strong>Welcome to Bookstack Library</strong></p>
                            <p>By creating an account, browsing books, buying books, reading PDFs, or using any feature, you agree to follow these Terms & Conditions.</p>
                        </div>

                        <section className="policy-section">
                            <h2 className="policy-subtitle-h2">1. Account & User Responsibilities</h2>
                            <ul>
                                <li>You must provide accurate information during signup.</li>
                                <li>You are responsible for keeping your login credentials secure.</li>
                                <li>You must not use the platform for illegal, harmful, or abusive activities.</li>
                                <li>You cannot create multiple accounts to exploit membership plans or offers.</li>
                            </ul>
                        </section>

                        <section className="policy-section">
                            <h2 className="policy-subtitle-h2">2. Content & Copyright</h2>
                            <ul>
                                <li>All book content, descriptions, metadata, and images belong to their respective authors or publishers.</li>
                                <li>Users must not copy, redistribute, or modify protected content.</li>
                                <li>AI-generated descriptions are for internal use and may not always be 100% accurate.</li>
                            </ul>
                        </section>

                        <section className="policy-section">
                            <h2 className="policy-subtitle-h2">3. Orders, Checkout & Delivery</h2>
                            <ul>
                                <li>Users must provide valid delivery information.</li>
                                <li>Users can track order status: Processing → Shipped → Delivered → Canceled.</li>
                                <li>Delivery timelines may vary based on location and availability.</li>
                                <li>False claims, invalid addresses, or abusive behavior may lead to account suspension.</li>
                            </ul>
                        </section>

                        <section className="policy-section">
                            <h2 className="policy-subtitle-h2">4. Email Notifications</h2>
                            <p>You agree to receive transactional emails such as:</p>
                            <ul>
                                <li>Due date reminders</li>
                                <li>Return approvals & Order updates</li>
                                <li>Account-related alerts</li>
                            </ul>
                        </section>

                        <section className="policy-section">
                            <h2 className="policy-subtitle-h2">5. Privacy & Data Usage</h2>
                            <ul>
                                <li>We collect only necessary information (name, email, membership, history).</li>
                                <li>Passwords are encrypted and stored securely.</li>
                                <li>We do not sell your personal data to third parties.</li>
                                <li>Cookies may be used for login sessions and offline reading.</li>
                            </ul>
                        </section>

                        <section className="policy-section">
                            <h2 className="policy-subtitle-h2">6. Prohibited Activities</h2>
                            <p>You are not allowed to:</p>
                            <ul>
                                <li>Hack or attempt to bypass system restrictions.</li>
                                <li>Download files using automated tools.</li>
                                <li>Share login details with others or abuse the borrowing system.</li>
                                <li>Upload harmful files or impersonate others.</li>
                            </ul>
                        </section>

                        <section className="policy-section">
                            <h2 className="policy-subtitle-h2">7. Service Changes</h2>
                            <p>We may update features, membership benefits, borrowing rules, or remove content at our discretion. You will be notified of important changes.</p>
                        </section>

                        <section className="policy-section">
                            <h2 className="policy-subtitle-h2">8. Limitation of Liability</h2>
                            <p>We are not responsible for loss of offline files due to device resets, incorrect AI descriptions, or issues caused by third-party services.</p>
                        </section>

                        <section className="policy-section">
                            <h2 className="policy-subtitle-h2">9. Account Deletion</h2>
                            <p>Users can delete their account anytime. Deleted accounts cannot be recovered. We reserve the right to delete accounts that violate these rules.</p>
                        </section>

                        <section className="policy-section">
                            <h2 className="policy-subtitle-h2">10. Governing Law</h2>
                            <p>These terms are governed by Indian laws.</p>
                        </section>

                        <section className="policy-section">
                            <h2 className="policy-subtitle-h2">11. Contact Us</h2>
                            <p>For support or inquiries: <strong>chandrika6300@gmail.com</strong></p>
                        </section>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default TermsAndConditions;
