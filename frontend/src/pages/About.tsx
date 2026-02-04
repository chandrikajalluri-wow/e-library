import React from 'react';


import '../styles/StaticPages.css';

const About: React.FC = () => {
    return (
        <div className="static-page-container">
            <div className="static-content-wrapper">
                <div className="static-hero saas-reveal">
                    <h1 className="static-title-h1">About Bookstack</h1>
                    <p className="static-subtitle">The future of digital reading and library management.</p>
                </div>

                <div className="about-intro-card saas-reveal">
                    <p className="static-text-p">
                        Welcome to Bookstack, your comprehensive digital library companion. We've built more than just a PDF viewer; we've created a modern sanctuary for readers to manage, discover, and enjoy their favorite books in a seamless, high-performance environment.
                    </p>
                    <p className="static-text-p">
                        Our platform is designed to bridge the gap between traditional reading and modern digital convenience. Whether you're a student, a professional, or a casual reader, Bookstack provides the tools you need to organize your personal library and expand your horizons.
                    </p>
                </div>

                <div className="mission-grid" style={{ marginBottom: '4rem' }}>
                    <div className="mission-card saas-reveal">
                        <h3 className="mission-card-title">Seamless Organization</h3>
                        <p className="mission-card-text">Manage your personal collection with ease. Save books to your library, track your progress, and pick up exactly where you left off across any device.</p>
                    </div>
                    <div className="mission-card saas-reveal" style={{ transitionDelay: '0.1s' }}>
                        <h3 className="mission-card-title">Community Driven</h3>
                        <p className="mission-card-text">Bookstack thrives on community. From user-suggested favorites to detailed reviews and ratings, we empower readers to shape the library's future.</p>
                    </div>
                </div>

                <div className="about-intro-card saas-reveal" style={{ background: 'var(--saas-bg-light)', borderColor: 'var(--primary-color)' }}>
                    <h2 className="mission-card-title" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Flexible Access & Ownership</h2>
                    <p className="static-text-p" style={{ textAlign: 'center' }}>
                        At Bookstack, we offer multiple ways to access knowledge. Choose a <strong>Membership Plan</strong> that fits your reading habits, providing unlimited access to our vast digital collection.
                    </p>
                    <p className="static-text-p" style={{ textAlign: 'center', marginBottom: 0 }}>
                        Looking for something permanent? You can also <strong>purchase physical copies</strong> of your favorite titles, allowing you to build your own tangible library that you can cherish forever.
                    </p>
                </div>

                <div className="about-stats-grid">
                    <div className="about-stat-item saas-reveal">
                        <span className="stat-number">1,000+</span>
                        <span className="stat-label">Verified Books</span>
                    </div>
                    <div className="about-stat-item saas-reveal" style={{ transitionDelay: '0.1s' }}>
                        <span className="stat-number">24/7</span>
                        <span className="stat-label">Cloud Syncing</span>
                    </div>
                    <div className="about-stat-item saas-reveal" style={{ transitionDelay: '0.2s' }}>
                        <span className="stat-number">Gold</span>
                        <span className="stat-label">User Experience</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default About;
