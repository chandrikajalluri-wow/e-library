import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Package, Calendar, Clock, ChevronRight } from 'lucide-react';
import { getMyOrders } from '../services/userOrderService';
import Loader from '../components/Loader';
import '../styles/UserOrders.css';

interface OrderItem {
    book_id: { title: string; cover_image_url: string };
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

    useEffect(() => {
        fetchUserOrders();
    }, []);

    const fetchUserOrders = async () => {
        setIsLoading(true);
        try {
            const data = await getMyOrders();
            setOrders(data);
        } catch (error: any) {
            toast.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'status-pending';
            case 'processing': return 'status-processing';
            case 'shipped': return 'status-shipped';
            case 'delivered': return 'status-delivered';
            case 'cancelled': return 'status-cancelled';
            default: return 'status-pending';
        }
    };

    if (isLoading) return <Loader />;

    return (
        <div className="dashboard-container saas-reveal">
            <div className="user-orders-header">
                <h1>My Orders</h1>
                <p>Track and manage your book orders</p>
            </div>

            {orders.length === 0 ? (
                <div className="no-orders-state">
                    <Package size={64} className="no-orders-icon" />
                    <h3>No orders yet</h3>
                    <p>Start browsing our collection and place your first order!</p>
                    <button onClick={() => navigate('/books')} className="btn-primary">
                        Browse Books
                    </button>
                </div>
            ) : (
                <div className="orders-list">
                    {orders.map(order => (
                        <div
                            key={order._id}
                            className="user-order-card"
                            onClick={() => navigate(`/orders/${order._id}`)}
                        >
                            <div className="order-card-header">
                                <div className="order-id-section">
                                    <h3>Order #{order._id.slice(-8).toUpperCase()}</h3>
                                    <div className="order-meta-info">
                                        <span className="meta-item">
                                            <Calendar size={14} />
                                            {new Date(order.createdAt).toLocaleDateString()}
                                        </span>
                                        <span className="meta-item">
                                            <Clock size={14} />
                                            {new Date(order.createdAt).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                </div>
                                <span className={`order-status-badge ${getStatusColor(order.status)}`}>
                                    {order.status}
                                </span>
                            </div>

                            <div className="order-items-preview">
                                {order.items.slice(0, 3).map((item, idx) => (
                                    <div key={idx} className="preview-book">
                                        <img
                                            src={item.book_id.cover_image_url}
                                            alt={item.book_id.title}
                                        />
                                        {item.quantity > 1 && (
                                            <span className="quantity-badge">×{item.quantity}</span>
                                        )}
                                    </div>
                                ))}
                                {order.items.length > 3 && (
                                    <div className="more-items">
                                        +{order.items.length - 3} more
                                    </div>
                                )}
                            </div>

                            <div className="order-card-footer">
                                <div className="order-summary-row" style={{ display: 'flex', gap: '1.5rem' }}>
                                    <div className="order-total">
                                        <span className="total-label">Subtotal:</span>
                                        <span className="total-amount" style={{ fontSize: '1rem' }}>₹{order.items.reduce((sum, item) => sum + (item.priceAtOrder * item.quantity), 0).toFixed(2)}</span>
                                    </div>
                                    <div className="order-total">
                                        <span className="total-label">Del. Fee:</span>
                                        <span className="total-amount" style={{ fontSize: '1rem' }}>{order.deliveryFee > 0 ? `₹${order.deliveryFee}` : 'FREE'}</span>
                                    </div>
                                    <div className="order-total">
                                        <span className="total-label">Total:</span>
                                        <span className="total-amount">₹{order.totalAmount.toFixed(2)}</span>
                                    </div>
                                </div>
                                <button className="view-details-btn">
                                    View Details
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default UserOrders;
