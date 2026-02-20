import React, { useState, useEffect } from 'react';
import { getMyNotifications, markNotificationRead, markAllNotificationsRead, getNotifications } from '../services/notificationService';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate, Link } from 'react-router-dom';
import { Filter, Calendar, X, ChevronDown } from 'lucide-react';
import { RoleName } from '../types/enums';
import '../styles/NotificationCenter.css'; // Reusing styles
import '../styles/NotificationsPage.css';

const NotificationsPage: React.FC = () => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<any[]>([]);

    const role = localStorage.getItem('role');
    const isAdmin = role === 'admin' || role === 'super_admin';

    // Filter States
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [sortOrder, setSortOrder] = useState('newest');

    const fetchNotifications = async () => {
        try {
            const params: any = {};
            if (filterType === 'exchange' || (isAdmin && filterType === 'return')) {
                params.type = isAdmin ? 'return' : 'return';
            } else if (filterType === 'order') {
                params.type = 'order';
            } else if (filterType === 'new_addition') {
                params.type = 'system';
            } else if (filterType === 'book_created') {
                params.type = 'book_created,system';
            } else if (filterType === 'book_updated') {
                params.type = 'book_updated,system';
            } else if (filterType === 'category_created') {
                params.type = 'category_created,system';
            } else if (filterType === 'category_updated') {
                params.type = 'category_updated,system';
            } else if (filterType === 'review_report') {
                params.type = 'review_report,system';
            } else if (filterType === 'contact_query') {
                params.type = 'contact_query,system';
            } else if (filterType !== 'all' && filterType !== 'others') {
                params.type = filterType;
            }

            if (filterStatus !== 'all') params.is_read = filterStatus === 'read' ? 'true' : 'false';
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;
            params.sort = sortOrder;

            let data;
            if (isAdmin) {
                data = await getNotifications(params);
            } else {
                data = await getMyNotifications(params);
            }

            // Client-side virtual filtering/refining
            if (!isAdmin) {
                if (filterType === 'new_addition') {
                    data = data.filter((n: any) => n.type === 'system' && n.message.includes('New Addition'));
                } else if (filterType === 'exchange') {
                    const exchangeTypes = ['return'];
                    // EXCLUDE cancelled orders even if they are borrow/return type
                    data = data.filter((n: any) =>
                        exchangeTypes.includes(n.type?.toLowerCase()) &&
                        !n.message.toLowerCase().includes('cancelled')
                    );
                } else if (filterType === 'order') {
                    // Exclude cancelled from standard order view
                    data = data.filter((n: any) =>
                        n.type === 'order' &&
                        !n.message.toLowerCase().includes('cancelled')
                    );
                } else if (filterType === 'cancelled') {
                    data = data.filter((n: any) =>
                        n.message.toLowerCase().includes('cancelled')
                    );
                } else if (filterType === 'others') {
                    const knownTypes = ['order', 'return', 'wishlist'];
                    data = data.filter((n: any) =>
                        !knownTypes.includes(n.type?.toLowerCase()) &&
                        !n.message.includes('New Addition') &&
                        !n.message.toLowerCase().includes('cancelled')
                    );
                }
            } else {
                // Admin side refining
                if (role === RoleName.SUPER_ADMIN) {
                    // Super Admin refinements
                    if (filterType === 'all') {
                        // For Super Admin, 'all' means everything, so we keep the data as is
                    } else if (filterType === 'book_created') {
                        data = data.filter((n: any) =>
                            n.type === 'book_created' || (n.type === 'system' && n.message.toLowerCase().includes('added a new book'))
                        );
                    } else if (filterType === 'book_updated') {
                        data = data.filter((n: any) =>
                            n.type === 'book_updated' || (n.type === 'system' && n.message.toLowerCase().includes('updated book'))
                        );
                    } else if (filterType === 'category_created') {
                        data = data.filter((n: any) =>
                            n.type === 'category_created' || (n.type === 'system' && n.message.toLowerCase().includes('created a new category'))
                        );
                    } else if (filterType === 'category_updated') {
                        data = data.filter((n: any) =>
                            n.type === 'category_updated' || (n.type === 'system' && n.message.toLowerCase().includes('updated category'))
                        );
                    } else if (filterType === 'review_report') {
                        data = data.filter((n: any) => n.type === 'review_report' || (n.type === 'system' && n.message.toLowerCase().includes('review reported')));
                    } else if (filterType === 'contact_query') {
                        data = data.filter((n: any) => n.type === 'contact_query' || (n.type === 'system' && n.message.toLowerCase().includes('new query received')));
                    }
                } else {
                    // Admin refinements
                    if (filterType === 'order') {
                        data = data.filter((n: any) =>
                            n.type === 'order' &&
                            !n.message.toLowerCase().includes('cancelled')
                        );
                    } else if (filterType === 'cancelled') {
                        data = data.filter((n: any) =>
                            n.message.toLowerCase().includes('cancelled')
                        );
                    }
                }
            }

            setNotifications(data);
        } catch (err) {
            console.error("Failed to fetch notifications", err);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, [filterType, filterStatus, startDate, endDate, sortOrder]);

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

    const handleNotificationClick = (notif: any) => {
        if (!notif.is_read) {
            handleMarkRead(notif._id);
        }

        const type = notif.type?.toLowerCase();

        if (isAdmin) {
            if (type === 'order' && notif.target_id) {
                navigate(`/admin/orders/${notif.target_id}`);
            } else if (type === 'return' || (type === 'readlist' && notif.target_id)) {
                // Exchange requests or decisions take admin to requests tab
                navigate('/admin-dashboard?tab=requests');
            } else if (type === 'book_request') {
                navigate('/admin-dashboard?tab=user-requests');
            } else if ((type === 'stock_alert' || type === 'wishlist') && notif.target_id) {
                navigate(`/admin-dashboard?tab=books&editBookId=${notif.target_id}`);
            } else if (type === 'book_created' || type === 'book_updated') {
                const targetPath = role === RoleName.SUPER_ADMIN ? '/super-admin-dashboard' : '/admin-dashboard';
                navigate(`${targetPath}?tab=books&editBookId=${notif.target_id}`);
            } else if (type === 'category_created' || type === 'category_updated') {
                const targetPath = role === RoleName.SUPER_ADMIN ? '/super-admin-dashboard' : '/admin-dashboard';
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
            // Redirection logic for users
            if (type === 'order' || type === 'return' || type === 'readlist') {
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
    };



    return (
        <div className="notifications-page dashboard-container saas-reveal">
            <header className="admin-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                    <div className="admin-header-titles" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
                        <h1 className="admin-header-title">{isAdmin ? 'Admin Activity Control' : 'Notifications'}</h1>
                        <p className="admin-header-subtitle">
                            {isAdmin ? 'Monitor Admin Activities' : 'Stay updated with your library activities'}
                        </p>
                    </div>
                    <div className="header-actions" style={{ marginTop: '1rem' }}>
                        {notifications.some(n => !n.is_read) && (
                            <button className="btn-secondary mark-all-read-btn" onClick={handleMarkAllRead} style={{ whiteSpace: 'nowrap' }}>
                                Mark all as read
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Filter Bar */}
            <div className="filters-bar">
                {!isAdmin ? (
                    <div className="filter-pill">
                        <Filter size={16} className="filter-icon" />
                        <div className="select-wrapper">
                            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                                <option value="all">All Types</option>
                                <option value="order">Orders</option>
                                <option value="exchange">Exchange</option>
                                <option value="cancelled">Cancelled</option>
                                <option value="new_addition">New Addition</option>
                                <option value="wishlist">Wishlist</option>
                                <option value="others">Others</option>
                            </select>
                            <ChevronDown size={14} className="chevron-icon" />
                        </div>
                    </div>
                ) : (
                    <div className="filter-pill">
                        <Filter size={16} className="filter-icon" />
                        <div className="select-wrapper">
                            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                                <option value="all">All Types</option>
                                {role === RoleName.SUPER_ADMIN ? (
                                    <>
                                        <option value="book_created">Book Created</option>
                                        <option value="book_updated">Book Updated</option>
                                        <option value="category_created">Category Created</option>
                                        <option value="category_updated">Category Updated</option>
                                        <option value="review_report">Review Report</option>
                                        <option value="contact_query">Contact Query</option>
                                    </>
                                ) : (
                                    <>
                                        <option value="order">Orders</option>
                                        <option value="return">Exchanges</option>
                                        <option value="cancelled">Cancelled</option>
                                        <option value="book_request">Requests</option>
                                        <option value="stock_alert">Stock Updates</option>
                                    </>
                                )}
                            </select>
                            <ChevronDown size={14} className="chevron-icon" />
                        </div>
                    </div>
                )}

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

                <div className="filter-pill">
                    <Calendar size={16} className="filter-icon" />
                    <div className="select-wrapper">
                        <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
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

                {(filterType !== 'all' || filterStatus !== 'all' || startDate || endDate || sortOrder !== 'newest') && (
                    <button
                        className="clear-filters-btn"
                        onClick={() => {
                            setFilterType('all');
                            setFilterStatus('all');
                            setStartDate('');
                            setEndDate('');
                            setSortOrder('newest');
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
                            const type = notif.type?.toLowerCase();
                            const message = notif.message?.toLowerCase();
                            const isCancelled = message.includes('cancelled') || message.includes('canceled');
                            const isActionRequired = isAdmin && !isCancelled && (type === 'return' || type === 'book_request' || type === 'order' || type === 'stock_alert');

                            return (
                                <div
                                    key={notif._id}
                                    className={`notif-full-item ${notif.is_read ? 'read' : 'unread'} ${isActionRequired ? 'action-required' : ''} ${isCancelled ? 'canceled-item' : ''}`}
                                    onClick={() => handleNotificationClick(notif)}
                                >
                                    <div className="notif-full-icon">
                                        {type === 'order' && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isCancelled ? "#ef4444" : "#f59e0b"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>}
                                        {type === 'return' && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isCancelled ? "#ef4444" : "#10b981"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3L21 8L16 13"></path><path d="M21 8H12a4 4 0 0 0-4 4v9"></path><path d="M3 13V5a2 2 0 0 1 2-2"></path></svg>}
                                        {type === 'readlist' && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>}
                                        {type === 'wishlist' && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.509 4.048 3 5.5L12 21l7-7Z"></path></svg>}
                                        {type === 'fine' && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 8v8"></path><path d="M8 12h8"></path></svg>}
                                        {type === 'book_request' && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>}
                                        {(type === 'system' || type === 'book_created' || type === 'book_updated' || type === 'category_created' || type === 'category_updated') && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>}
                                        {type === 'review_report' && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>}
                                        {type === 'contact_query' && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>}
                                    </div>
                                    <div className="notif-full-content">
                                        <div className="notif-full-main">
                                            {isActionRequired && (
                                                <span className="action-tag action-tag-styled">
                                                    ACTION REQUIRED
                                                </span>
                                            )}
                                            <p className="notif-full-message">{notif.message}</p>
                                            <span className="notif-full-time">
                                                {formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true })}
                                            </span>
                                        </div>

                                        <div className="notif-actions">
                                            {/* Admin Actions */}
                                            {isAdmin && type === 'order' && notif.target_id && (
                                                <Link to={`/admin/orders/${notif.target_id}`} className={`view-action-btn ${isCancelled ? 'cancel-btn' : 'order-btn'}`}>
                                                    {isCancelled ? 'View Cancelled Order' : 'View Order'}
                                                </Link>
                                            )}
                                            {isAdmin && type === 'return' && (
                                                <Link to="/admin-dashboard?tab=requests" className={`view-action-btn ${isCancelled ? 'cancel-btn' : 'exchange-btn'}`}>
                                                    {isCancelled ? 'View Cancelled Request' : 'View Exchanges'}
                                                </Link>
                                            )}
                                            {isAdmin && type === 'book_request' && (
                                                <Link to="/admin-dashboard?tab=user-requests" className="view-action-btn request-btn">
                                                    View Requests
                                                </Link>
                                            )}
                                            {isAdmin && (type === 'stock_alert' || type === 'wishlist') && notif.target_id && (
                                                <Link to={`${role === RoleName.SUPER_ADMIN ? '/super-admin-dashboard' : '/admin-dashboard'}?tab=books&editBookId=${notif.target_id}`} className="view-action-btn order-btn">
                                                    Manage Stock
                                                </Link>
                                            )}
                                            {isAdmin && (type === 'book_created' || type === 'book_updated') && notif.target_id && (
                                                <Link to={`${role === RoleName.SUPER_ADMIN ? '/super-admin-dashboard' : '/admin-dashboard'}?tab=books&editBookId=${notif.target_id}`} className="view-action-btn order-btn">
                                                    Manage Book
                                                </Link>
                                            )}
                                            {isAdmin && (type === 'category_created' || type === 'category_updated') && (
                                                <Link to={`${role === RoleName.SUPER_ADMIN ? '/super-admin-dashboard' : '/admin-dashboard'}?tab=categories`} className="view-action-btn order-btn" style={{ borderColor: '#6366f1', color: '#6366f1' }}>
                                                    Manage Categories
                                                </Link>
                                            )}
                                            {isAdmin && type === 'review_report' && (
                                                <Link to="/super-admin-dashboard?tab=reported-reviews" className="view-action-btn order-btn" style={{ borderColor: '#ef4444', color: '#ef4444' }}>
                                                    Moderate Review
                                                </Link>
                                            )}
                                            {isAdmin && type === 'contact_query' && (
                                                <Link to="/super-admin-dashboard?tab=queries" className="view-action-btn order-btn" style={{ borderColor: '#3b82f6', color: '#3b82f6' }}>
                                                    View Query
                                                </Link>
                                            )}

                                            {!isAdmin && (type === 'order' || type === 'return' || type === 'readlist') && (() => {
                                                const msg = notif.message.toLowerCase();
                                                const isCancelled = msg.includes('cancelled') || msg.includes('canceled');
                                                return (
                                                    <Link
                                                        to={notif.target_id ? `/orders/${notif.target_id}` : '/my-orders'}
                                                        className={`view-action-btn ${isCancelled ? 'cancel-btn' : (type === 'order' ? 'order-btn' : 'exchange-btn')}`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (!notif.is_read) handleMarkRead(notif._id);
                                                        }}
                                                    >
                                                        {isCancelled ? 'View Cancelled Order' : (type === 'order' ? 'View Order' : 'View Exchange')}
                                                    </Link>
                                                )
                                            })()}
                                            {!isAdmin && notif.book_id && (
                                                <Link
                                                    to={`/books/${notif.book_id._id || notif.book_id}`}
                                                    className="view-book-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (!notif.is_read) handleMarkRead(notif._id);
                                                    }}
                                                >
                                                    View {notif.type === 'system' ? 'Details' : 'Book'}
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


        </div>
    );
};

export default NotificationsPage;
