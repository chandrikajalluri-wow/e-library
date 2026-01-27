
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
    ArrowLeft, Calendar, Clock, MapPin, CreditCard,
    User, Mail, Phone
} from 'lucide-react';
import { getOrderById, updateOrderStatus } from '../services/adminOrderService';
import StatusDropdown from '../components/StatusDropdown';
import Loader from '../components/Loader';
import '../styles/AdminOrderDetails.css';

interface OrderDetails {
    _id: string;
    user_id: { name: string; email: string; phone?: string };
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
    paymentMethod: string;
    status: string;
    createdAt: string;
}

const AdminOrderDetailsPage: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const [order, setOrder] = useState<OrderDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        if (orderId) {
            fetchOrderDetails(orderId);
        }
    }, [orderId]);

    const fetchOrderDetails = async (id: string) => {
        setIsLoading(true);
        try {
            const data = await getOrderById(id);
            setOrder(data);
        } catch (error: any) {
            toast.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStatusUpdate = async (newStatus: string) => {
        if (!order) return;
        setIsUpdating(true);
        try {
            await updateOrderStatus(order._id, newStatus);
            setOrder({ ...order, status: newStatus });
            toast.success(`Order status updated to ${newStatus}`);
        } catch (error: any) {
            toast.error('Failed to update status');
        } finally {
            setIsUpdating(false);
        }
    };

    if (isLoading) return <Loader />;
    if (!order) return <div style={{ padding: '2rem', textAlign: 'center' }}>Order not found</div>;

    const orderDate = new Date(order.createdAt);

    return (
        <div className="admin-details-container">
            {/* Top Navigation Bar */}
            <div className="details-topbar">
                <div className="topbar-left">
                    <Link to="/admin/orders" className="back-link">
                        <ArrowLeft size={16} />
                        <span>Back to Orders</span>
                    </Link>
                    <div className="order-id-display">
                        Order #{order._id.slice(-8).toUpperCase()}
                    </div>
                </div>

                <div className="topbar-right">
                    <div className="status-dropdown-wrapper">
                        <StatusDropdown
                            currentStatus={order.status}
                            onStatusChange={handleStatusUpdate}
                            isLoading={isUpdating}
                        />
                    </div>
                </div>
            </div>

            {/* Main Layout: Sidebar + Content */}
            <div className="details-main-layout">
                {/* Left Sidebar */}
                <aside className="details-sidebar">
                    <div className="sidebar-section">
                        <div className="sidebar-section-title">Order Status</div>
                        <div className="sidebar-info-item">
                            <span className={`status-badge ${order.status}`}>
                                {order.status}
                            </span>
                        </div>
                    </div>

                    <div className="sidebar-divider"></div>

                    <div className="sidebar-section">
                        <div className="sidebar-section-title">Customer</div>
                        <div className="sidebar-info-item">
                            <span className="sidebar-label">Name</span>
                            <div className="sidebar-value">{order.user_id?.name}</div>
                        </div>
                        <div className="sidebar-info-item">
                            <span className="sidebar-label">Email</span>
                            <div className="sidebar-value">{order.user_id?.email}</div>
                        </div>
                        <div className="sidebar-info-item">
                            <span className="sidebar-label">Phone</span>
                            <div className="sidebar-value">{order.user_id?.phone || 'N/A'}</div>
                        </div>
                    </div>

                    <div className="sidebar-divider"></div>

                    <div className="sidebar-section">
                        <div className="sidebar-section-title">Delivery</div>
                        <div className="sidebar-info-item">
                            <span className="sidebar-label">Address</span>
                            <div className="sidebar-value">
                                {order.address_id?.street}<br />
                                {order.address_id?.city}, {order.address_id?.state}<br />
                                {order.address_id?.zipCode}
                            </div>
                        </div>
                        <div className="sidebar-info-item">
                            <span className="sidebar-label">Payment</span>
                            <div className="sidebar-value">{order.paymentMethod || 'COD'}</div>
                        </div>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="details-content">
                    <div className="content-header">
                        <h1 className="content-title">Order Details</h1>
                        <div className="content-meta">
                            <div className="meta-item">
                                <Calendar size={14} />
                                <span>{orderDate.toLocaleDateString('en-US', {
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric'
                                })}</span>
                            </div>
                            <div className="meta-item">
                                <Clock size={14} />
                                <span>{orderDate.toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}</span>
                            </div>
                        </div>
                    </div>

                    <div className="section-divider"></div>

                    {/* Items Table */}
                    <div className="items-table-container">
                        <table className="items-table">
                            <thead>
                                <tr>
                                    <th></th>
                                    <th>Item</th>
                                    <th>Quantity</th>
                                    <th>Price</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {order.items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="item-image-cell">
                                            <img
                                                src={item.book_id.cover_image_url}
                                                alt={item.book_id.title}
                                                className="item-thumbnail"
                                            />
                                        </td>
                                        <td className="item-title-cell">{item.book_id.title}</td>
                                        <td className="item-qty-cell">{item.quantity}</td>
                                        <td className="item-price-cell">₹{item.priceAtOrder.toFixed(2)}</td>
                                        <td className="item-total-cell">
                                            ₹{(item.priceAtOrder * item.quantity).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Summary Section */}
                    <div className="summary-section">
                        <div className="summary-row">
                            <span className="summary-label">Subtotal</span>
                            <span className="summary-value">
                                ₹{order.items.reduce((sum, item) =>
                                    sum + (item.priceAtOrder * item.quantity), 0
                                ).toFixed(2)}
                            </span>
                        </div>
                        <div className="summary-row total-row">
                            <span className="total-label">Total Amount</span>
                            <span className="total-amount">₹{order.totalAmount.toFixed(2)}</span>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminOrderDetailsPage;
