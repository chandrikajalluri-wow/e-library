import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Flame, Megaphone, Menu, X, ArrowLeftRight } from 'lucide-react';
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
    const [isMoreOpen, setIsMoreOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [userProfile, setUserProfile] = useState<any>(null);
    const navbarRef = React.useRef<HTMLDivElement>(null);

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

        const handleClickOutside = (event: MouseEvent) => {
            if (navbarRef.current && !navbarRef.current.contains(event.target as Node)) {
                closeAll();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const closeAll = () => {
        setIsDropdownOpen(false);
        setIsMoreOpen(false);
        setIsMenuOpen(false);
    };

    const handleLogoutConfirm = () => {
        const userId = localStorage.getItem('userId');
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('userId');
        if (userId) {
            localStorage.removeItem(`borrowCart_${userId}`);
        }
        localStorage.removeItem('borrowCart');
        localStorage.removeItem('readlist');
        setIsLogoutModalOpen(false);
        closeAll();
        navigate('/');
        window.location.reload();
    };

    const NavIcon = ({ to, icon, label, className = '' }: { to: string; icon: React.ReactNode; label: string; className?: string }) => {
        const location = useLocation();
        const currentPath = location.pathname + (location.search || '');
        const isStatsDefault = to.includes('tab=stats') && location.pathname === '/admin-dashboard' && !location.search;
        const isMetricsDefault = to.includes('tab=metrics') && location.pathname === '/super-admin-dashboard' && !location.search;
        const isActive = (currentPath === to) || isStatsDefault || isMetricsDefault;

        return (
            <Link
                to={to}
                className={`nav-icon-link ${isActive ? 'active' : ''} ${className}`}
                onClick={closeAll}
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
                <Link to={to} className="dropdown-item" onClick={closeAll}>
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
    const currentPath = location.pathname + (location.search || '');
    const isMoreActive = currentPath.includes('tab=user-requests') ||
        currentPath.includes('tab=borrows') ||
        currentPath.includes('tab=announcements') ||
        currentPath.includes('tab=queries') ||
        currentPath.includes('tab=reported-reviews') ||
        currentPath.includes('tab=logs');

    return (
        <nav className="saas-nav user-saas-nav" ref={navbarRef}>
            <div className="nav-wrapper">
                <Link to="/" className="saas-logo" onClick={closeAll}>
                    <div className="logo-box">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v15.661a2.5 2.5 0 0 1-2.261 2.482L5 20.5a2.5 2.5 0 0 1-1-5z"></path>
                            <path d="M8 7h8"></path>
                            <path d="M8 11h8"></path>
                        </svg>
                    </div>
                    <span>Bookstack</span>
                </Link>

                {/* Mobile Top Actions (Visible only on mobile/tablet) */}
                <div className="mobile-only mobile-action-center">
                    {role === RoleName.USER && (
                        <div className="mobile-streak-navbar-wrapper">
                            <Link to="/borrow-cart" className="mobile-action-btn" onClick={closeAll}>
                                <div className="cart-icon-wrapper">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                                    {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
                                </div>
                            </Link>
                            {userProfile?.streakCount > 0 && (
                                <div className="streak-display mobile-nav-streak" title={`${userProfile.streakCount} Day Streak!`}>
                                    <Flame size={16} className="streak-icon" fill="currentColor" />
                                    <span>{userProfile.streakCount}</span>
                                </div>
                            )}
                        </div>
                    )}
                    {localStorage.getItem('token') && (
                        <div className="mobile-action-btn">
                            <NotificationCenter />
                        </div>
                    )}
                    <button
                        className="hamburger-menu-btn"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        aria-label="Toggle Menu"
                    >
                        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>

                <button
                    className="hamburger-menu-btn desktop-hidden"
                    style={{ display: 'none' }} // Placeholder if needed, but handled by mobile-action-center now
                >
                </button>

                {/* Navigation Links - Sidebar on Mobile, Horizontal on Desktop */}
                <div className={`nav-actions-icons ${isMenuOpen ? 'mobile-show' : ''}`}>
                    {/* Public/Guest Navigation */}
                    {(role === RoleName.USER || !role) && (
                        <>
                            {localStorage.getItem('token') && (
                                <>
                                    <NavIcon to="/" label="Home" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>} />
                                    <NavIcon to="/books" label="Books" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v15.661a2.5 2.5 0 0 1-2.261 2.482L5 20.5a2.5 2.5 0 0 1-1-5z"></path><path d="M8 7h8"></path><path d="M8 11h8"></path></svg>} />
                                </>
                            )}
                            {!localStorage.getItem('token') && (
                                <Link to="/login" className="nav-icon-link mobile-only" onClick={closeAll}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>
                                    <span className="icon-label">Sign In</span>
                                </Link>
                            )}
                        </>
                    )}

                    {/* User Specific Navigation */}
                    {role === RoleName.USER && (
                        <>
                            <NavIcon to="/dashboard" label="Dashboard" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /></svg>} />
                            <NavIcon to="/wishlist" label="Wishlist" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.509 4.048 3 5.5L12 21l7-7Z" /></svg>} />
                            <Link to="/borrow-cart" className="nav-icon-link nav-cart-link desktop-only" onClick={closeAll}>
                                <div className="cart-icon-wrapper">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                                    {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
                                </div>
                                <span className="icon-label">Cart</span>
                            </Link>
                        </>
                    )}

                    {/* Admin Navigation */}
                    {role === RoleName.ADMIN && (
                        <>
                            <NavIcon to="/admin-dashboard?tab=stats" label="Stats" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>} />
                            <NavIcon to="/admin-dashboard?tab=books" label="Books" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>} />
                            <NavIcon to="/admin/orders" label="Orders" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>} />
                            <NavIcon to="/admin-dashboard?tab=categories" label="Category" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>} />
                            <NavIcon to="/admin-dashboard?tab=requests" label="Exchanges" icon={<ArrowLeftRight size={20} />} />
                            <NavIcon to="/admin-dashboard?tab=support" label="Support" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>} />

                            {/* Flattened Links for Mobile */}
                            <NavIcon className="mobile-only" to="/admin-dashboard?tab=user-requests" label="Suggest" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>} />
                            <NavIcon className="mobile-only" to="/admin-dashboard?tab=borrows" label="Read History" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>} />
                            <NavIcon className="mobile-only" to="/admin-dashboard?tab=logs" label="Logs" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>} />

                            {/* Desktop More Dropdown */}
                            <div className="nav-more-dropdown-container desktop-only">
                                <button className={`nav-more-trigger ${isMoreOpen ? 'active' : ''} ${isMoreActive ? 'active-link' : ''}`} onClick={() => setIsMoreOpen(!isMoreOpen)}>
                                    <span className="icon-label">More</span>
                                    <svg className={`chevron-icon-inline ${isMoreOpen ? 'open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                </button>
                                {isMoreOpen && (
                                    <div className="profile-dropdown-menu nav-more-dropdown-menu">
                                        <DropdownItem to="/admin-dashboard?tab=user-requests" label="Suggest" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>} />
                                        <DropdownItem to="/admin-dashboard?tab=borrows" label="Read History" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>} />
                                        <DropdownItem to="/admin-dashboard?tab=logs" label="Logs" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>} />
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Super Admin Navigation */}
                    {role === RoleName.SUPER_ADMIN && (
                        <>
                            <NavIcon to="/super-admin-dashboard?tab=metrics" label="Metrics" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>} />
                            <NavIcon to="/super-admin-dashboard?tab=users" label="Users" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>} />
                            <NavIcon to="/super-admin-dashboard?tab=books" label="Books" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>} />
                            <NavIcon to="/super-admin-dashboard?tab=categories" label="Category" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>} />

                            {/* Flattened Links for Mobile */}
                            <NavIcon className="mobile-only" to="/super-admin-dashboard?tab=announcements" label="Announcements" icon={<Megaphone size={20} />} />
                            <NavIcon className="mobile-only" to="/super-admin-dashboard?tab=queries" label="Queries" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>} />
                            <NavIcon className="mobile-only" to="/super-admin-dashboard?tab=reported-reviews" label="Reports" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>} />
                            <NavIcon className="mobile-only" to="/super-admin-dashboard?tab=logs" label="System Logs" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>} />

                            {/* Desktop More Dropdown */}
                            <div className="nav-more-dropdown-container desktop-only">
                                <button className={`nav-more-trigger ${isMoreOpen ? 'active' : ''} ${isMoreActive ? 'active-link' : ''}`} onClick={() => setIsMoreOpen(!isMoreOpen)}>
                                    <span className="icon-label">More</span>
                                    <svg className={`chevron-icon-inline ${isMoreOpen ? 'open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                </button>
                                {isMoreOpen && (
                                    <div className="profile-dropdown-menu nav-more-dropdown-menu">
                                        <DropdownItem to="/super-admin-dashboard?tab=announcements" label="Announcements" icon={<Megaphone size={16} />} />
                                        <DropdownItem to="/super-admin-dashboard?tab=queries" label="Queries" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>} />
                                        <DropdownItem to="/super-admin-dashboard?tab=reported-reviews" label="Reports" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>} />
                                        <DropdownItem to="/super-admin-dashboard?tab=logs" label="System Logs" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>} />
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Integrated Mobile Action Footer */}
                    {localStorage.getItem('token') && (
                        <div className="mobile-only mobile-integrated-actions">
                            {role === RoleName.USER && (
                                <>
                                    <NavIcon to="/profile" label="My Profile" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>} />
                                    <NavIcon to="/my-orders" label="My Orders" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>} />
                                    <NavIcon to="/request-book" label="Request Book" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>} />
                                    <NavIcon to="/settings" label="Settings" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>} />
                                </>
                            )}
                            <button className="nav-icon-link sign-out-mobile" onClick={() => { setIsLogoutModalOpen(true); closeAll(); }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                                <span className="icon-label">Sign Out</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Desktop Action Center */}
                {localStorage.getItem('token') ? (
                    <div className="user-profile-dropdown-container desktop-only">
                        {role === RoleName.USER && userProfile?.streakCount > 0 && (
                            <div className="streak-display" title={`${userProfile.streakCount} Day Streak!`}>
                                <Flame size={16} className="streak-icon" fill="currentColor" />
                                <span>{userProfile.streakCount}</span>
                            </div>
                        )}
                        <div className="nav-action-center-wrapper">
                            <NotificationCenter />
                        </div>

                        {/* User Role: Show Avatar Dropdown */}
                        {role === RoleName.USER && (
                            <div className="user-avatar-dropdown-wrapper">
                                <button className={`user-avatar-trigger ${isDropdownOpen ? 'active' : ''}`} onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
                                    <div className="avatar-circle">
                                        {userProfile?.profileImage ? <img src={userProfile.profileImage} alt="User" /> : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>}
                                    </div>
                                    <svg className={`chevron-icon ${isDropdownOpen ? 'open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                </button>
                                {isDropdownOpen && (
                                    <div className="profile-dropdown-menu saas-reveal">
                                        <div className="dropdown-header">
                                            <span className="user-name-display">{userProfile?.name || 'Reader'}</span>
                                            <span className="user-role-badge">{role || 'User'}</span>
                                        </div>
                                        <div className="dropdown-divider"></div>
                                        <DropdownItem to="/profile" label="My Profile" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>} />
                                        <DropdownItem to="/my-orders" label="My Orders" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>} />
                                        <DropdownItem to="/request-book" label="Request Book" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>} />
                                        <div className="dropdown-divider"></div>
                                        <DropdownItem to="/settings" label="Settings" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>} />
                                        <div className="dropdown-divider"></div>
                                        <DropdownItem label="Sign Out" onClick={() => setIsLogoutModalOpen(true)} icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>} />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Admin & Super Admin: Show Direct Sign Out Button */}
                        {(role === RoleName.ADMIN || role === RoleName.SUPER_ADMIN) && (
                            <button className="nav-icon-link admin-signout-btn" onClick={() => setIsLogoutModalOpen(true)} title="Sign Out">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="nav-guest-actions desktop-only">
                        <Link to="/login" className="nav-cta" onClick={closeAll}>Sign In</Link>
                    </div>
                )}
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
