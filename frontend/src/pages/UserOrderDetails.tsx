import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ArrowLeft, Calendar, Clock, Package } from 'lucide-react';
import { getOrderDetails } from '../services/userOrderService';
import Loader from '../components/Loader';
import '../styles/UserOrderDetails.css';

interface OrderDetails {
    _id: string;
    items: {
        book_id: { title: string; cover_image_url: string; price: number };
        quantity: number;
        priceAtOrder: number;
    }[];
    address_id: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
    };
    totalAmount: number;
    deliveryFee: number;
    paymentMethod: string;
    status: string;
    createdAt: string;
}

const UserOrderDetails: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();
    const [order, setOrder] = useState<OrderDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (orderId) {
            fetchOrderDetails(orderId);
        }
    }, [orderId]);

    const fetchOrderDetails = async (id: string) => {
        setIsLoading(true);
        try {
            const data = await getOrderDetails(id);
            setOrder(data);
        } catch (error: any) {
            toast.error(error);
            navigate('/my-orders');
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
    if (!order) return <div className="dashboard-container">Order not found</div>;

    const orderDate = new Date(order.createdAt);

    return (
        <div className="dashboard-container saas-reveal">
            <div className="order-details-header">
                <Link to="/my-orders" className="back-link">
                    <ArrowLeft size={18} />
                    Back to My Orders
                </Link>

                <div className="order-header-info">
                    <h1>Order #{order._id.slice(-8).toUpperCase()}</h1>
                    <span className={`order-status-badge ${getStatusColor(order.status)}`}>
                        {order.status}
                    </span>
                </div>

                <div className="order-meta-row">
                    <span className="meta-item">
                        <Calendar size={16} />
                        {orderDate.toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                        })}
                    </span>
                    <span className="meta-item">
                        <Clock size={16} />
                        {orderDate.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </span>
                </div>
            </div>

            <div className="order-details-grid">
                {/* Delivery Address */}
                <div className="details-card">
                    <h3>Delivery Address</h3>
                    <div className="address-info">
                        <p>{order.address_id?.street}</p>
                        <p>{order.address_id?.city}, {order.address_id?.state}</p>
                        <p>{order.address_id?.zipCode}</p>
                        <p>{order.address_id?.country}</p>
                    </div>
                </div>

                {/* Payment Info */}
                <div className="details-card">
                    <h3>Payment Method</h3>
                    <p className="payment-method">{order.paymentMethod || 'Cash on Delivery'}</p>
                </div>
            </div>

            {/* Order Items */}
            <div className="order-items-section">
                <h2>
                    <Package size={20} />
                    Order Items ({order.items.length})
                </h2>

                <div className="items-list">
                    {order.items.map((item, idx) => (
                        <div key={idx} className="order-item-card">
                            <img
                                src={item.book_id.cover_image_url}
                                alt={item.book_id.title}
                                className="item-image"
                            />
                            <div className="item-details">
                                <h4>{item.book_id.title}</h4>
                                <p className="item-price">₹{item.priceAtOrder.toFixed(2)} × {item.quantity}</p>
                            </div>
                            <div className="item-total">
                                ₹{(item.priceAtOrder * item.quantity).toFixed(2)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Order Summary */}
            <div className="order-summary-card">
                <div className="summary-row">
                    <span>Subtotal</span>
                    <span>₹{order.items.reduce((sum, item) =>
                        sum + (item.priceAtOrder * item.quantity), 0
                    ).toFixed(2)}</span>
                </div>
                <div className="summary-row">
                    <span>Delivery Charges</span>
                    <span>{order.deliveryFee > 0 ? `₹${order.deliveryFee.toFixed(2)}` : 'FREE'}</span>
                </div>
                <div className="summary-row total-row">
                    <span>Total Amount</span>
                    <span className="total-amount">₹{order.totalAmount.toFixed(2)}</span>
                </div>
            </div>
        </div>
    );
};

export default UserOrderDetails;
