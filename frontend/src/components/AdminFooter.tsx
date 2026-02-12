import React from 'react';
import { Link } from 'react-router-dom';
import { RoleName } from '../types/enums';

const AdminFooter: React.FC = () => {
    const role = localStorage.getItem('role') as RoleName;

    const handleLinkClick = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const renderLinks = () => {
        if (role === RoleName.SUPER_ADMIN) {
            return (
                <ul className="footer-links">
                    <li><Link to="/super-admin-dashboard?tab=metrics" onClick={handleLinkClick}>System Metrics</Link></li>
                    <li><Link to="/super-admin-dashboard?tab=users" onClick={handleLinkClick}>User Management</Link></li>
                    <li><Link to="/super-admin-dashboard?tab=books" onClick={handleLinkClick}>Library Collection</Link></li>
                    <li><Link to="/super-admin-dashboard?tab=categories" onClick={handleLinkClick}>Library Categories</Link></li>
                    <li><Link to="/super-admin-dashboard?tab=announcements" onClick={handleLinkClick}>Announcements</Link></li>
                    <li><Link to="/super-admin-dashboard?tab=queries" onClick={handleLinkClick}>User Queries</Link></li>
                    <li><Link to="/super-admin-dashboard?tab=reported-reviews" onClick={handleLinkClick}>Review Reports</Link></li>
                    <li><Link to="/super-admin-dashboard?tab=logs" onClick={handleLinkClick}>System Activity Logs</Link></li>
                </ul>
            );
        } else if (role === RoleName.ADMIN) {
            return (
                <ul className="footer-links">
                    <li><Link to="/admin-dashboard?tab=stats" onClick={handleLinkClick}>Dashboard Overview</Link></li>
                    <li><Link to="/admin-dashboard?tab=books" onClick={handleLinkClick}>Manage Books</Link></li>
                    <li><Link to="/admin-dashboard?tab=categories" onClick={handleLinkClick}>Manage Categories</Link></li>
                    <li><Link to="/admin-dashboard?tab=requests" onClick={handleLinkClick}>Exchange Requests</Link></li>
                    <li><Link to="/admin-dashboard?tab=user-requests" onClick={handleLinkClick}>Book Requests</Link></li>
                    <li><Link to="/admin-dashboard?tab=borrows" onClick={handleLinkClick}>Read History</Link></li>
                    <li><Link to="/admin/orders" onClick={handleLinkClick}>Manage Orders</Link></li>
                    <li><Link to="/admin-dashboard?tab=support" onClick={handleLinkClick}>Customer Support</Link></li>
                </ul>
            );
        }
        return null;
    };

    return (
        <footer className="footer admin-footer">
            <div className="footer-container">
                <div className="footer-section">
                    <h4 className="footer-title">Bookstack</h4>
                    <p className="footer-description">
                        Centralized management system for monitoring and controlling the Bookstack e-library platform.
                    </p>
                </div>

                <div className="footer-section">
                    <h5 className="footer-subtitle">Quick Links</h5>
                    {renderLinks()}
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
                <p>© {new Date().getFullYear()} Bookstack Global System. All rights reserved.</p>
            </div>
        </footer>
    );
};

export default AdminFooter;
