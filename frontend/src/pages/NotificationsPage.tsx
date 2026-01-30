import React, { useState, useEffect } from 'react';
import { getMyNotifications, markNotificationRead, markAllNotificationsRead } from '../services/notificationService';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import Loader from '../components/Loader';
import '../styles/NotificationCenter.css'; // Reusing styles

const NotificationsPage: React.FC = () => {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        try {
            const data = await getMyNotifications();
            setNotifications(data);
        } catch (err) {
            console.error("Failed to fetch notifications", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const handleMarkRead = async (id: string) => {
        try {
            await markNotificationRead(id);
            setNotifications(notifications.map(n => n._id === id ? { ...n, is_read: true } : n));
        } catch (err) {
            console.error("Failed to mark read", err);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await markAllNotificationsRead();
            setNotifications(notifications.map(n => ({ ...n, is_read: true })));
        } catch (err) {
            console.error("Failed to mark all read", err);
        }
    };

    if (loading) return <Loader />;

    return (
        <div className="notifications-page dashboard-container saas-reveal">
            <header className="admin-header">
                <div className="admin-header-titles">
                    <h1 className="admin-header-title">Notifications</h1>
                    <p className="admin-header-subtitle">Stay updated with your library activities</p>
                </div>
                {notifications.some(n => !n.is_read) && (
                    <button className="btn-secondary mark-all-read-btn" onClick={handleMarkAllRead}>
                        Mark all as read
                    </button>
                )}
            </header>

            <div className="notifications-container card">
                {notifications.length > 0 ? (
                    <div className="notifications-list-full">
                        {notifications.map((notif) => (
                            <div
                                key={notif._id}
                                className={`notif-full-item ${notif.is_read ? 'read' : 'unread'}`}
                                onClick={() => !notif.is_read && handleMarkRead(notif._id)}
                            >
                                <div className="notif-full-icon">
                                    {notif.type === 'borrow' && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v10.5M4 19.5H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5.5"></path></svg>}
                                    {notif.type === 'return' && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>}
                                    {notif.type === 'wishlist' && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.509 4.048 3 5.5L12 21l7-7Z"></path></svg>}
                                    {notif.type === 'fine' && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 8v8"></path><path d="M8 12h8"></path></svg>}
                                    {notif.type === 'system' && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>}
                                </div>
                                <div className="notif-full-content">
                                    <div className="notif-full-main">
                                        <p className="notif-full-message">{notif.message}</p>
                                        <span className="notif-full-time">
                                            {formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true })}
                                        </span>
                                    </div>
                                    {notif.book_id && (
                                        <div className="notif-book-info">
                                            <p className="notif-book-text">Related Book: <strong>{notif.book_id.title}</strong></p>
                                            <Link to={`/books/${notif.book_id._id || notif.book_id}`} className="view-book-btn">
                                                View Book
                                            </Link>
                                        </div>
                                    )}
                                </div>
                                {!notif.is_read && <div className="unread-pulse"></div>}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-notifications">
                        <div className="empty-icon-circ">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                            </svg>
                        </div>
                        <h2>No notifications yet</h2>
                        <p className="empty-text">We'll notify you when something important happens.</p>
                        <Link to="/books" className="btn-primary explore-books-btn">
                            Explore Books
                        </Link>
                    </div>
                )}
            </div>

            <style>{`
                .notif-full-item {
                    padding: 1.5rem;
                    display: flex;
                    gap: 1.5rem;
                    border-bottom: 1px solid var(--border-color);
                    transition: all 0.3s ease;
                    position: relative;
                    background-color: var(--card-bg);
                }
                .notif-full-item:last-child {
                    border-bottom: none;
                }
                .notif-full-item.unread {
                    background-color: rgba(99, 102, 241, 0.05);
                    border-left: 3px solid var(--primary-color);
                }
                .notif-full-icon {
                    flex-shrink: 0;
                    width: 48px;
                    height: 48px;
                    border-radius: 12px;
                    background: var(--bg-color);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                    border: 1px solid var(--border-color);
                }
                .notif-full-content {
                    flex: 1;
                }
                .notif-full-message {
                    font-size: 1.1rem;
                    font-weight: 500;
                    color: var(--text-primary);
                    margin-bottom: 0.25rem;
                }
                .notif-full-time {
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                }
                .notif-book-info {
                    margin-top: 1rem;
                    padding-top: 1rem;
                    border-top: 1px dashed var(--border-color);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .notif-book-text {
                    color: var(--text-primary);
                }
                .view-book-btn {
                    font-size: 0.85rem;
                    color: var(--primary-color);
                    font-weight: 600;
                    text-decoration: none;
                }
                .unread-pulse {
                    width: 10px;
                    height: 10px;
                    background: var(--primary-color);
                    border-radius: 50%;
                    position: absolute;
                    top: 1.5rem;
                    right: 1.5rem;
                    box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4);
                    animation: pulse 2s infinite;
                }
                .empty-notifications {
                    text-align: center;
                    padding: 4rem 2rem;
                }
                .empty-icon-circ {
                    background: var(--bg-color);
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 1.5rem auto;
                    border: 1px solid var(--border-color);
                }
                .empty-text {
                    color: var(--text-secondary);
                }
                .explore-books-btn {
                    margin-top: 1.5rem;
                    display: inline-block;
                    text-decoration: none;
                }
                @keyframes pulse {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(99, 102, 241, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
                }
                
                [data-theme='dark'] .notif-full-icon {
                    background: rgba(255, 255, 255, 0.05);
                }
                [data-theme='dark'] .notif-full-item.unread {
                    background-color: rgba(99, 102, 241, 0.1);
                }
                [data-theme='dark'] .notif-full-message {
                    color: #f8fafc;
                }
            `}</style>
        </div>
    );
};

export default NotificationsPage;
