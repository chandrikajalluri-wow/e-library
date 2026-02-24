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
            toast.error(error);
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
    if (!order) return <div className="p-8 text-center text-lg">Order not found</div>;

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
                    <div className="order-id-display cursor-pointer" onClick={() => {
                        navigator.clipboard.writeText(order._id);
                        toast.info('Order ID copied to clipboard');
                    }} title="Click to copy Order ID">
                        <Package size={20} className="text-indigo-600" />
                        <span>Order #{order._id.slice(-8).toUpperCase()}</span>
                    </div>
                </div>

                <div className="topbar-right">
                    {order.user_id?.membership_id?.name === 'premium' && (order.status === 'pending' || order.status === 'processing') && (
                        <div className="mr-4">
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
                <div className="exchange-details-card saas-reveal exchange-details-card-highlight">
                    <div className="exchange-card-header">
                        <div className="header-label">
                            <div className="header-accent-bg">
                                <ExchangeIcon size={20} className="icon-pulse text-amber-600" />
                            </div>
                            <span className="header-label-text">Exchange Request</span>
                        </div>
                        <div className={`status-badge-premium ${order.status} m-0`}>
                            {order.status === 'return_requested' ? 'Exchange Pending' :
                                order.status === 'return_accepted' ? 'Accepted' :
                                    order.status === 'returned' ? 'Exchanged' :
                                        order.status === 'return_rejected' ? 'Rejected' :
                                            order.status}
                        </div>
                    </div>

                    <div className="exchange-card-content exchange-card-content-premium">
                        <div className="reason-section">
                            <span className="section-label section-label-muted">Reason for exchange</span>
                            <p className="reason-text-main reason-text-highlight">"{order.returnReason}"</p>
                        </div>

                        {order.exchangeImageUrl && (
                            <div className="proof-section-premium proof-section-bordered">
                                <span className="section-label section-label-muted">Photographic Evidence</span>
                                <div
                                    className="proof-card-mini proof-card-mini-custom"
                                    onClick={() => setPreviewImage(order.exchangeImageUrl!)}
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
            <div className="compact-stepper-container mb-8">
                <div className="stepper-track">
                    {!order.returnReason ? (
                        // Standard Flow
                        <>
                            <div className={`stepper-step ${currentStep >= 1 ? 'active' : ''}`}>
                                <div className="step-dot stepper-dot-l"><div className="dot-inner stepper-dot-inner-l"></div></div>
                                <span className="step-label">Order Placed</span>
                                <span className="stepper-label-sub">{orderDate.toLocaleDateString()}</span>
                            </div>
                            <div className={`stepper-line ${currentStep >= 2 ? 'active' : ''} stepper-line-offset`}></div>
                            <div className={`stepper-step ${currentStep >= 2 ? 'active' : ''}`}>
                                <div className="step-dot stepper-dot-l"><div className="dot-inner stepper-dot-inner-l"></div></div>
                                <span className="step-label">Processing</span>
                            </div>
                            <div className={`stepper-line ${currentStep >= 3 ? 'active' : ''} stepper-line-offset`}></div>
                            <div className={`stepper-step ${currentStep >= 3 ? 'active' : ''}`}>
                                <div className="step-dot stepper-dot-l"><div className="dot-inner stepper-dot-inner-l"></div></div>
                                <span className="step-label">Shipped</span>
                            </div>
                            <div className={`stepper-line ${currentStep >= 4 ? 'active' : ''} stepper-line-offset`}></div>
                            <div className={`stepper-step ${currentStep >= 4 ? 'active' : ''}`}>
                                <div className="step-dot stepper-dot-l"><div className="dot-inner stepper-dot-inner-l"></div></div>
                                <span className="step-label">Delivered</span>
                            </div>
                            {order.status === 'cancelled' && (
                                <>
                                    <div className="stepper-line cancelled stepper-line-offset"></div>
                                    <div className="stepper-step active cancelled">
                                        <div className="step-dot stepper-dot-l"><XCircle size={14} /></div>
                                        <span className="step-label">Cancelled</span>
                                    </div>
                                </>
                            )}
                        </>
                    ) : (
                        // Detailed Exchange Flow
                        <>
                            <div className={`stepper-step ${['return_requested', 'return_accepted', 'returned', 'refund_initiated', 'refunded', 'processing', 'shipped', 'delivered'].includes(order.status) ? 'active' : ''}`}>
                                <div className="step-dot stepper-dot-l"><div className="dot-inner stepper-dot-inner-l"></div></div>
                                <span className="step-label">Request</span>
                            </div>
                            <div className={`stepper-line ${['return_accepted', 'returned', 'processing', 'shipped', 'delivered'].includes(order.status) ? 'active' : ''} stepper-line-offset`}></div>

                            <div className={`stepper-step ${['return_accepted', 'returned', 'refund_initiated', 'refunded', 'processing', 'shipped', 'delivered'].includes(order.status) ? 'active' : ''}`}>
                                <div className="step-dot stepper-dot-l"><div className="dot-inner stepper-dot-inner-l"></div></div>
                                <span className="step-label">Approved</span>
                            </div>
                            <div className={`stepper-line ${['returned', 'refund_initiated', 'refunded', 'processing', 'shipped', 'delivered'].includes(order.status) ? 'active' : ''} stepper-line-offset`}></div>

                            <div className={`stepper-step ${['returned', 'refund_initiated', 'refunded', 'processing', 'shipped', 'delivered'].includes(order.status) ? 'active' : ''}`}>
                                <div className="step-dot stepper-dot-l"><div className="dot-inner stepper-dot-inner-l"></div></div>
                                <span className="step-label">Item In</span>
                            </div>
                            <div className={`stepper-line ${['refund_initiated', 'refunded', 'processing', 'shipped', 'delivered'].includes(order.status) ? 'active' : ''} stepper-line-offset`}></div>

                            {['refund_initiated', 'refunded'].includes(order.status) ? (
                                <>
                                    <div className={`stepper-step ${['refund_initiated', 'refunded'].includes(order.status) ? 'active' : ''}`}>
                                        <div className="step-dot stepper-dot-l"><div className="dot-inner stepper-dot-inner-l"></div></div>
                                        <span className="step-label">Refund Init</span>
                                    </div>
                                    <div className={`stepper-line ${order.status === 'refunded' ? 'active' : ''} stepper-line-offset`}></div>
                                    <div className={`stepper-step ${order.status === 'refunded' ? 'active' : ''}`}>
                                        <div className="step-dot stepper-dot-l"><div className="dot-inner stepper-dot-inner-l"></div></div>
                                        <span className="step-label">Refunded</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className={`stepper-step ${['processing', 'shipped', 'delivered'].includes(order.status) ? 'active' : ''}`}>
                                        <div className="step-dot stepper-dot-l"><div className="dot-inner stepper-dot-inner-l"></div></div>
                                        <span className="step-label">Packed</span>
                                    </div>
                                    <div className={`stepper-line ${['shipped', 'delivered'].includes(order.status) ? 'active' : ''} stepper-line-offset`}></div>

                                    <div className={`stepper-step ${['shipped', 'delivered'].includes(order.status) ? 'active' : ''}`}>
                                        <div className="step-dot stepper-dot-l"><div className="dot-inner stepper-dot-inner-l"></div></div>
                                        <span className="step-label">Transit</span>
                                    </div>
                                    <div className={`stepper-line ${['delivered'].includes(order.status) ? 'active' : ''} stepper-line-offset`}></div>

                                    <div className={`stepper-step ${['delivered'].includes(order.status) ? 'active' : ''}`}>
                                        <div className="step-dot stepper-dot-l"><div className="dot-inner stepper-dot-inner-l"></div></div>
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
                            <div className="sidebar-card-accent-bg">
                                <User size={20} className="text-indigo-600" />
                            </div>
                            <h3>Customer Profile</h3>
                        </div>
                        <div className="card-content">
                            <div className="info-row">
                                <span className="label">Full Name</span>
                                <span className="value info-row-large-value">{order.user_id?.name}</span>
                            </div>
                            <div className="info-row row-center info-row-mt-2">
                                <Mail size={16} className="text-muted" />
                                <span className="value-sub info-row-font-700">{order.user_id?.email}</span>
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
                            <div className="sidebar-card-accent-bg-blue">
                                <MapPin size={20} className="text-blue-600" />
                            </div>
                            <h3>Shipping Destination</h3>
                        </div>
                        <div className="card-content">
                            <p className="address-text line-height-1-6">
                                <span className="display-block mb-1">{order.address_id?.street}</span>
                                <span className="text-secondary">
                                    {order.address_id?.city}, {order.address_id?.state}<br />
                                    {order.address_id?.zipCode}, {order.address_id?.country}
                                </span>
                            </p>
                            <div className="mt-3 p-3 bg-secondary br-10 text-xs">
                                <strong className="text-secondary">Contact:</strong> {maskPhoneNumber(order.address_id?.phoneNumber)}
                            </div>
                        </div>
                    </div>

                    <div className="sidebar-card highlight">
                        <div className="card-header">
                            <div className="sidebar-card-accent-bg-purple">
                                <CreditCard size={20} className="text-purple-600" />
                            </div>
                            <h3>Payment Gateway</h3>
                        </div>
                        <div className="card-content">
                            <div className="info-row">
                                <span className="label">Method</span>
                                <span className="value uppercase text-primary letter-spacing-1">{order.paymentMethod || 'Cash on Delivery'}</span>
                            </div>
                            <div className="info-row status-info info-row-border-t">
                                <div className="flex-between">
                                    <span className="label">Status</span>
                                    {(() => {
                                        if (order.status === 'refunded') return <span className="status-badge-mini delivered">Refunded</span>;
                                        if (order.status === 'refund_initiated') return <span className="status-badge-mini pending">Refund Initiated</span>;

                                        const isPaid = order.status === 'delivered' ||
                                            !!order.returnReason ||
                                            ['return_requested', 'return_accepted', 'returned'].includes(order.status);

                                        return (
                                            <span className={`status-badge-mini ${isPaid ? 'delivered' : 'pending'}`}>
                                                {isPaid ? 'Transaction Paid' : 'Payment Pending'}
                                            </span>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
                    {order.refundDetails && (
                        <div className="sidebar-card refund-details-card">
                            <div className="card-header text-success-dark">
                                <div className="sidebar-card-accent-bg-emerald">
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
                                <div className="info-row mt-2 text-xs opacity-60">
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
                    <div className="items-cards-column item-card-column-gap">
                        {displayItems.map((item, idx) => (
                            <div className="admin-item-card-premium item-card-premium-p1-5" key={idx}>
                                <div className="card-top-info item-card-header-flex">
                                    <div className="flex-center-row gap-3">
                                        <Package size={20} className="text-indigo-600" />
                                        <h3 className="m-0 text-lg font-extrabold">Item {idx + 1}</h3>
                                    </div>
                                    <div className="seller-badge-admin seller-badge-premium-admin">
                                        <User size={14} />
                                        <span>Managed By: {item.book_id?.addedBy?.name || 'Unknown'}</span>
                                    </div>
                                </div>
                                <div className="item-main-content flex gap-6">
                                    <img
                                        src={item.book_id?.cover_image_url || 'https://via.placeholder.com/150?text=NA'}
                                        alt={item.book_id?.title || 'Book'}
                                        className="item-img-l"
                                    />
                                    <div className="item-details-expanded flex-1">
                                        <div className="flex-between mb-2">
                                            <h4 className="item-title-l">{item.book_id?.title || 'Deleted Book'}</h4>
                                            <span className="item-price-l">₹{item.priceAtOrder.toLocaleString('en-IN', { minimumFractionDigits: 2 })} / unit</span>
                                        </div>
                                        <div className="flex-between items-center mt-6">
                                            <div className="qty-info flex-center-row gap-3">
                                                <span className="text-xs text-muted font-bold uppercase letter-spacing-0-5">Quantity</span>
                                                <span className="item-qty-box">× {item.quantity}</span>
                                            </div>
                                            <div className="item-total text-right">
                                                <p className="m-0 text-xs text-muted font-bold uppercase mb-1">Item Subtotal</p>
                                                <p className="m-0 text-3xl font-black text-primary">₹{(item.priceAtOrder * item.quantity).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Grand Summary Card */}
                    <div className="grand-summary-card summary-card-gradient">
                        <div className="summary-details">
                            <div className="row summary-row-bold">
                                <span>Cart Subtotal</span>
                                <span>₹{displayItems.reduce((sum, item) => sum + (item.priceAtOrder * item.quantity), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="row summary-row-bold-last">
                                <span>Shipping & Handling</span>
                                <span className={`${order.deliveryFee === 0 ? 'free text-success' : ''}`}>
                                    {order.deliveryFee === 0 ? 'FREE' : `₹${order.deliveryFee.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                                </span>
                            </div>
                        </div>
                        <div className="divider summary-divider-l"></div>
                        <div className="final-total summary-final-flex">
                            <div className="total-label-group">
                                <h3 className="m-0 text-xs text-secondary uppercase letter-spacing-1">Grand Total</h3>
                                <p className="mt-1 text-xs text-muted">Net payable amount inclusive of tax</p>
                            </div>
                            <span className="total-value text-3xl font-black text-primary letter-spacing-neg-0-5">
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
