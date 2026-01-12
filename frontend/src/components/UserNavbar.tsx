import React, { useState } from 'react';
import { Link, useNavigate, NavLink } from 'react-router-dom';
import { getProfile } from '../services/userService';
import ConfirmationModal from './ConfirmationModal';
import '../styles/UserNavbar.css';

const UserNavbar: React.FC = () => {
    const navigate = useNavigate();
    const role = localStorage.getItem('role');
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [userProfile, setUserProfile] = useState<any>(null);

    React.useEffect(() => {
        const fetchProfileData = async () => {
            try {
                if (localStorage.getItem('token')) {
                    const data = await getProfile();
                    setUserProfile(data);
                }
            } catch (err) {
                console.error("Failed to fetch profile in navbar", err);
            }
        };
        fetchProfileData();
    }, []);

    const handleLogoutConfirm = () => {
        localStorage.clear();
        setIsLogoutModalOpen(false);
        setIsDropdownOpen(false);
        navigate('/');
        window.location.reload();
    };

    const NavIcon = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => (
        <NavLink
            to={to}
            className={({ isActive }) => `nav-icon-link ${isActive ? 'active' : ''}`}
            title={label}
            onClick={() => setIsDropdownOpen(false)}
        >
            {icon}
            <span className="icon-label">{label}</span>
        </NavLink>
    );

    const DropdownItem = ({ to, icon, label, onClick }: { to?: string; icon: React.ReactNode; label: string; onClick?: () => void }) => {
        const content = (
            <>
                <span className="dropdown-item-icon">{icon}</span>
                <span className="dropdown-item-label">{label}</span>
            </>
        );

        if (to) {
            return (
                <Link to={to} className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                    {content}
                </Link>
            );
        }

        return (
            <button className="dropdown-item" onClick={onClick}>
                {content}
            </button>
        );
    };

    return (
        <nav className="saas-nav user-saas-nav">
            <div className="nav-wrapper">
                <Link to="/" className="saas-logo">
                    <div className="logo-box">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v15.661a2.5 2.5 0 0 1-2.261 2.482L5 20.5a2.5 2.5 0 0 1-1-5z"></path>
                            <path d="M8 7h8"></path>
                            <path d="M8 11h8"></path>
                        </svg>
                    </div>
                    <span>Bookstack</span>
                </Link>

                <div className="nav-actions-icons">
                    <NavIcon to="/" label="Home" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>} />

                    <NavIcon to="/books" label="Books" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v15.661a2.5 2.5 0 0 1-2.261 2.482L5 20.5a2.5 2.5 0 0 1-1-5z"></path><path d="M8 7h8"></path><path d="M8 11h8"></path></svg>} />

                    {role === 'user' && (
                        <>
                            <NavIcon to="/dashboard" label="Dashboard" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg>} />
                            <NavIcon to="/wishlist" label="Wishlist" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.509 4.048 3 5.5L12 21l7-7Z" /></svg>} />
                        </>
                    )}

                    {role === 'admin' && (
                        <NavIcon to="/admin-dashboard" label="Admin" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" /><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="M20 12h2" /><path d="M2 12h2" /><path d="m19.07 4.93-1.41 1.41" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 19.07-1.41-1.41" /><path d="m6.34 6.34-1.41-1.41" /></svg>} />
                    )}

                    {localStorage.getItem('token') ? (
                        <div className="user-profile-dropdown-container">
                            <button
                                className={`user-avatar-trigger ${isDropdownOpen ? 'active' : ''}`}
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                title="Profile & Settings"
                            >
                                <div className="avatar-circle">
                                    {userProfile?.profileImage ? (
                                        <img src={userProfile.profileImage} alt="User" />
                                    ) : (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                    )}
                                </div>
                                <svg className={`chevron-icon ${isDropdownOpen ? 'open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                            </button>

                            {isDropdownOpen && (
                                <div className="profile-dropdown-menu">
                                    <div className="dropdown-header">
                                        <span className="user-name-display">{userProfile?.name || 'Reader'}</span>
                                        <span className="user-role-badge">{role === 'admin' ? 'Administrator' : 'Reader'}</span>
                                    </div>
                                    <div className="dropdown-divider"></div>

                                    <DropdownItem
                                        to="/profile"
                                        label="My Profile"
                                        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>}
                                    />

                                    {role === 'user' && (
                                        <DropdownItem
                                            to="/request-book"
                                            label="Request Book"
                                            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>}
                                        />
                                    )}

                                    <div className="dropdown-divider"></div>
                                    <DropdownItem
                                        label="Sign Out"
                                        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>}
                                        onClick={() => setIsLogoutModalOpen(true)}
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        <Link to="/login" className="nav-cta-mini">Sign In</Link>
                    )}
                </div>
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
