import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Flame, Megaphone } from 'lucide-react';
import { getProfile } from '../services/userService';
import { RoleName } from '../types/enums';
import ConfirmationModal from './ConfirmationModal';
import NotificationCenter from './NotificationCenter';
import { useBorrowCart } from '../context/BorrowCartContext';
import '../styles/UserNavbar.css';

const UserNavbar: React.FC = () => {
    const navigate = useNavigate();
    const role = localStorage.getItem('role');
    const { getCartCount } = useBorrowCart();
    const cartCount = getCartCount();
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
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('userId');
        setIsLogoutModalOpen(false);
        setIsDropdownOpen(false);
        navigate('/');
        window.location.reload();
    };

    const NavIcon = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => {
        const location = useLocation();

        // Highlight stats/metrics tab if on dashboard with no search params
        const currentPath = location.pathname + (location.search || '');
        const isStatsDefault = to.includes('tab=stats') && location.pathname === '/admin-dashboard' && !location.search;
        const isMetricsDefault = to.includes('tab=metrics') && location.pathname === '/super-admin-dashboard' && !location.search;
        const isActive = (currentPath === to) || isStatsDefault || isMetricsDefault;

        return (
            <Link
                to={to}
                className={`nav-icon-link ${isActive ? 'active' : ''}`}
                onClick={() => setIsDropdownOpen(false)}
            >
                {icon}
                <span className="icon-label">{label}</span>
            </Link>
        );
    };

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

    const location = useLocation();

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
                    {/* Home and Books links - only show for users or logged-out guests */}
                    {(role === RoleName.USER || !role) && (
                        <>
                            {location.pathname !== '/' && (
                                <NavIcon to="/" label="Home" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>} />
                            )}
                            {localStorage.getItem('token') && (
                                <NavIcon to="/books" label="Books" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v15.661a2.5 2.5 0 0 1-2.261 2.482L5 20.5a2.5 2.5 0 0 1-1-5z"></path><path d="M8 7h8"></path><path d="M8 11h8"></path></svg>} />
                            )}
                        </>
                    )}

                    {role === RoleName.USER && (
                        <>
                            <NavIcon to="/dashboard" label="Dashboard" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /></svg>} />
                            <NavIcon to="/wishlist" label="Wishlist" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.509 4.048 3 5.5L12 21l7-7Z" /></svg>} />
                            <div style={{ position: 'relative' }}>
                                <NavIcon to="/borrow-cart" label="Cart" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" /></svg>} />
                                {cartCount > 0 && (
                                    <span style={{
                                        position: 'absolute',
                                        top: '-4px',
                                        right: '-4px',
                                        background: '#ef4444',
                                        color: 'white',
                                        borderRadius: '50%',
                                        width: '18px',
                                        height: '18px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '11px',
                                        fontWeight: '600'
                                    }}>
                                        {cartCount}
                                    </span>
                                )}
                            </div>

                        </>
                    )}

                    {role === RoleName.ADMIN && (
                        <>
                            <NavIcon to="/admin-dashboard?tab=stats" label="Stats" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>} />
                            <NavIcon to="/admin-dashboard?tab=books" label="Books" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>} />
                            <NavIcon to="/admin/orders" label="Orders" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>} />
                            <NavIcon to="/admin-dashboard?tab=categories" label="Category" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>} />
                            <NavIcon to="/admin-dashboard?tab=requests" label="Returns" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>} />
                            <NavIcon to="/admin-dashboard?tab=user-requests" label="Suggest" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>} />
                            <NavIcon to="/admin-dashboard?tab=borrows" label="Read History" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>} />
                            <NavIcon to="/admin-dashboard?tab=logs" label="Logs" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>} />
                        </>
                    )}

                    {role === RoleName.SUPER_ADMIN && (
                        <>
                            <NavIcon to="/super-admin-dashboard?tab=metrics" label="Metrics" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>} />
                            <NavIcon to="/super-admin-dashboard?tab=users" label="Users" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>} />
                            <NavIcon to="/super-admin-dashboard?tab=books" label="Books" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>} />
                            <NavIcon to="/super-admin-dashboard?tab=categories" label="Category" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>} />
                            <NavIcon to="/super-admin-dashboard?tab=announcements" label="Announcements" icon={<Megaphone size={20} />} />
                            <NavIcon to="/super-admin-dashboard?tab=queries" label="Queries" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>} />
                            <NavIcon to="/super-admin-dashboard?tab=reported-reviews" label="Reports" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>} />
                            <NavIcon to="/super-admin-dashboard?tab=logs" label="System" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>} />
                        </>
                    )}

                    {localStorage.getItem('token') ? (
                        <div className="user-profile-dropdown-container">
                            {/* Streaks: Only for Users */}
                            {role === RoleName.USER && userProfile?.streakCount > 0 && (
                                <div className="streak-display" title={`${userProfile.streakCount} Day Streak!`}>
                                    <Flame size={16} className="streak-icon" fill="currentColor" />
                                    <span>{userProfile.streakCount}</span>
                                </div>
                            )}

                            {/* Notifications: For everyone */}
                            <div className="nav-action-center-wrapper">
                                <NotificationCenter />
                            </div>

                            {/* Profile/Logout Actions */}
                            {role === RoleName.USER ? (
                                <div className="user-avatar-dropdown-wrapper" style={{ display: 'flex', alignItems: 'center' }}>
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
                                                <span className="user-role-badge">Reader</span>
                                            </div>
                                            <div className="dropdown-divider"></div>
                                            <DropdownItem to="/profile" label="My Profile" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>} />
                                            <DropdownItem to="/my-orders" label="My Orders" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>} />
                                            <DropdownItem to="/request-book" label="Request Book" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>} />
                                            <DropdownItem to="/settings" label="User Settings" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>} />
                                            <div className="dropdown-divider"></div>
                                            <DropdownItem label="Sign Out" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>} onClick={() => setIsLogoutModalOpen(true)} />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <button
                                    className="nav-icon-link"
                                    onClick={() => setIsLogoutModalOpen(true)}
                                    title="Sign Out"
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                                    <span className="icon-label">Sign Out</span>
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="nav-guest-actions">
                            <Link to="/login" className="nav-cta">Sign In</Link>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmationModal
                isOpen={isLogoutModalOpen}
                title="Confirm Sign Out"
                message="Are you sure you want to sign out?"
                onConfirm={handleLogoutConfirm}
                onCancel={() => setIsLogoutModalOpen(false)}
                type="warning"
                confirmText="Sign Out"
            />
        </nav>
    );
};

export default UserNavbar;
