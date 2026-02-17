
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import {
    Package, Search, Filter, Calendar,
    Clock, CheckCircle, Truck, XCircle, AlertCircle,
    Download, CheckSquare, Square, ArrowUpDown, X,
    CreditCard
} from 'lucide-react';
import { getAllOrders, bulkUpdateOrderStatus } from '../services/adminOrderService';
import Loader from '../components/Loader';
import { exportOrdersToCSV } from '../utils/csvExport';
import { motion, AnimatePresence } from 'framer-motion';

import '../styles/AdminOrders.css';
import '../styles/Pagination.css';

interface OrderItem {
    book_id: { _id: string; title: string; cover_image_url: string };
    quantity: number;
    priceAtOrder: number;
}

interface Order {
    _id: string;
    user_id: {
        _id: string;
        name: string;
        email: string;
        membership_id?: {
            name: string;
            displayName: string;
        }
    };
    items: OrderItem[];
    totalAmount: number;
    deliveryFee: number;
    status: string;
    createdAt: string;
    paymentMethod: string;
    refundDetails?: {
        accountName: string;
        bankName: string;
        accountNumber: string;
        ifscCode: string;
        submittedAt: string;
    };
}


const CircularCountdown: React.FC<{ date: string; membership?: string; currentTime: Date }> = ({ date, membership, currentTime }) => {
    const createdAt = new Date(date).getTime();
    const windowHours = membership === 'premium' ? 24 : 96;
    const deadline = createdAt + windowHours * 60 * 60 * 1000;
    const total = deadline - createdAt;
    const remaining = deadline - currentTime.getTime();
    const percentage = Math.max(0, Math.min(100, (remaining / total) * 100));

    if (remaining <= 0) {
        return (
            <div className="circular-timer-overdue">
                <AlertCircle size={16} />
                <span>Overdue</span>
            </div>
        );
    }

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    // Determine color based on remaining percentage
    let strokeColor = 'var(--primary-color)'; // Indigo/Blue
    let isUrgent = false;
    if (percentage < 25) {
        strokeColor = '#ef4444'; // Red
        isUrgent = true;
    } else if (percentage < 50) {
        strokeColor = '#f59e0b'; // Amber
    }

    const radius = 18;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className={`premium-circular-timer ${isUrgent ? 'pulse-urgent' : ''}`}>
            <svg width="44" height="44" viewBox="0 0 44 44">
                <circle
                    className="timer-track"
                    cx="22" cy="22" r={radius}
                    strokeWidth="3"
                />
                <circle
                    className="timer-progress"
                    cx="22" cy="22" r={radius}
                    strokeWidth="3"
                    stroke={strokeColor}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    transform="rotate(-90 22 22)"
                />
            </svg>
            <div className="timer-content">
                <span className="timer-hours">{hours}h</span>
                <span className="timer-mins">{minutes}m</span>
            </div>
        </div>
    );
};

const AdminOrders: React.FC = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterMembership, setFilterMembership] = useState('all');
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
    const [isBulkProcessing, setIsBulkProcessing] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalOrders, setTotalOrders] = useState(0);
    const [counts, setCounts] = useState({ total: 0, pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 });
    const itemsPerPage = 10;

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        setCurrentPage(1); // Reset to first page on filter change
    }, [filterStatus, dateRange, sortBy, filterMembership, search]);

    useEffect(() => {
        fetchOrders();
    }, [filterStatus, dateRange, sortBy, filterMembership, currentPage]);

    // Initial fetch for search (debounced)
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (currentPage === 1) {
                fetchOrders();
            } else {
                setCurrentPage(1);
            }
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [search]);

    const fetchOrders = async () => {
        setIsLoading(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        try {
            const response = await getAllOrders({
                status: filterStatus,
                search: search,
                sort: sortBy,
                startDate: dateRange.start,
                endDate: dateRange.end,
                membership: filterMembership,
                page: currentPage,
                limit: itemsPerPage
            });

            // Handle new paginated response structure
            if (response && response.orders) {
                setOrders(response.orders);
                setTotalPages(response.totalPages || 1);
                setTotalOrders(response.totalOrders || 0);
                if (response.counts) setCounts(response.counts);
            } else {
                // Fallback for old/direct array response if needed
                setOrders(Array.isArray(response) ? response : []);
            }
            setSelectedOrders([]); // Clear selection on refresh
        } catch (error: any) {
            toast.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        // Debounce will handle the actual fetch
    };

    const handleBulkStatusChange = async (newStatus: string) => {
        if (selectedOrders.length === 0) return;
        setIsBulkProcessing(true);
        try {
            const response = await bulkUpdateOrderStatus(selectedOrders, newStatus);
            const { modifiedCount, skippedCount } = response;

            if (modifiedCount === 0) {
                toast.warning(`No orders were updated. All ${skippedCount} items were skipped due to invalid status flow.`);
            } else if (skippedCount > 0) {
                toast.success(`Updated ${modifiedCount} orders. ${skippedCount} were skipped.`);
            } else {
                toast.success(`Successfully updated ${modifiedCount} orders to ${newStatus}`);
            }

            fetchOrders();
        } catch (error: any) {
            toast.error(error);
        } finally {
            setIsBulkProcessing(false);
        }
    };


    const toggleOrderSelection = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const order = orders.find(o => o._id === id);
        if (order && isTerminalStatus(order.status)) {
            toast.info(`Orders with status "${order.status}" cannot be updated in bulk.`);
            return;
        }
        setSelectedOrders(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const isTerminalStatus = (status: string) => {
        return ['delivered', 'cancelled', 'returned'].includes(status);
    };

    const toggleAllSelection = () => {
        const selectableOrders = orders.filter(o => !isTerminalStatus(o.status));
        if (selectedOrders.length === selectableOrders.length && selectableOrders.length > 0) {
            setSelectedOrders([]);
        } else {
            setSelectedOrders(selectableOrders.map(o => o._id));
        }
    };

    const handleExport = () => {
        if (orders.length === 0) {
            toast.info('No orders to export');
            return;
        }
        exportOrdersToCSV(orders);
    };

    const handleClearFilters = () => {
        setSearch('');
        setFilterStatus('all');
        setFilterMembership('all');
        setSortBy('newest');
        setDateRange({ start: '', end: '' });
        toast.info('Filters cleared');
    };

    const getStatusStep = (status: string) => {
        switch (status) {
            case 'pending': return 1;
            case 'processing': return 2;
            case 'shipped': return 3;
            case 'delivered': return 4;
            case 'cancelled': return 0;
            default: return 1;
        }
    };

    // Use backend-provided counts for accurate stats
    const stats = {
        total: counts.total,
        pending: counts.pending,
        processing: counts.processing,
        shipped: counts.shipped,
        delivered: counts.delivered,
        cancelled: counts.cancelled,
    };

    return (
        <div className="admin-dashboard-container saas-reveal">
            <div className="admin-header">
                <div>
                    <div className="admin-title-row">
                        <h1 className='admin-header-title'>Order Management</h1>
                        <button className="export-btn" onClick={handleExport}>
                            <Download size={18} />
                            <span>Export CSV</span>
                        </button>
                    </div>
                    <p className='admin-header-subtitle'>Track, manage and export user orders</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon bg-indigo-50 text-indigo-600"><Package /></div>
                    <div><h3>{stats.total}</h3><p>Total Orders</p></div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon bg-yellow-50 text-yellow-600"><Clock /></div>
                    <div><h3>{stats.pending}</h3><p>Pending</p></div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon bg-blue-50 text-blue-600"><AlertCircle /></div>
                    <div><h3>{stats.processing}</h3><p>Processing</p></div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon bg-purple-50 text-purple-600"><Truck /></div>
                    <div><h3>{stats.shipped}</h3><p>Shipped</p></div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon bg-green-50 text-green-600"><CheckCircle /></div>
                    <div><h3>{stats.delivered}</h3><p>Delivered</p></div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon bg-red-50 text-red-600"><XCircle /></div>
                    <div><h3>{stats.cancelled}</h3><p>Cancelled</p></div>
                </div>
            </div>

            {/* Filters */}
            <div className="filters-toolbar">
                <form onSubmit={handleSearch} className="search-box">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search by User, Order ID..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                        <button
                            type="button"
                            className="admin-search-clear-btn"
                            onClick={() => {
                                setSearch('');
                            }}
                            aria-label="Clear search"
                        >
                            <X size={16} />
                        </button>
                    )}
                </form>

                <div className="filter-group">
                    <div className="filter-item">
                        <ArrowUpDown size={16} />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                        >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="total_desc">Highest Amount</option>
                            <option value="total_asc">Lowest Amount</option>
                        </select>
                    </div>

                    <div className="filter-item">
                        <Filter size={16} />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="return_requested">Exchange Pending</option>
                            <option value="return_accepted">Accepted</option>
                            <option value="returned">Exchanged</option>
                            <option value="return_rejected">Exchange Rejected</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>

                    <div className="filter-item">
                        <Filter size={16} />
                        <select
                            value={filterMembership}
                            onChange={(e) => setFilterMembership(e.target.value)}
                        >
                            <option value="all">All Memberships</option>
                            <option value="basic">Basic Users</option>
                            <option value="premium">Premium Users</option>
                        </select>
                    </div>

                    <div className="filter-item date-filter">
                        <Calendar size={16} />
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                        />
                        <span>to</span>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                        />
                    </div>
                </div>
                {(search || filterStatus !== 'all' || filterMembership !== 'all' || sortBy !== 'newest' || dateRange.start || dateRange.end) && (
                    <button
                        onClick={handleClearFilters}
                        className="clear-filters-btn"
                        title="Clear all filters"
                    >
                        <XCircle size={18} />
                        <span>Clear Filters</span>
                    </button>
                )}
            </div>

            <div className="list-controls">
                <button className="select-all-btn" onClick={toggleAllSelection}>
                    {selectedOrders.length === orders.length && orders.length > 0 ? (
                        <CheckSquare size={18} className="text-indigo-600" />
                    ) : (
                        <Square size={18} />
                    )}
                    <span>Select All</span>
                </button>

                <AnimatePresence>
                    {selectedOrders.length > 0 && (
                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -20, opacity: 0 }}
                            className="bulk-action-bar"
                        >
                            <div className="bulk-info">
                                <span className="count">{selectedOrders.length}</span>
                                <span>Selected</span>
                            </div>
                            <div className="bulk-actions">
                                <select
                                    onChange={(e) => handleBulkStatusChange(e.target.value)}
                                    disabled={isBulkProcessing}
                                    defaultValue=""
                                >
                                    <option value="" disabled>Status...</option>
                                    <option value="pending">Pending</option>
                                    <option value="processing">Processing</option>
                                    <option value="shipped">Shipped</option>
                                    <option value="delivered">Delivered</option>
                                    <option value="returned">Exchanged</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                                <button className="bulk-cancel-btn" onClick={() => setSelectedOrders([])}>
                                    Clear
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Orders List */}
            {isLoading ? <Loader /> : (
                <div className="orders-list">
                    {orders.length === 0 ? (
                        <div className="no-orders">
                            <Package size={48} />
                            <h3>No orders found</h3>
                            <p>Try adjusting your search or filters</p>
                        </div>
                    ) : (
                        <>
                            {orders.map(order => {
                                const step = getStatusStep(order.status);
                                const isSelected = selectedOrders.includes(order._id);
                                const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
                                const isPremium = order.user_id?.membership_id?.name === 'premium';

                                // Check for priority (urgent premium orders < 6 hours left)
                                let isUrgent = false;
                                if (isPremium && (order.status === 'pending' || order.status === 'processing')) {
                                    const createdAt = new Date(order.createdAt).getTime();
                                    const deadline = createdAt + 24 * 60 * 60 * 1000;
                                    const remaining = deadline - currentTime.getTime();
                                    isUrgent = remaining > 0 && remaining < 6 * 60 * 60 * 1000;
                                }

                                return (
                                    <div
                                        key={order._id}
                                        className={`admin-order-card cursor-pointer hover:shadow-md transition-shadow ${isSelected ? 'selected' : ''}`}
                                        onClick={() => navigate(`/admin/orders/${order._id}`)}
                                    >
                                        <div
                                            className={`selection-checkbox ${isTerminalStatus(order.status) ? 'disabled' : ''}`}
                                            onClick={(e) => toggleOrderSelection(order._id, e)}
                                            style={isTerminalStatus(order.status) ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                                        >
                                            {isSelected ? <CheckSquare size={20} className="text-indigo-600" /> : <Square size={20} />}
                                        </div>

                                        <div className="order-header">
                                            <div className="order-id-info">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    <h4>#{order._id.slice(-8).toUpperCase()}</h4>
                                                    {order.refundDetails && (
                                                        <div className="refund-ready-indicator" title="Bank Details Submitted">
                                                            <CreditCard size={14} fill="currentColor" fillOpacity={0.2} />
                                                            <span>Refund Ready</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="order-date">
                                                    {new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                            </div>
                                            <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                {isUrgent && (
                                                    <div className="priority-indicator">Priority</div>
                                                )}
                                                {(order.status === 'pending' || order.status === 'processing') && isPremium && (
                                                    <CircularCountdown date={order.createdAt} membership={order.user_id?.membership_id?.name} currentTime={currentTime} />
                                                )}
                                                <div className="status-control" onClick={(e) => e.stopPropagation()}>
                                                    <div className="order-metadata">
                                                        {isPremium && (
                                                            <span className="premium-badge-mini">PREMIUM</span>
                                                        )}
                                                        <div className={`status-badge-premium ${order.status}`}>
                                                            {order.status === 'return_requested' ? 'Exchange Pending' :
                                                                order.status === 'return_accepted' ? 'Accepted' :
                                                                    order.status === 'returned' ? 'Exchanged' :
                                                                        order.status === 'return_rejected' ? 'Exchange Rejected' :
                                                                            order.status}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="order-body">
                                            <div className="user-details" style={{ flex: 1.5 }}>
                                                <p className="label">Customer</p>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                                                    <div style={{
                                                        width: '32px',
                                                        height: '32px',
                                                        borderRadius: '50%',
                                                        background: 'var(--primary-color)',
                                                        color: 'white',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontWeight: '800',
                                                        fontSize: '0.8rem'
                                                    }}>
                                                        {order.user_id?.name?.charAt(0).toUpperCase() || 'U'}
                                                    </div>
                                                    <div>
                                                        <p className="value" style={{ fontSize: '0.95rem' }}>{order.user_id?.name}</p>
                                                        <p className="sub-value" style={{ fontSize: '0.75rem' }}>{order.user_id?.email}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="order-item-details-inline" style={{ flex: 2.5 }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
                                                    {order.items.slice(0, 2).map((item, itemIdx) => {
                                                        const book = item.book_id;
                                                        return (
                                                            <div key={itemIdx} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                                                                <img
                                                                    src={book?.cover_image_url || 'https://via.placeholder.com/150?text=NA'}
                                                                    alt={book?.title || 'Book'}
                                                                    style={{ width: '36px', height: '54px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }}
                                                                />
                                                                <div className="item-text" style={{ flex: 1, minWidth: 0 }}>
                                                                    <p className="value" style={{ fontSize: '0.85rem', fontWeight: '700', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book?.title || 'Deleted Book'}</p>
                                                                    <p className="sub-value" style={{ margin: '0.15rem 0 0', fontSize: '0.75rem' }}>Qty: {item.quantity}</p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    {order.items.length > 2 && (
                                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0.5rem', fontWeight: '600' }}>
                                                            + {order.items.length - 2} more books
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="order-total-mini text-right" style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                                                <p className="label">Summary</p>
                                                <div className="order-value-badge">
                                                    <CreditCard size={14} />
                                                    <span>₹{order.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                                </div>
                                                <div className="item-count-badge">
                                                    <Package size={13} />
                                                    <span>{totalQuantity} {totalQuantity === 1 ? 'Book' : 'Books'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="order-progress-container">
                                            <div className="order-progress-bar">
                                                <div
                                                    className={`progress-fill ${order.status}`}
                                                    style={{ width: `${order.status === 'cancelled' ? 100 : (step / 4) * 100}%` }}
                                                ></div>
                                            </div>
                                            <div className="progress-labels">
                                                <span>Placed</span>
                                                <span>Processing</span>
                                                <span>Shipped</span>
                                                <span>Delivered</span>
                                            </div>
                                        </div>

                                        <div className="order-footer">
                                            <div className="card-actions">
                                                <button className="quick-view-btn">Manage Order</button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="admin-pagination">
                                    <button
                                        className="pagination-btn"
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        Previous
                                    </button>
                                    <div className="pagination-info">
                                        <div className="pagination-info-pages">
                                            Page <span>{currentPage}</span> of <span>{totalPages}</span>
                                        </div>
                                        <div className="total-count-mini">Total {totalOrders} orders</div>
                                    </div>
                                    <button
                                        className="pagination-btn"
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminOrders;
