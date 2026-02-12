import React, { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
    ArrowLeft, Calendar, Package, User, Mail, Phone,
    MapPin, CreditCard, FileText, Download, XCircle,
    ArrowLeftRight as ExchangeIcon, Eye
} from 'lucide-react';
import { getOrderById, updateOrderStatus, downloadInvoice } from '../services/adminOrderService';


import StatusDropdown from '../components/StatusDropdown';
import Loader from '../components/Loader';
import { motion, AnimatePresence } from 'framer-motion';

import '../styles/AdminOrderDetails.css';

interface OrderDetails {
    _id: string;
    user_id: { name: string; email: string; phone?: string };
    items: {
        book_id: {
            _id: string;
            title: string;
            cover_image_url: string;
            price: number;
            addedBy?: {
                _id: string;
                name: string;
            };
        };
        quantity: number;
        priceAtOrder: number;
    }[];
    address_id: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
        phoneNumber?: string;
    };
    totalAmount: number;
    deliveryFee: number;
    paymentMethod: string;
    status: string;
    createdAt: string;
    returnReason?: string;
    exchangeImageUrl?: string;
}

const AdminOrderDetailsPage: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const { search } = useLocation();
    const queryParams = new URLSearchParams(search);
    const bookId = queryParams.get('bookId');

    const [order, setOrder] = useState<OrderDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

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

    const handleDownloadInvoice = async () => {
        if (!order) return;
        try {
            await downloadInvoice(order._id);
            toast.success('Invoice generated successfully');
        } catch (error: any) {
            toast.error(error || 'Failed to generate invoice');
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

    // Filter items if bookId is provided
    const displayItems = bookId
        ? order.items.filter(item => item.book_id?._id === bookId)
        : order.items;

    const maskPhoneNumber = (phone?: string) => {
        if (!phone) return 'Not provided';
        // Mask all characters except the last 4
        return phone.toString().replace(/.(?=.{4})/g, '*');
    };

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
                            isExchange={!!order.returnReason}
                        />
                    </div>
                </div>
            </div>

            {order.returnReason && (
                <div className="exchange-details-card saas-reveal">
                    <div className="exchange-card-header">
                        <div className="header-label">
                            <ExchangeIcon size={20} className="icon-pulse" />
                            <span>Exchange Request</span>
                        </div>
                        <div className={`status-badge-mini ${order.status}`}>
                            <div className="status-dot"></div>
                            <span>
                                {order.status === 'return_requested' && 'Exchange Pending'}
                                {order.status === 'return_accepted' && 'Accepted'}
                                {order.status === 'returned' && 'Item Received'}
                                {['processing', 'shipped', 'delivered'].includes(order.status) && 'Exchange in Progress'}
                                {order.status === 'return_rejected' && 'Exchange Rejected'}
                            </span>
                        </div>
                    </div>

                    <div className="exchange-card-content">
                        <div className="reason-section">
                            <span className="section-label">Reason for Exchange</span>
                            <p className="reason-text-main">{order.returnReason}</p>
                        </div>

                        {order.exchangeImageUrl && (
                            <div className="proof-section-premium">
                                <span className="section-label">Evidence Proof</span>
                                <div
                                    className="proof-card-mini"
                                    onClick={() => setPreviewImage(order.exchangeImageUrl!)}
                                >
                                    <img src={order.exchangeImageUrl} alt="Exchange Proof" />
                                    <div className="proof-overlay-premium">
                                        <Eye size={18} />
                                        <span>Full Preview</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <AnimatePresence>
                {previewImage && (
                    <motion.div
                        className="image-preview-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setPreviewImage(null)}
                    >
                        <motion.div
                            className="image-preview-content"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        >
                            <button className="close-preview" onClick={() => setPreviewImage(null)}>
                                <XCircle size={24} />
                            </button>
                            <img src={previewImage} alt="Large Proof" />
                            <div className="preview-caption">Exchange Evidence Proof</div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Compact Progress Stepper */}
            <div className="compact-stepper-container">
                <div className="stepper-track">
                    {!order.returnReason ? (
                        // Standard Flow
                        <>
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
                        </>
                    ) : order.status === 'return_rejected' ? (
                        // Rejected Flow
                        <>
                            <div className="stepper-step active cancelled">
                                <div className="step-dot"><XCircle size={14} /></div>
                                <span className="step-label">Exchange Rejected</span>
                            </div>
                        </>
                    ) : (
                        // Detailed Exchange Flow
                        <>
                            {/* Step 1: Exchange Pending */}
                            <div className={`stepper-step ${['return_requested', 'return_accepted', 'returned', 'processing', 'shipped', 'delivered'].includes(order.status) ? 'active' : ''}`}>
                                <div className="step-dot"><div className="dot-inner"></div></div>
                                <span className="step-label">Exchange Pending</span>
                            </div>
                            <div className={`stepper-line ${['return_accepted', 'returned', 'processing', 'shipped', 'delivered'].includes(order.status) ? 'active' : ''}`}></div>

                            {/* Step 2: Accepted */}
                            <div className={`stepper-step ${['return_accepted', 'returned', 'processing', 'shipped', 'delivered'].includes(order.status) ? 'active' : ''}`}>
                                <div className="step-dot"><div className="dot-inner"></div></div>
                                <span className="step-label">Accepted</span>
                            </div>
                            <div className={`stepper-line ${['returned', 'processing', 'shipped', 'delivered'].includes(order.status) ? 'active' : ''}`}></div>

                            {/* Step 3: Item Received */}
                            <div className={`stepper-step ${['returned', 'processing', 'shipped', 'delivered'].includes(order.status) ? 'active' : ''}`}>
                                <div className="step-dot"><div className="dot-inner"></div></div>
                                <span className="step-label">Item Received</span>
                            </div>
                            <div className={`stepper-line ${['processing', 'shipped', 'delivered'].includes(order.status) ? 'active' : ''}`}></div>

                            {/* Step 4: Processed */}
                            <div className={`stepper-step ${['processing', 'shipped', 'delivered'].includes(order.status) ? 'active' : ''}`}>
                                <div className="step-dot"><div className="dot-inner"></div></div>
                                <span className="step-label">Processed</span>
                            </div>
                            <div className={`stepper-line ${['shipped', 'delivered'].includes(order.status) ? 'active' : ''}`}></div>

                            {/* Step 5: Shipped */}
                            <div className={`stepper-step ${['shipped', 'delivered'].includes(order.status) ? 'active' : ''}`}>
                                <div className="step-dot"><div className="dot-inner"></div></div>
                                <span className="step-label">Shipped</span>
                            </div>
                            <div className={`stepper-line ${['delivered'].includes(order.status) ? 'active' : ''}`}></div>

                            {/* Step 6: Delivered */}
                            <div className={`stepper-step ${['delivered'].includes(order.status) ? 'active' : ''}`}>
                                <div className="step-dot"><div className="dot-inner"></div></div>
                                <span className="step-label">Delivered</span>
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
                                <span className="value-sub">
                                    {maskPhoneNumber(order.address_id?.phoneNumber || order.user_id?.phone)}
                                </span>
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
                                {order.address_id?.zipCode}, {order.address_id?.country}<br />
                                <strong>Phone:</strong> {maskPhoneNumber(order.address_id?.phoneNumber)}
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

                    {/* Order Items - Individual Cards */}
                    <div className="items-cards-column" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {displayItems.map((item, idx) => (
                            <div className="admin-item-card-premium" key={idx} style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '24px',
                                padding: '1.5rem',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                            }}>
                                <div className="card-top-info" style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '1.5rem',
                                    borderBottom: '1px solid var(--border-color)',
                                    paddingBottom: '1rem'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <Package size={20} className="text-indigo-600" />
                                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800' }}>Item {idx + 1}</h3>
                                    </div>
                                    <div className="seller-badge-admin" style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        fontSize: '0.85rem',
                                        fontWeight: '700',
                                        color: 'var(--primary-color)',
                                        background: 'rgba(99, 102, 241, 0.1)',
                                        padding: '0.5rem 1rem',
                                        borderRadius: '10px'
                                    }}>
                                        <User size={14} />
                                        <span>Managed By: {item.book_id?.addedBy?.name || 'Unknown'}</span>
                                    </div>
                                </div>
                                <div className="item-main-content" style={{ display: 'flex', gap: '1.5rem' }}>
                                    <img
                                        src={item.book_id?.cover_image_url || 'https://via.placeholder.com/150?text=NA'}
                                        alt={item.book_id?.title || 'Book'}
                                        style={{ width: '80px', height: '110px', borderRadius: '12px', objectFit: 'cover' }}
                                    />
                                    <div className="item-details-expanded" style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '750' }}>{item.book_id?.title || 'Deleted Book'}</h4>
                                            <span style={{ fontWeight: '700', color: 'var(--text-secondary)' }}>₹{item.priceAtOrder.toFixed(2)} / unit</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                                            <div className="qty-info" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Quantity:</span>
                                                <span style={{
                                                    background: 'var(--bg-color)',
                                                    padding: '0.2rem 0.6rem',
                                                    borderRadius: '6px',
                                                    fontWeight: '700',
                                                    border: '1px solid var(--border-color)'
                                                }}>x{item.quantity}</span>
                                            </div>
                                            <div className="item-total" style={{ textAlign: 'right' }}>
                                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Item Subtotal</p>
                                                <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: '900', color: 'var(--primary-color)' }}>₹{(item.priceAtOrder * item.quantity).toFixed(2)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Grand Summary Card */}
                    <div className="grand-summary-card">
                        <div className="summary-details">
                            <div className="row">
                                <span>Subtotal</span>
                                <span>₹{displayItems.reduce((sum, item) => sum + (item.priceAtOrder * item.quantity), 0).toFixed(2)}</span>
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
                            <span className="total-value">₹{(displayItems.reduce((sum, item) => sum + (item.priceAtOrder * item.quantity), 0) + order.deliveryFee).toFixed(2)}</span>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminOrderDetailsPage;
