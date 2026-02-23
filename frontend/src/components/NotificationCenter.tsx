import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getMyNotifications, markNotificationRead, markAllNotificationsRead,
    markAsRead as markAdminRead,
    markAllAsRead as markAllAdminRead
} from '../services/notificationService';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { RoleName } from '../types/enums';
import '../styles/NotificationCenter.css';

const NotificationCenter: React.FC<{ showLabel?: boolean }> = ({ showLabel }) => {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const role = localStorage.getItem('role');
    const isAdmin = role === RoleName.ADMIN || role === RoleName.SUPER_ADMIN;

    const fetchNotifications = async () => {
        try {
            const data = await getMyNotifications();
            setNotifications(data);
        } catch (err) {
            console.error("Failed to fetch notifications", err);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Poll for notifications every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [isAdmin]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkRead = async (id: string) => {
        try {
            if (isAdmin) {
                await markAdminRead(id);
            } else {
                await markNotificationRead(id);
            }
            setNotifications(notifications.map(n => n._id === id ? { ...n, is_read: true } : n));
        } catch (err) {
            console.error("Failed to mark read", err);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            if (isAdmin) {
                await markAllAdminRead();
            } else {
                await markAllNotificationsRead();
            }
            setNotifications(notifications.map(n => ({ ...n, is_read: true })));
        } catch (err) {
            console.error("Failed to mark all read", err);
        }
    };

    const handleNotificationClick = async (notif: any) => {
        if (!notif.is_read) {
            await handleMarkRead(notif._id);
        }

        const type = notif.type?.toLowerCase();

        if (isAdmin) {
            const isSuperAdmin = role === RoleName.SUPER_ADMIN;
            const targetPath = isSuperAdmin ? '/super-admin-dashboard' : '/admin-dashboard';

            if (type === 'order' && notif.target_id) {
                navigate(`/admin/orders/${notif.target_id}`);
            } else if (type === 'return' || (type === 'borrow' && notif.target_id)) {
                navigate(`${targetPath}?tab=requests`);
            } else if (type === 'book_request') {
                navigate(`${targetPath}?tab=user-requests`);
            } else if ((type === 'stock_alert' || type === 'wishlist' || notif.message.toLowerCase().includes('out of stock')) && notif.target_id) {
                navigate(`${targetPath}?tab=books&editBookId=${notif.target_id}`);
            } else if (type === 'book_created' || type === 'book_updated') {
                navigate(`${targetPath}?tab=books&editBookId=${notif.target_id}`);
            } else if (type === 'category_created' || type === 'category_updated') {
                navigate(`${targetPath}?tab=categories`);
            } else if (type === 'review_report') {
                navigate('/super-admin-dashboard?tab=reported-reviews');
            } else if (type === 'contact_query') {
                navigate('/super-admin-dashboard?tab=queries');
            } else if (notif.book_id) {
                const bookId = notif.book_id?._id || notif.book_id;
                navigate(`/books/${bookId}`);
            }
        } else {
            // Redirection logic for regular users
            if (type === 'order' || type === 'return' || type === 'borrow') {
                if (notif.target_id) {
                    navigate(`/orders/${notif.target_id}`);
                } else {
                    navigate('/my-orders');
                }
            } else if (type === 'wishlist' || (type === 'system' && notif.message.includes('New Addition'))) {
                const bookId = notif.book_id?._id || notif.book_id;
                if (bookId) {
                    navigate(`/books/${bookId}`);
                }
            }
        }
        setIsOpen(false);
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <div className="notification-center-container" ref={dropdownRef}>
            <button
                className={`notification-trigger ${isOpen ? 'active' : ''} ${showLabel ? 'with-label' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                title="Notifications"
            >
                <div className="notification-icon-wrapper">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                    </svg>
                    {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
                </div>
                {showLabel && <span className="icon-label">Notifications</span>}
            </button>

            {isOpen && (
                <div className="notification-dropdown saas-reveal">
                    <div className="notification-header">
                        <h3>{isAdmin ? 'Admin Activity' : 'Notifications'}</h3>
                        {unreadCount > 0 && (
                            <button className="mark-all-read" onClick={handleMarkAllRead}>
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <div className="notification-list">
                        {notifications.length > 0 ? (
                            notifications.map((notif) => {
                                const type = notif.type?.toLowerCase();
                                const isActionRequired = isAdmin && (type === 'return' || type === 'book_request' || type === 'order' || type === 'stock_alert');

                                return (
                                    <div
                                        key={notif._id}
                                        className={`notification-item ${notif.is_read ? 'read' : 'unread'} ${isActionRequired ? 'action-required' : ''}`}
                                        onClick={() => handleNotificationClick(notif)}
                                    >
                                        <div className="notif-icon">
                                            {type === 'borrow' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v10.5M4 19.5H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5.5"></path></svg>}
                                            {type === 'return' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>}
                                            {type === 'wishlist' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.509 4.048 3 5.5L12 21l7-7Z"></path></svg>}
                                            {type === 'fine' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 8v8"></path><path d="M8 12h8"></path></svg>}
                                            {type === 'order' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>}
                                            {type === 'book_request' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>}
                                            {type === 'system' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>}
                                        </div>
                                        <div className="notif-content">
                                            {isActionRequired && <span className="action-tag">ACTION REQUIRED</span>}
                                            <p className="notif-message">{notif.message}</p>
                                            <span className="notif-time">
                                                {formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true })}
                                            </span>
                                            <div className="notif-actions-mini">
                                                {/* User Actions */}
                                                {!isAdmin && (type === 'order' || type === 'return' || type === 'borrow') && (() => {
                                                    const msg = notif.message.toLowerCase();
                                                    const isCancelled = msg.includes('cancelled') || msg.includes('canceled');
                                                    return (
                                                        <button
                                                            className={`mini-action-btn ${isCancelled ? 'cancel-btn' : (type === 'order' ? 'order-btn' : 'exchange-btn')}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleNotificationClick(notif);
                                                            }}
                                                        >
                                                            {isCancelled ? 'View Order' : (type === 'order' ? 'View Order' : 'View Exchange')}
                                                        </button>
                                                    );
                                                })()}
                                                {!isAdmin && notif.book_id && (
                                                    <button
                                                        className="mini-action-btn book-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleNotificationClick(notif);
                                                        }}
                                                    >
                                                        View {notif.type === 'system' ? 'Details' : 'Book'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {!notif.is_read && <div className="unread-dot"></div>}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="no-notifications">
                                <p>{isAdmin ? 'No user activities to report' : 'No notifications yet'}</p>
                            </div>
                        )}
                    </div>

                    <div className="notification-footer">
                        <Link to="/notifications" onClick={() => setIsOpen(false)}>
                            View all notifications
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationCenter;
