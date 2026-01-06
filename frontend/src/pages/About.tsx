import React from 'react';
import UserNavbar from '../components/UserNavbar';
import Footer from '../components/Footer';

import '../styles/StaticPages.css';

const About: React.FC = () => {
    return (
        <div className="static-page-container">
            <UserNavbar />
            <div className="static-content-wrapper">
                <h1 className="static-title-h1">About E-Library</h1>

                <div className="about-intro-card">
                    <p className="static-text-p">
                        Welcome to the E-Library, a modern digital solution designed to streamline the management and accessibility of books for our community.
                    </p>
                    <p className="static-text-p">
                        Our mission is to provide an easy-to-use platform where users can discover new books, manage their reading lists, and easily borrow titles from our extensive collection.
                    </p>
                    <p className="static-text-p">
                        Whether you are reading for leisure or research, E-Library is here to support your journey with a seamless, intuitive experience.
                    </p>
                </div>

                <div className="about-stats-grid">
                    <div className="about-stat-item">
                        <div className="stat-number">1000+</div>
                        <div className="stat-label">Books Available</div>
                    </div>
                    <div className="about-stat-item">
                        <div className="stat-number">24/7</div>
                        <div className="stat-label">Digital Access</div>
                    </div>
                    <div className="about-stat-item">
                        <div className="stat-number">Free</div>
                        <div className="stat-label">For All Members</div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default About;
