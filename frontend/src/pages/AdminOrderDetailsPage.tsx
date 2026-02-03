import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
    ArrowLeft, Calendar, Package, User, Mail, Phone,
    MapPin, CreditCard, FileText, Download, XCircle
} from 'lucide-react';
import { getOrderById, updateOrderStatus } from '../services/adminOrderService';
import StatusDropdown from '../components/StatusDropdown';
import Loader from '../components/Loader';
import { generateInvoice } from '../utils/invoiceGenerator';
import '../styles/AdminOrderDetails.css';

interface OrderDetails {
    _id: string;
    user_id: { name: string; email: string; phone?: string };
    items: {
        book_id: { _id: string; title: string; cover_image_url: string; price: number };
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
    returnReason?: string;
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

    const handleDownloadInvoice = () => {
        if (!order) return;
        try {
            generateInvoice(order as any);
            toast.success('Invoice generated successfully');
        } catch (error) {
            toast.error('Failed to generate invoice');
        }
    };

    if (isLoading) return <Loader />;
    if (!order) return <div style={{ padding: '2rem', textAlign: 'center' }}>Order not found</div>;

    const orderDate = new Date(order.createdAt);

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

    const currentStep = getStatusStep(order.status);

    return (
        <div className="admin-details-container saas-reveal">
            {/* Top Navigation Bar */}
            {/* Standalone Back Button */}
            <Link to="/admin/orders" className="back-link">
                <ArrowLeft size={18} />
                <span>Back</span>
            </Link>

            {/* Top Navigation Bar */}
            <div className="details-topbar">
                <div className="topbar-left">
                    <div className="order-id-display">
                        <Package size={18} />
                        <span>Order #{order._id.slice(-8).toUpperCase()}</span>
                    </div>
                </div>

                <div className="topbar-right">
                    <button className="invoice-download-btn" onClick={handleDownloadInvoice}>
                        <Download size={18} />
                        <span>Invoice</span>
                    </button>
                    <div className="status-dropdown-wrapper">
                        <StatusDropdown
                            currentStatus={order.status}
                            onStatusChange={handleStatusUpdate}
                            isLoading={isUpdating}
                        />
                    </div>
                </div>
            </div>

            {
                order.returnReason && (
                    <div className="return-reason-alert">
                        <div className="alert-content">
                            <strong>Return Reason Submitted:</strong>
                            {order.returnReason}
                        </div>
                    </div>
                )
            }

            {/* Compact Progress Stepper */}
            <div className="compact-stepper-container">
                <div className="stepper-track">
                    <div className={`stepper-step ${currentStep >= 1 ? 'active' : ''}`}>
                        <div className="step-dot"><div className="dot-inner"></div></div>
                        <span className="step-label">Placed</span>
                    </div>
                    <div className={`stepper-line ${currentStep >= 2 ? 'active' : ''}`}></div>
                    <div className={`stepper-step ${currentStep >= 2 ? 'active' : ''}`}>
                        <div className="step-dot"><div className="dot-inner"></div></div>
                        <span className="step-label">Processing</span>
                    </div>
                    <div className={`stepper-line ${currentStep >= 3 ? 'active' : ''}`}></div>
                    <div className={`stepper-step ${currentStep >= 3 ? 'active' : ''}`}>
                        <div className="step-dot"><div className="dot-inner"></div></div>
                        <span className="step-label">Shipped</span>
                    </div>
                    <div className={`stepper-line ${currentStep >= 4 ? 'active' : ''}`}></div>
                    <div className={`stepper-step ${currentStep >= 4 ? 'active' : ''}`}>
                        <div className="step-dot"><div className="dot-inner"></div></div>
                        <span className="step-label">Delivered</span>
                    </div>
                    {order.status === 'cancelled' && (
                        <>
                            <div className="stepper-line cancelled"></div>
                            <div className="stepper-step active cancelled">
                                <div className="step-dot"><XCircle size={12} /></div>
                                <span className="step-label">Cancelled</span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Main Layout: Sidebar + Content */}
            <div className="details-main-layout">
                {/* Left Sidebar: Detailed Info Cards */}
                <aside className="details-sidebar">
                    <div className="sidebar-card">
                        <div className="card-header">
                            <User size={18} />
                            <h3>Customer</h3>
                        </div>
                        <div className="card-content">
                            <div className="info-row">
                                <span className="label">Name</span>
                                <span className="value">{order.user_id?.name}</span>
                            </div>
                            <div className="info-row row-center">
                                <Mail size={14} className="icon-sub" />
                                <span className="value-sub">{order.user_id?.email}</span>
                            </div>
                            <div className="info-row row-center">
                                <Phone size={14} className="icon-sub" />
                                <span className="value-sub">{order.user_id?.phone || 'Not provided'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="sidebar-card">
                        <div className="card-header">
                            <MapPin size={18} />
                            <h3>Delivery Address</h3>
                        </div>
                        <div className="card-content">
                            <p className="address-text">
                                {order.address_id?.street},<br />
                                {order.address_id?.city}, {order.address_id?.state},<br />
                                {order.address_id?.zipCode}, {order.address_id?.country}
                            </p>
                        </div>
                    </div>

                    <div className="sidebar-card highlight">
                        <div className="card-header">
                            <CreditCard size={18} />
                            <h3>Payment Info</h3>
                        </div>
                        <div className="card-content">
                            <div className="info-row">
                                <span className="label">Method</span>
                                <span className="value uppercase">{order.paymentMethod || 'COD'}</span>
                            </div>
                            <div className="info-row status-info">
                                <span className="label">Status</span>
                                <span className={`status-text ${order.status === 'delivered' ? 'paid' : 'pending'}`}>
                                    {order.status === 'delivered' ? 'Paid' : 'Pending'}
                                </span>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Content Area: Order Details & Items */}
                <main className="details-content">
                    <div className="content-inner-header">
                        <FileText size={20} />
                        <h2>Order Summary</h2>
                        <div className="timestamp">
                            <Calendar size={14} />
                            <span>{orderDate.toLocaleDateString()} at {orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="items-list-container">
                        <div className="items-table-header">
                            <span className="col-item">Product</span>
                            <span className="col-qty">Quantity</span>
                            <span className="col-price">Unit Price</span>
                            <span className="col-total">Total</span>
                        </div>
                        <div className="items-rows">
                            {order.items.map((item, idx) => (
                                <div className="item-row" key={idx}>
                                    <div className="item-info col-item">
                                        <img
                                            src={item.book_id?.cover_image_url || 'https://via.placeholder.com/150?text=NA'}
                                            alt={item.book_id?.title || 'Book'}
                                            className="table-img"
                                        />
                                        <div className="item-meta">
                                            <span className="item-title">{item.book_id?.title || 'Deleted Book'}</span>
                                            <span className="item-id">
                                                ID: {item.book_id?._id ? item.book_id._id.slice(-6).toUpperCase() : 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="col-qty">
                                        <span className="qty-tag">x{item.quantity}</span>
                                    </div>
                                    <div className="col-price">₹{item.priceAtOrder.toFixed(2)}</div>
                                    <div className="col-total font-bold">₹{(item.priceAtOrder * item.quantity).toFixed(2)}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Grand Summary Card */}
                    <div className="grand-summary-card">
                        <div className="summary-details">
                            <div className="row">
                                <span>Subtotal</span>
                                <span>₹{order.items.reduce((sum, item) => sum + (item.priceAtOrder * item.quantity), 0).toFixed(2)}</span>
                            </div>
                            <div className="row">
                                <span>Delivery Fee</span>
                                <span className={order.deliveryFee === 0 ? 'free' : ''}>
                                    {order.deliveryFee === 0 ? 'FREE' : `₹${order.deliveryFee.toFixed(2)}`}
                                </span>
                            </div>
                        </div>
                        <div className="divider"></div>
                        <div className="final-total">
                            <div className="total-label-group">
                                <h3>Total Amount</h3>
                                <p>Includes all applicable taxes</p>
                            </div>
                            <span className="total-value">₹{order.totalAmount.toFixed(2)}</span>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminOrderDetailsPage;
