
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import {
    Package, Search, Filter, Calendar,
    Clock, CheckCircle, Truck, XCircle, AlertCircle,
    Download, CheckSquare, Square, ArrowUpDown, X
} from 'lucide-react';
import { getAllOrders, bulkUpdateOrderStatus } from '../services/adminOrderService';
import Loader from '../components/Loader';
import { exportOrdersToCSV } from '../utils/csvExport';
import { motion, AnimatePresence } from 'framer-motion';

import '../styles/AdminOrders.css';

interface OrderItem {
    book_id: { title: string; cover_image_url: string };
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
}

const Countdown: React.FC<{ date: string; membership?: string; currentTime: Date }> = ({ date, membership, currentTime }) => {
    const createdAt = new Date(date).getTime();
    const windowHours = membership === 'premium' ? 24 : 96;
    const deadline = createdAt + windowHours * 60 * 60 * 1000;
    const remaining = deadline - currentTime.getTime();

    if (remaining <= 0) return <span className="text-red-500 font-bold">Overdue</span>;

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    return <span>{hours}h {minutes}m remaining</span>;
};

const CountdownProgress: React.FC<{ date: string; membership?: string; currentTime: Date }> = ({ date, membership, currentTime }) => {
    const createdAt = new Date(date).getTime();
    const windowHours = membership === 'premium' ? 24 : 96;
    const deadline = createdAt + windowHours * 60 * 60 * 1000;
    const total = deadline - createdAt;
    const elapsed = currentTime.getTime() - createdAt;
    const percentage = Math.max(0, Math.min(100, (elapsed / total) * 100));

    const isUrgent = percentage > 80;
    const isPremium = membership === 'premium';

    return (
        <div className={`progress-track ${isPremium ? 'premium-track' : ''}`}>
            <div
                className={`progress-fill ${isUrgent ? 'urgent' : ''}`}
                style={{ width: `${percentage}%` }}
            ></div>
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

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        fetchOrders();
    }, [filterStatus, dateRange, sortBy, filterMembership]);

    // Debounced search effect
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchOrders();
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [search]);

    const fetchOrders = async () => {
        setIsLoading(true);
        try {
            const data = await getAllOrders({
                status: filterStatus,
                search: search,
                sort: sortBy,
                startDate: dateRange.start,
                endDate: dateRange.end,
                membership: filterMembership
            });
            setOrders(data);
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
            await bulkUpdateOrderStatus(selectedOrders, newStatus);
            toast.success(`Updated ${selectedOrders.length} orders to ${newStatus}`);
            fetchOrders();
        } catch (error: any) {
            toast.error(error);
        } finally {
            setIsBulkProcessing(false);
        }
    };


    const toggleOrderSelection = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedOrders(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const toggleAllSelection = () => {
        if (selectedOrders.length === orders.length) {
            setSelectedOrders([]);
        } else {
            setSelectedOrders(orders.map(o => o._id));
        }
    };

    const handleExport = () => {
        if (orders.length === 0) {
            toast.info('No orders to export');
            return;
        }
        exportOrdersToCSV(orders);
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

    // Calculate Stats
    const stats = {
        total: orders.length,
        pending: orders.filter(o => o.status === 'pending').length,
        processing: orders.filter(o => o.status === 'processing').length,
        shipped: orders.filter(o => o.status === 'shipped').length,
        delivered: orders.filter(o => o.status === 'delivered').length,
        cancelled: orders.filter(o => o.status === 'cancelled').length,
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
                        placeholder="Search by User..."
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
                        orders.map(order => {
                            const step = getStatusStep(order.status);
                            const isSelected = selectedOrders.includes(order._id);

                            return (
                                <div
                                    key={order._id}
                                    className={`admin-order-card cursor-pointer hover:shadow-md transition-shadow ${isSelected ? 'selected' : ''}`}
                                    onClick={() => navigate(`/admin/orders/${order._id}`)}
                                >
                                    <div className="selection-checkbox" onClick={(e) => toggleOrderSelection(order._id, e)}>
                                        {isSelected ? <CheckSquare size={20} className="text-indigo-600" /> : <Square size={20} />}
                                    </div>

                                    <div className="order-header">
                                        <div className="order-id-info">
                                            <h4>#{order._id.slice(-6).toUpperCase()}</h4>
                                            <span className="order-date">
                                                {new Date(order.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="status-control" onClick={(e) => e.stopPropagation()}>
                                            <div className="order-metadata">
                                                {order.user_id?.membership_id?.name === 'premium' && (
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

                                    {(order.status === 'pending' || order.status === 'processing') && order.user_id?.membership_id?.name === 'premium' ? (
                                        <div className="delivery-countdown">
                                            <div className="countdown-timer">
                                                <Clock size={14} />
                                                <Countdown date={order.createdAt} membership={order.user_id?.membership_id?.name} currentTime={currentTime} />
                                            </div>
                                            <div className="countdown-bar">
                                                <CountdownProgress date={order.createdAt} membership={order.user_id?.membership_id?.name} currentTime={currentTime} />
                                            </div>
                                        </div>
                                    ) : null}

                                    <div className="order-body">
                                        <div className="user-details">
                                            <p className="label">Customer</p>
                                            <p className="value">{order.user_id?.name}</p>
                                            <p className="sub-value">{order.user_id?.email}</p>
                                        </div>
                                        <div className="order-summary-mini">
                                            <p className="label">Items</p>
                                            <p className="value">{order.items.length} items</p>
                                        </div>
                                        <div className="order-total-mini text-right">
                                            <p className="label">Total Amount</p>
                                            <p className="value highlight">₹{order.totalAmount}</p>
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
                                        <div className="order-items-preview">
                                            {order.items.map((item, idx) => {
                                                const book = item.book_id;
                                                const title = book?.title || 'Deleted Book';
                                                const cover = book?.cover_image_url || 'https://via.placeholder.com/150?text=NA';

                                                return (
                                                    <div key={idx} className="preview-item" title={title}>
                                                        <img src={cover} alt={title} />
                                                        <span className="qty-badge">x{item.quantity}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className="card-actions">
                                            <button className="quick-view-btn">View Details</button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminOrders;
