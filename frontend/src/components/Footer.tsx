import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Footer.css';

const Footer: React.FC = () => {
    return (
        <footer className="footer">
            <div className="footer-container">
                <div className="footer-section">
                    <h4 className="footer-title">E-Library</h4>
                    <p className="footer-description">
                        Making the world's knowledge accessible to everyone, everywhere. Reliable, inclusive, and forward-looking.
                    </p>
                </div>

                <div className="footer-section">
                    <h5 className="footer-subtitle">Quick Links</h5>
                    <ul className="footer-links">
                        <li><Link to="/">Home</Link></li>
                        <li><Link to="/books">Borrow Books</Link></li>
                        <li><Link to="/contact">Contact Us</Link></li>
                    </ul>
                </div>

                <div className="footer-section">
                    <h5 className="footer-subtitle">Company</h5>
                    <ul className="footer-links">
                        <li><Link to="/about">About Us</Link></li>
                        <li><Link to="/mission">Our Mission</Link></li>
                        <li><Link to="/terms">Terms & Conditions</Link></li>
                        <li><Link to="/privacy">Privacy Policy</Link></li>
                    </ul>
                </div>

                <div className="footer-section">
                    <h5 className="footer-subtitle">Follow Us</h5>
                    <div className="footer-socials">
                        <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-link">Facebook</a>
                        <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-link">Instagram</a>
                        <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-link">Twitter</a>
                    </div>
                </div>
            </div>
            <div className="footer-bottom">
                <p>© {new Date().getFullYear()} E-Library Global System. All rights reserved.</p>
            </div>
        </footer>
    );
};

export default Footer;
