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
                        Welcome to Bookstack, a modern digital sanctuary designed to empower readers and streamline the discovery of knowledge in our community.
                    </p>
                    <p className="static-text-p">
                        We believe that access to books should be as seamless as it is inspiring. Our platform bridges the gap between traditional lending and modern digital convenience.
                    </p>
                </div>

                <div className="about-stats-grid">
                    <div className="about-stat-item saas-reveal">
                        <span className="stat-number">10k+</span>
                        <span className="stat-label">Unique Titles</span>
                    </div>
                    <div className="about-stat-item saas-reveal" style={{ transitionDelay: '0.1s' }}>
                        <span className="stat-number">24/7</span>
                        <span className="stat-label">Cloud Access</span>
                    </div>
                    <div className="about-stat-item saas-reveal" style={{ transitionDelay: '0.2s' }}>
                        <span className="stat-number">Free</span>
                        <span className="stat-label">Membership</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default About;
