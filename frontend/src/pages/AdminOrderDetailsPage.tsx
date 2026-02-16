import React, { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
    ArrowLeft, Calendar, Package, User, Mail, Phone,
    MapPin, CreditCard, FileText, Download, XCircle,
    ArrowLeftRight as ExchangeIcon, Eye, AlertCircle
} from 'lucide-react';
import { getOrderById, updateOrderStatus, downloadInvoice } from '../services/adminOrderService';


import StatusDropdown from '../components/StatusDropdown';
import Loader from '../components/Loader';
import { motion, AnimatePresence } from 'framer-motion';

import '../styles/AdminOrderDetails.css';

interface OrderDetails {
    _id: string;
    user_id: {
        name: string;
        email: string;
        phone?: string;
        membership_id?: {
            name: string;
            displayName: string;
        }
    };
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

    let strokeColor = 'var(--primary-color)';
    let isUrgent = false;
    if (percentage < 25) {
        strokeColor = '#ef4444';
        isUrgent = true;
    } else if (percentage < 50) {
        strokeColor = '#f59e0b';
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

const AdminOrderDetailsPage: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const { search } = useLocation();
    const queryParams = new URLSearchParams(search);
    const bookId = queryParams.get('bookId');

    const [order, setOrder] = useState<OrderDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

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
            // Service already handles toast, but we catch it here to prevent success toast
            console.error('Invoice download failed:', error);
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
            {/* Top Navigation Bar */}
            <div className="details-topbar">
                <div className="topbar-left">
                    <Link to="/admin/orders" className="back-link">
                        <ArrowLeft size={18} />
                        <span>Back to Orders</span>
                    </Link>
                    <div className="order-id-display" style={{ cursor: 'pointer' }} onClick={() => {
                        navigator.clipboard.writeText(order._id);
                        toast.info('Order ID copied to clipboard');
                    }} title="Click to copy Order ID">
                        <Package size={20} className="text-indigo-600" />
                        <span>Order #{order._id.slice(-8).toUpperCase()}</span>
                    </div>
                </div>

                <div className="topbar-right">
                    {order.user_id?.membership_id?.name === 'premium' && (order.status === 'pending' || order.status === 'processing') && (
                        <div style={{ marginRight: '1rem' }}>
                            <CircularCountdown date={order.createdAt} membership="premium" currentTime={currentTime} />
                        </div>
                    )}
                    <button className="invoice-download-btn" onClick={handleDownloadInvoice}>
                        <Download size={18} />
                        <span>Download Invoice</span>
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
                <div className="exchange-details-card saas-reveal" style={{
                    borderLeft: '5px solid var(--status-return-requested)',
                    background: 'var(--bg-secondary)',
                    borderRadius: '24px',
                }}>
                    <div className="exchange-card-header">
                        <div className="header-label">
                            <div style={{ background: 'rgba(217, 119, 6, 0.1)', padding: '0.6rem', borderRadius: '12px' }}>
                                <ExchangeIcon size={20} className="icon-pulse text-amber-600" />
                            </div>
                            <span style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--text-primary)' }}>Exchange Request</span>
                        </div>
                        <div className={`status-badge-premium ${order.status}`} style={{ margin: 0 }}>
                            {order.status === 'return_requested' ? 'Exchange Pending' :
                                order.status === 'return_accepted' ? 'Accepted' :
                                    order.status === 'returned' ? 'Exchanged' :
                                        order.status === 'return_rejected' ? 'Rejected' :
                                            order.status}
                        </div>
                    </div>

                    <div className="exchange-card-content" style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                        <div className="reason-section">
                            <span className="section-label" style={{ color: 'var(--text-muted)', fontWeight: '800', fontSize: '0.7rem' }}>Reason for exchange</span>
                            <p className="reason-text-main" style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)', marginTop: '0.5rem' }}>"{order.returnReason}"</p>
                        </div>

                        {order.exchangeImageUrl && (
                            <div className="proof-section-premium" style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '2rem' }}>
                                <span className="section-label" style={{ color: 'var(--text-muted)', fontWeight: '800', fontSize: '0.7rem' }}>Photographic Evidence</span>
                                <div
                                    className="proof-card-mini"
                                    onClick={() => setPreviewImage(order.exchangeImageUrl!)}
                                    style={{ marginTop: '0.75rem', width: '120px', height: '120px', borderRadius: '16px' }}
                                >
                                    <img src={order.exchangeImageUrl} alt="Exchange Proof" />
                                    <div className="proof-overlay-premium">
                                        <Eye size={18} />
                                        <span>Full View</span>
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
            <div className="compact-stepper-container" style={{ margin: '2rem 0' }}>
                <div className="stepper-track">
                    {!order.returnReason ? (
                        // Standard Flow
                        <>
                            <div className={`stepper-step ${currentStep >= 1 ? 'active' : ''}`}>
                                <div className="step-dot" style={{ width: '28px', height: '28px' }}><div className="dot-inner" style={{ width: '10px', height: '10px' }}></div></div>
                                <span className="step-label">Order Placed</span>
                                <span style={{ fontSize: '0.65rem', opacity: 0.6, fontWeight: '700' }}>{orderDate.toLocaleDateString()}</span>
                            </div>
                            <div className={`stepper-line ${currentStep >= 2 ? 'active' : ''}`} style={{ marginTop: '-2.2rem' }}></div>
                            <div className={`stepper-step ${currentStep >= 2 ? 'active' : ''}`}>
                                <div className="step-dot" style={{ width: '28px', height: '28px' }}><div className="dot-inner" style={{ width: '10px', height: '10px' }}></div></div>
                                <span className="step-label">Processing</span>
                            </div>
                            <div className={`stepper-line ${currentStep >= 3 ? 'active' : ''}`} style={{ marginTop: '-2.2rem' }}></div>
                            <div className={`stepper-step ${currentStep >= 3 ? 'active' : ''}`}>
                                <div className="step-dot" style={{ width: '28px', height: '28px' }}><div className="dot-inner" style={{ width: '10px', height: '10px' }}></div></div>
                                <span className="step-label">Shipped</span>
                            </div>
                            <div className={`stepper-line ${currentStep >= 4 ? 'active' : ''}`} style={{ marginTop: '-2.2rem' }}></div>
                            <div className={`stepper-step ${currentStep >= 4 ? 'active' : ''}`}>
                                <div className="step-dot" style={{ width: '28px', height: '28px' }}><div className="dot-inner" style={{ width: '10px', height: '10px' }}></div></div>
                                <span className="step-label">Delivered</span>
                            </div>
                            {order.status === 'cancelled' && (
                                <>
                                    <div className="stepper-line cancelled" style={{ marginTop: '-2.2rem' }}></div>
                                    <div className="stepper-step active cancelled">
                                        <div className="step-dot" style={{ width: '28px', height: '28px' }}><XCircle size={14} /></div>
                                        <span className="step-label">Cancelled</span>
                                    </div>
                                </>
                            )}
                        </>
                    ) : (
                        // Detailed Exchange Flow
                        <>
                            <div className={`stepper-step ${['return_requested', 'return_accepted', 'returned', 'processing', 'shipped', 'delivered'].includes(order.status) ? 'active' : ''}`}>
                                <div className="step-dot" style={{ width: '28px', height: '28px' }}><div className="dot-inner" style={{ width: '10px', height: '10px' }}></div></div>
                                <span className="step-label">Request</span>
                            </div>
                            <div className={`stepper-line ${['return_accepted', 'returned', 'processing', 'shipped', 'delivered'].includes(order.status) ? 'active' : ''}`} style={{ marginTop: '-2.2rem' }}></div>

                            <div className={`stepper-step ${['return_accepted', 'returned', 'refund_initiated', 'refunded', 'processing', 'shipped', 'delivered'].includes(order.status) ? 'active' : ''}`}>
                                <div className="step-dot" style={{ width: '28px', height: '28px' }}><div className="dot-inner" style={{ width: '10px', height: '10px' }}></div></div>
                                <span className="step-label">Approved</span>
                            </div>
                            <div className={`stepper-line ${['returned', 'refund_initiated', 'refunded', 'processing', 'shipped', 'delivered'].includes(order.status) ? 'active' : ''}`} style={{ marginTop: '-2.2rem' }}></div>

                            <div className={`stepper-step ${['returned', 'refund_initiated', 'refunded', 'processing', 'shipped', 'delivered'].includes(order.status) ? 'active' : ''}`}>
                                <div className="step-dot" style={{ width: '28px', height: '28px' }}><div className="dot-inner" style={{ width: '10px', height: '10px' }}></div></div>
                                <span className="step-label">Item In</span>
                            </div>
                            <div className={`stepper-line ${['refund_initiated', 'refunded', 'processing', 'shipped', 'delivered'].includes(order.status) ? 'active' : ''}`} style={{ marginTop: '-2.2rem' }}></div>

                            {['refund_initiated', 'refunded'].includes(order.status) ? (
                                <>
                                    <div className={`stepper-step ${['refund_initiated', 'refunded'].includes(order.status) ? 'active' : ''}`}>
                                        <div className="step-dot" style={{ width: '28px', height: '28px' }}><div className="dot-inner" style={{ width: '10px', height: '10px' }}></div></div>
                                        <span className="step-label">Refund Init</span>
                                    </div>
                                    <div className={`stepper-line ${order.status === 'refunded' ? 'active' : ''}`} style={{ marginTop: '-2.2rem' }}></div>
                                    <div className={`stepper-step ${order.status === 'refunded' ? 'active' : ''}`}>
                                        <div className="step-dot" style={{ width: '28px', height: '28px' }}><div className="dot-inner" style={{ width: '10px', height: '10px' }}></div></div>
                                        <span className="step-label">Refunded</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className={`stepper-step ${['processing', 'shipped', 'delivered'].includes(order.status) ? 'active' : ''}`}>
                                        <div className="step-dot" style={{ width: '28px', height: '28px' }}><div className="dot-inner" style={{ width: '10px', height: '10px' }}></div></div>
                                        <span className="step-label">Packed</span>
                                    </div>
                                    <div className={`stepper-line ${['shipped', 'delivered'].includes(order.status) ? 'active' : ''}`} style={{ marginTop: '-2.2rem' }}></div>

                                    <div className={`stepper-step ${['shipped', 'delivered'].includes(order.status) ? 'active' : ''}`}>
                                        <div className="step-dot" style={{ width: '28px', height: '28px' }}><div className="dot-inner" style={{ width: '10px', height: '10px' }}></div></div>
                                        <span className="step-label">Transit</span>
                                    </div>
                                    <div className={`stepper-line ${['delivered'].includes(order.status) ? 'active' : ''}`} style={{ marginTop: '-2.2rem' }}></div>

                                    <div className={`stepper-step ${['delivered'].includes(order.status) ? 'active' : ''}`}>
                                        <div className="step-dot" style={{ width: '28px', height: '28px' }}><div className="dot-inner" style={{ width: '10px', height: '10px' }}></div></div>
                                        <span className="step-label">Done</span>
                                    </div>
                                </>
                            )}
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
                            <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '0.6rem', borderRadius: '12px' }}>
                                <User size={20} className="text-indigo-600" />
                            </div>
                            <h3>Customer Profile</h3>
                        </div>
                        <div className="card-content">
                            <div className="info-row">
                                <span className="label">Full Name</span>
                                <span className="value" style={{ fontSize: '1.2rem', marginTop: '0.25rem' }}>{order.user_id?.name}</span>
                            </div>
                            <div className="info-row row-center" style={{ marginTop: '0.5rem' }}>
                                <Mail size={16} className="text-muted" />
                                <span className="value-sub" style={{ fontWeight: '700' }}>{order.user_id?.email}</span>
                            </div>
                            <div className="info-row row-center">
                                <Phone size={16} className="text-muted" />
                                <span className="value-sub">
                                    {maskPhoneNumber(order.address_id?.phoneNumber || order.user_id?.phone)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="sidebar-card">
                        <div className="card-header">
                            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.6rem', borderRadius: '12px' }}>
                                <MapPin size={20} className="text-blue-600" />
                            </div>
                            <h3>Shipping Destination</h3>
                        </div>
                        <div className="card-content">
                            <p className="address-text" style={{ fontSize: '1rem', lineHeight: '1.6' }}>
                                <span style={{ display: 'block', marginBottom: '0.4rem' }}>{order.address_id?.street}</span>
                                <span style={{ color: 'var(--text-secondary)' }}>
                                    {order.address_id?.city}, {order.address_id?.state}<br />
                                    {order.address_id?.zipCode}, {order.address_id?.country}
                                </span>
                            </p>
                            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '10px', fontSize: '0.85rem' }}>
                                <strong style={{ color: 'var(--text-secondary)' }}>Contact:</strong> {maskPhoneNumber(order.address_id?.phoneNumber)}
                            </div>
                        </div>
                    </div>

                    <div className="sidebar-card highlight">
                        <div className="card-header">
                            <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '0.6rem', borderRadius: '12px' }}>
                                <CreditCard size={20} className="text-purple-600" />
                            </div>
                            <h3>Payment Gateway</h3>
                        </div>
                        <div className="card-content">
                            <div className="info-row">
                                <span className="label">Method</span>
                                <span className="value uppercase" style={{ color: 'var(--primary-color)', letterSpacing: '1px' }}>{order.paymentMethod || 'Cash on Delivery'}</span>
                            </div>
                            <div className="info-row status-info" style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span className="label">Status</span>
                                    <span className={`status-badge-mini ${order.status === 'delivered' ? 'delivered' : 'pending'}`}>
                                        {order.status === 'delivered' ? 'Transaction Paid' : 'Payment Pending'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    {order.refundDetails && (
                        <div className="sidebar-card refund-details-card">
                            <div className="card-header" style={{ color: 'var(--status-refunded)' }}>
                                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.6rem', borderRadius: '12px' }}>
                                    <CreditCard size={20} className="text-emerald-600" />
                                </div>
                                <h3>Refund Bank Details</h3>
                            </div>
                            <div className="card-content">
                                <div className="info-row">
                                    <span className="label">Account Name</span>
                                    <span className="value">{order.refundDetails.accountName}</span>
                                </div>
                                <div className="info-row">
                                    <span className="label">Bank Name</span>
                                    <span className="value">{order.refundDetails.bankName}</span>
                                </div>
                                <div className="info-row">
                                    <span className="label">Account No.</span>
                                    <span className="value">{order.refundDetails.accountNumber}</span>
                                </div>
                                <div className="info-row">
                                    <span className="label">IFSC Code</span>
                                    <span className="value uppercase">{order.refundDetails.ifscCode}</span>
                                </div>
                                <div className="info-row" style={{ marginTop: '0.5rem', fontSize: '0.75rem', opacity: 0.6 }}>
                                    <span>Submitted on {new Date(order.refundDetails.submittedAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    )}
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
                                            <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-primary)' }}>{item.book_id?.title || 'Deleted Book'}</h4>
                                            <span style={{ fontWeight: '700', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>₹{item.priceAtOrder.toLocaleString('en-IN', { minimumFractionDigits: 2 })} / unit</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
                                            <div className="qty-info" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quantity</span>
                                                <span style={{
                                                    background: 'var(--bg-secondary)',
                                                    padding: '0.35rem 0.75rem',
                                                    borderRadius: '10px',
                                                    fontWeight: '800',
                                                    fontSize: '1rem',
                                                    color: 'var(--primary-color)',
                                                    border: '1px solid var(--border-color)'
                                                }}>× {item.quantity}</span>
                                            </div>
                                            <div className="item-total" style={{ textAlign: 'right' }}>
                                                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Item Subtotal</p>
                                                <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900', color: 'var(--text-primary)' }}>₹{(item.priceAtOrder * item.quantity).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Grand Summary Card */}
                    <div className="grand-summary-card" style={{
                        marginTop: '2rem',
                        background: 'linear-gradient(135deg, var(--card-bg), var(--bg-secondary))',
                        borderRadius: '24px',
                        padding: '2rem',
                        border: '1px solid var(--border-color)',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)'
                    }}>
                        <div className="summary-details">
                            <div className="row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                                <span>Cart Subtotal</span>
                                <span>₹{displayItems.reduce((sum, item) => sum + (item.priceAtOrder * item.quantity), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                                <span>Shipping & Handling</span>
                                <span className={order.deliveryFee === 0 ? 'free' : ''} style={{ color: order.deliveryFee === 0 ? '#10b981' : 'inherit' }}>
                                    {order.deliveryFee === 0 ? 'FREE' : `₹${order.deliveryFee.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                                </span>
                            </div>
                        </div>
                        <div className="divider" style={{ height: '1px', background: 'var(--border-color)', marginBottom: '1.5rem' }}></div>
                        <div className="final-total" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                            <div className="total-label-group">
                                <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Grand Total</h3>
                                <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Net payable amount inclusive of tax</p>
                            </div>
                            <span className="total-value" style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--primary-color)', letterSpacing: '-0.5px' }}>
                                ₹{(displayItems.reduce((sum, item) => sum + (item.priceAtOrder * item.quantity), 0) + order.deliveryFee).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminOrderDetailsPage;
