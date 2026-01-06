import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ConfirmationModal from './ConfirmationModal';
import '../styles/UserNavbar.css';

const UserNavbar: React.FC = () => {
    const navigate = useNavigate();
    const role = localStorage.getItem('role');
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

    const handleLogoutConfirm = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        setIsLogoutModalOpen(false);
        navigate('/login');
    };

    return (
        <nav className="user-navbar">
            <Link to="/" className="navbar-logo" style={{ color: 'var(--primary-color)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v15.661a2.5 2.5 0 0 1-2.261 2.482L5 20.5a2.5 2.5 0 0 1-1-5z"></path></svg>
                <span>E-Library</span>
            </Link>

            <div className="navbar-links">
                <Link to="/" className="nav-link">Home</Link>
                {role === 'user' && (
                    <>
                        <Link to="/dashboard" className="nav-link">My Dashboard</Link>
                        <Link to="/wishlist" className="nav-link">Wishlist</Link>
                    </>
                )}
                {role === 'admin' && (
                    <Link to="/admin-dashboard" className="nav-link">Admin Panel</Link>
                )}
                <button onClick={() => setIsLogoutModalOpen(true)} className="logout-btn">Logout</button>
            </div>

            <ConfirmationModal
                isOpen={isLogoutModalOpen}
                title="Confirm Logout"
                message="Are you sure you want to log out?"
                onConfirm={handleLogoutConfirm}
                onCancel={() => setIsLogoutModalOpen(false)}
                type="warning"
                confirmText="Logout"
            />
        </nav>
    );
};

export default UserNavbar;
