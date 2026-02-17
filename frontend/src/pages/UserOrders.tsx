import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Package, Calendar, Clock, ChevronRight, XCircle, ShoppingBag, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMyOrders } from '../services/userOrderService';
import { cancelOrder } from '../services/orderService';
import Loader from '../components/Loader';
import ConfirmationModal from '../components/ConfirmationModal';
import '../styles/UserOrders.css';

interface OrderItem {
    book_id: { _id: string; title: string; cover_image_url: string; price: number; author: string } | null;
    quantity: number;
    priceAtOrder: number;
}

interface Order {
    _id: string;
    items: OrderItem[];
    totalAmount: number;
    deliveryFee: number;
    status: string;
    createdAt: string;
    paymentMethod: string;
}

const UserOrders: React.FC = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [orderToCancel, setOrderToCancel] = useState<string | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);

    useEffect(() => {
        fetchUserOrders();
    }, []);

    const fetchUserOrders = async () => {
        setIsLoading(true);
        try {
            const data = await getMyOrders();
            setOrders(data);
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to fetch orders');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancelOrder = async () => {
        if (!orderToCancel) return;
        setIsCancelling(true);
        try {
            await cancelOrder(orderToCancel);
            toast.success('Order cancelled successfully');
            fetchUserOrders();
            setIsCancelModalOpen(false);
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to cancel order');
        } finally {
            setIsCancelling(false);
            setOrderToCancel(null);
        }
    };

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'pending': return { class: 'status-pending', label: 'Order Pending' };
            case 'processing': return { class: 'status-processing', label: 'Processing' };
            case 'shipped': return { class: 'status-shipped', label: 'Shipped' };
            case 'delivered': return { class: 'status-delivered', label: 'Delivered' };
            case 'cancelled': return { class: 'status-cancelled', label: 'Cancelled' };
            case 'return_requested': return { class: 'status-pending', label: 'Exchange Pending' };
            case 'return_accepted': return { class: 'status-processing', label: 'Accepted' };
            case 'returned': return { class: 'status-shipped', label: 'Exchanged' };
            case 'return_rejected': return { class: 'status-cancelled', label: 'Exchange Rejected' };
            default: return { class: 'status-pending', label: status.replace(/_/g, ' ').toUpperCase() };
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const cardVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 },
        hover: { y: -5, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }
    };

    if (isLoading) return <Loader />;

    return (
        <motion.div
            className="orders-view-container dashboard-container"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            <div className="orders-page-header">
                <div className="header-top-nav">
                    <button onClick={() => navigate('/dashboard')} className="minimal-back-btn">
                        <ArrowLeft size={18} />
                        <span>Dashboard</span>
                    </button>
                </div>

                <header className="admin-header">
                    <div className="admin-header-titles">
                        <h1 className="admin-header-title">Purchase History</h1>
                        <p className="admin-header-subtitle">Keep track of all your reading adventures</p>
                    </div>
                    <div className="orders-summary-badges">
                        <div className="summary-badge total-badge">
                            <div className="badge-icon-box">
                                <Package size={18} />
                            </div>
                            <div className="badge-detail-box">
                                <span className="badge-count-val">{orders.length}</span>
                                <span className="badge-label-txt">Orders</span>
                            </div>
                        </div>
                        <div className="summary-badge active-badge">
                            <div className="badge-icon-box">
                                <ShoppingBag size={18} />
                            </div>
                            <div className="badge-detail-box">
                                <span className="badge-count-val">
                                    {orders.filter(o => o.status !== 'cancelled' && o.status !== 'delivered').length}
                                </span>
                                <span className="badge-label-txt">Active</span>
                            </div>
                        </div>
                    </div>
                </header>
            </div>

            <AnimatePresence mode="wait">
                {orders.length === 0 ? (
                    <motion.div
                        key="empty"
                        className="empty-orders-premium"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <div className="empty-visual">
                            <Package size={80} strokeWidth={1} />
                        </div>
                        <h2>No orders found</h2>
                        <p>Your library is waiting for its first collection. Start exploring our vast catalog today.</p>
                        <button onClick={() => navigate('/books')} className="premium-browse-btn">
                            Browse Collection
                            <ChevronRight size={18} />
                        </button>
                    </motion.div>
                ) : (
                    <div key="list" className="orders-grid">
                        {orders.map(order => {
                            const status = getStatusStyles(order.status);
                            const canCancel = ['pending', 'processing'].includes(order.status);
                            const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);

                            return (
                                <motion.div
                                    key={order._id}
                                    className="order-master-card"
                                    variants={cardVariants}
                                    whileHover="hover"
                                >
                                    <div className="card-glass-glow"></div>

                                    <div className="card-top-header">
                                        <div className="id-group">
                                            <span className="order-id-label">ORDER ID</span>
                                            <span className="order-id-value">#{order._id.slice(-8).toUpperCase()}</span>
                                        </div>
                                        <div className={`status-pill ${status.class}`}>
                                            <div className="status-dot"></div>
                                            <span>{status.label}</span>
                                        </div>
                                    </div>

                                    <div className="order-main-content">
                                        <div className="meta-grid">
                                            <div className="meta-cell">
                                                <Calendar size={16} />
                                                <div className="meta-text">
                                                    <span className="label">Date</span>
                                                    <span className="value">{new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                </div>
                                            </div>
                                            <div className="meta-cell">
                                                <Clock size={16} />
                                                <div className="meta-text">
                                                    <span className="label">Time</span>
                                                    <span className="value">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </div>
                                            <div className="meta-cell">
                                                <Package size={16} />
                                                <div className="meta-text">
                                                    <span className="label">Total Items</span>
                                                    <span className="value">{totalQuantity} Book{totalQuantity > 1 ? 's' : ''}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="books-preview-list">
                                            {order.items.slice(0, 5).map((item, itemIdx) => {
                                                const book = item.book_id;
                                                return (
                                                    <div key={itemIdx} className="preview-book-thumb" title={book?.title || 'Deleted Book'}>
                                                        <img src={book?.cover_image_url || 'https://via.placeholder.com/150x225?text=No+Cover'} alt={book?.title || 'Deleted Book'} />
                                                    </div>
                                                );
                                            })}
                                            {order.items.length > 5 && (
                                                <div className="more-books-indicator">
                                                    +{order.items.length - 5}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="card-bottom-actions">
                                        <div className="total-display">
                                            <span className="label">Order Total</span>
                                            <span className="value">₹{order.totalAmount.toFixed(2)}</span>
                                        </div>

                                        <div className="action-buttons-group">
                                            {canCancel && (
                                                <button
                                                    className="cancel-order-btn-premium"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOrderToCancel(order._id);
                                                        setIsCancelModalOpen(true);
                                                    }}
                                                >
                                                    <XCircle size={16} />
                                                    <span>Cancel</span>
                                                </button>
                                            )}
                                            <button
                                                className="view-order-details-btn"
                                                onClick={() => navigate(`/orders/${order._id}`)}
                                            >
                                                <span>Details</span>
                                                <ChevronRight size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </AnimatePresence>

            <ConfirmationModal
                isOpen={isCancelModalOpen}
                title="Cancel Order"
                message="Are you sure you want to cancel this order? This action cannot be undone and book stock will be released."
                onConfirm={handleCancelOrder}
                onCancel={() => {
                    setIsCancelModalOpen(false);
                    setOrderToCancel(null);
                }}
                isLoading={isCancelling}
                type="danger"
                confirmText="Yes, Cancel Order"
            />
        </motion.div>
    );
};

export default UserOrders;
