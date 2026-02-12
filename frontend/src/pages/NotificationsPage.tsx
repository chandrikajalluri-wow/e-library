import React, { useState, useEffect } from 'react';
import { getMyNotifications, markNotificationRead, markAllNotificationsRead } from '../services/notificationService';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { Filter, Calendar, X, ChevronDown } from 'lucide-react';
import '../styles/NotificationCenter.css'; // Reusing styles

const NotificationsPage: React.FC = () => {
    const [notifications, setNotifications] = useState<any[]>([]);

    // Filter States
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const fetchNotifications = async () => {
        try {
            const params: any = {};
            if (filterType !== 'all') params.type = filterType;
            if (filterStatus !== 'all') params.is_read = filterStatus === 'read' ? 'true' : 'false';
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;

            const data = await getMyNotifications(params);
            setNotifications(data);
        } catch (err) {
            console.error("Failed to fetch notifications", err);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, [filterType, filterStatus, startDate, endDate]);

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

    const role = localStorage.getItem('role');
    const isAdmin = role === 'admin' || role === 'super_admin';

    // if (loading) return <Loader />; // Better to show loader inside list or overlay to keep filters visible

    return (
        <div className="notifications-page dashboard-container saas-reveal">
            <header className="admin-header">
                <div className="admin-header-titles">
                    <h1 className="admin-header-title">{isAdmin ? 'Admin Activity Control' : 'Notifications'}</h1>
                    <p className="admin-header-subtitle">
                        {isAdmin ? 'Monitor and manage user activities and requests' : 'Stay updated with your library activities'}
                    </p>
                </div>
                <div className="header-actions">
                    {notifications.some(n => !n.is_read) && (
                        <button className="btn-secondary mark-all-read-btn" onClick={handleMarkAllRead}>
                            Mark all as read
                        </button>
                    )}
                </div>
            </header>

            {/* Filter Bar */}
            <div className="filters-bar">
                <div className="filter-pill">
                    <Filter size={16} className="filter-icon" />
                    <div className="select-wrapper">
                        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                            <option value="all">All Types</option>
                            <option value="order">Orders</option>
                            <option value="return">Exchanges</option>
                            <option value="book_request">Requests</option>
                            <option value="stock_alert">Stock Updates</option>
                        </select>
                        <ChevronDown size={14} className="chevron-icon" />
                    </div>
                </div>

                <div className="filter-pill">
                    <Filter size={16} className="filter-icon" />
                    <div className="select-wrapper">
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                            <option value="all">All Status</option>
                            <option value="unread">Unread</option>
                            <option value="read">Read</option>
                        </select>
                        <ChevronDown size={14} className="chevron-icon" />
                    </div>
                </div>

                <div className="filter-pill date-range-pill">
                    <Calendar size={16} className="filter-icon" />
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        placeholder="dd-mm-yyyy"
                    />
                    <span className="date-separator">TO</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        placeholder="dd-mm-yyyy"
                    />
                </div>

                {(filterType !== 'all' || filterStatus !== 'all' || startDate || endDate) && (
                    <button
                        className="clear-filters-btn"
                        onClick={() => {
                            setFilterType('all');
                            setFilterStatus('all');
                            setStartDate('');
                            setEndDate('');
                        }}
                        title="Clear Filters"
                    >
                        <X size={16} />
                        Clear
                    </button>
                )}
            </div>

            <div className="notifications-container card">
                {notifications.length > 0 ? (
                    <div className="notifications-list-full">
                        {notifications.map((notif) => {
                            const isActionRequired = isAdmin && (notif.type === 'return' || notif.type === 'book_request' || notif.type === 'order' || notif.type === 'stock_alert');

                            return (
                                <div
                                    key={notif._id}
                                    className={`notif-full-item ${notif.is_read ? 'read' : 'unread'} ${isActionRequired ? 'action-required-full' : ''}`}
                                    onClick={() => !notif.is_read && handleMarkRead(notif._id)}
                                >
                                    <div className="notif-full-icon">
                                        {notif.type === 'borrow' && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v10.5M4 19.5H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5.5"></path></svg>}
                                        {notif.type === 'return' && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>}
                                        {notif.type === 'wishlist' && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.509 4.048 3 5.5L12 21l7-7Z"></path></svg>}
                                        {notif.type === 'fine' && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 8v8"></path><path d="M8 12h8"></path></svg>}
                                        {notif.type === 'order' && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>}
                                        {notif.type === 'book_request' && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>}
                                        {notif.type === 'system' && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>}
                                    </div>
                                    <div className="notif-full-content">
                                        <div className="notif-full-main">
                                            {isActionRequired && (
                                                <span className="action-tag" style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                                                    ACTION REQUIRED
                                                </span>
                                            )}
                                            <p className="notif-full-message">{notif.message}</p>
                                            <span className="notif-full-time">
                                                {formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true })}
                                            </span>
                                        </div>

                                        <div className="notif-actions">
                                            {isAdmin && notif.type === 'order' && notif.target_id && (
                                                <Link to={`/admin/orders/${notif.target_id}`} className="view-action-btn order-btn">
                                                    View Order
                                                </Link>
                                            )}
                                            {isAdmin && notif.type === 'return' && (
                                                <Link to="/admin-dashboard?tab=requests" className="view-action-btn exchange-btn">
                                                    View Exchanges
                                                </Link>
                                            )}
                                            {isAdmin && notif.type === 'book_request' && (
                                                <Link to="/admin-dashboard?tab=user-requests" className="view-action-btn request-btn">
                                                    View Requests
                                                </Link>
                                            )}
                                            {isAdmin && (notif.type === 'stock_alert' || notif.type === 'wishlist') && notif.target_id && (
                                                <Link to={`/admin-dashboard?tab=books&editBookId=${notif.target_id}`} className="view-action-btn order-btn">
                                                    Manage Stock
                                                </Link>
                                            )}
                                            {!isAdmin && notif.book_id && (
                                                <Link to={`/books/${notif.book_id._id || notif.book_id}`} className="view-book-btn">
                                                    View Book
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                    {!notif.is_read && <div className="unread-pulse"></div>}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="empty-notifications">
                        <div className="empty-icon-circ">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                            </svg>
                        </div>
                        <h2>{isAdmin ? 'All caught up!' : 'No notifications yet'}</h2>
                        <p className="empty-text">
                            {isAdmin
                                ? 'There are no recent user activities or pending requests.'
                                : "We'll notify you when something important happens."}
                        </p>
                        {!isAdmin && (
                            <Link to="/books" className="btn-primary explore-books-btn">
                                Explore Books
                            </Link>
                        )}
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
                .notif-actions {
                    margin-top: 1.25rem;
                    display: flex;
                    gap: 1rem;
                    align-items: center;
                    flex-wrap: wrap;
                }
                .view-action-btn {
                    padding: 0.6rem 1.25rem;
                    border-radius: 100px;
                    font-size: 0.85rem;
                    font-weight: 600;
                    text-decoration: none;
                    transition: all 0.2s ease;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                }
                .order-btn {
                    background: rgba(245, 158, 11, 0.1);
                    color: #f59e0b;
                    border: 1px solid rgba(245, 158, 11, 0.2);
                }
                .order-btn:hover {
                    background: #f59e0b;
                    color: white;
                }
                .exchange-btn {
                    background: rgba(16, 185, 129, 0.1);
                    color: #10b981;
                    border: 1px solid rgba(16, 185, 129, 0.2);
                }
                .exchange-btn:hover {
                    background: #10b981;
                    color: white;
                }
                .request-btn {
                    background: rgba(139, 92, 246, 0.1);
                    color: #8b5cf6;
                    border: 1px solid rgba(139, 92, 246, 0.2);
                }
                .request-btn:hover {
                    background: #8b5cf6;
                    color: white;
                }
                .view-book-btn {
                    padding: 0.6rem 1.25rem;
                    border-radius: 100px;
                    font-size: 0.85rem;
                    color: var(--primary-color);
                    font-weight: 600;
                    text-decoration: none;
                    border: 1px solid var(--primary-color);
                    transition: all 0.2s ease;
                }
                .view-book-btn:hover {
                    background: var(--primary-color);
                    color: white;
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
