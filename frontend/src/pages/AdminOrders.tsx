
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import {
    Package, Search, Filter, Calendar,
    Clock, CheckCircle, Truck, XCircle, AlertCircle
} from 'lucide-react';
import { getAllOrders, updateOrderStatus } from '../services/adminOrderService';
import Loader from '../components/Loader';
import '../styles/AdminOrders.css';

interface OrderItem {
    book_id: { title: string; cover_image_url: string };
    quantity: number;
    priceAtOrder: number;
}

interface Order {
    _id: string;
    user_id: { name: string; email: string };
    items: OrderItem[];
    totalAmount: number;
    status: string;
    createdAt: string;
    paymentMethod: string;
}

const AdminOrders: React.FC = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [search, setSearch] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    useEffect(() => {
        fetchOrders();
    }, [filterStatus, dateRange]);

    const fetchOrders = async () => {
        setIsLoading(true);
        try {
            const data = await getAllOrders({
                status: filterStatus,
                search: search,
                startDate: dateRange.start,
                endDate: dateRange.end
            });
            setOrders(data);
        } catch (error: any) {
            toast.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchOrders();
    };

    const handleStatusChange = async (orderId: string, newStatus: string) => {
        // Optimistic Update
        const originalOrders = [...orders];
        setOrders(orders.map(o => o._id === orderId ? { ...o, status: newStatus } : o));

        try {
            await updateOrderStatus(orderId, newStatus);
            toast.success(`Order status updated to ${newStatus}`);
        } catch (error: any) {
            // Revert on failure
            setOrders(originalOrders);
            toast.error('Failed to update status');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'processing': return 'bg-yellow-100 text-yellow-800';
            case 'shipped': return 'bg-blue-100 text-blue-800';
            case 'delivered': return 'bg-green-100 text-green-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
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
                    <h1>Order Management</h1>
                    <p>Track and manage user orders</p>
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
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search by Order ID or User..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </form>

                <div className="filter-group">
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
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>

                    <div className="filter-item date-filter">
                        <Calendar size={16} />
                        <input
                            type="date"
                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                        />
                        <span>to</span>
                        <input
                            type="date"
                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                        />
                    </div>
                </div>
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
                        orders.map(order => (
                            <div
                                key={order._id}
                                className="admin-order-card cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => navigate(`/admin/orders/${order._id}`)}
                            >
                                <div className="order-header">
                                    <div className="order-id-info">
                                        <h4>#{order._id.slice(-6).toUpperCase()}</h4>
                                        <span className="order-date">
                                            {new Date(order.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="status-control" onClick={(e) => e.stopPropagation()}>
                                        <select
                                            value={order.status}
                                            onChange={(e) => handleStatusChange(order._id, e.target.value)}
                                            className={`status-select ${getStatusColor(order.status)}`}
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="processing">Processing</option>
                                            <option value="shipped">Shipped</option>
                                            <option value="delivered">Delivered</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="order-body">
                                    <div className="user-details">
                                        <p className="label">Customer</p>
                                        <p className="value">{order.user_id.name}</p>
                                        <p className="sub-value">{order.user_id.email}</p>
                                    </div>
                                    <div className="order-summary-mini">
                                        <p className="label">Items</p>
                                        <p className="value">{order.items.length} items</p>
                                    </div>
                                    <div className="order-total-mini">
                                        <p className="label">Total Amount</p>
                                        <p className="value highlight">₹{order.totalAmount}</p>
                                    </div>
                                </div>

                                <div className="order-items-preview">
                                    {order.items.map((item, idx) => (
                                        <div key={idx} className="preview-item" title={item.book_id.title}>
                                            <img src={item.book_id.cover_image_url} alt="Cover" />
                                            <span className="qty-badge">x{item.quantity}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminOrders;
