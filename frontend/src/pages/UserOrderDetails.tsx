import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
    ArrowLeft,
    Package,
    MapPin,
    CreditCard,
    CheckCircle2,
    Truck,
    Box,
    AlertCircle,
    ShoppingBag,
    Download,
    RotateCcw,
    X,
    Phone,
    Upload,
    AlertCircle as WarningIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getOrderDetails, requestReturn, downloadInvoice } from '../services/userOrderService';
import { OrderStatus } from '../types/enums';
import Loader from '../components/Loader';
import '../styles/UserOrderDetails.css';

interface OrderDetails {
    _id: string;
    items: {
        book_id: {
            _id: string;
            title: string;
            cover_image_url: string;
            price: number;
            author?: string;
        } | null;
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
    updatedAt: string;
    estimatedDeliveryDate?: string;
    deliveredAt?: string;
    returnReason?: string;
}

const UserOrderDetails: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();
    const [order, setOrder] = useState<OrderDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false);
    const [selectedReason, setSelectedReason] = useState('');
    const [exchangeReason, setExchangeReason] = useState('');
    const [exchangeImage, setExchangeImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isSubmittingExchange, setIsSubmittingExchange] = useState(false);

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
            toast.error(error.response?.data?.error || 'Failed to fetch order details');
            navigate('/my-orders');
        } finally {
            setIsLoading(false);
        }
    };

    const handleExchangeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!order) return;

        setIsSubmittingExchange(true);
        try {
            const finalReason = selectedReason === 'Others' ? exchangeReason : selectedReason;
            if (!finalReason) {
                toast.error('Please provide a reason for exchange');
                setIsSubmittingExchange(false);
                return;
            }

            const formData = new FormData();
            formData.append('reason', finalReason);
            if (exchangeImage) {
                formData.append('image', exchangeImage);
            }

            await requestReturn(order._id, formData);
            toast.success('Exchange request submitted successfully');
            setIsExchangeModalOpen(false);
            resetExchangeForm();
            fetchOrderDetails(order._id);
        } catch (error: any) {
            toast.error(error || 'Failed to submit exchange request');
        } finally {
            setIsSubmittingExchange(false);
        }
    };

    const resetExchangeForm = () => {
        setSelectedReason('');
        setExchangeReason('');
        setExchangeImage(null);
        setImagePreview(null);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Image size should be less than 5MB');
                return;
            }
            setExchangeImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const getStatusSteps = (currentStatus: string, hasReturnRequest: boolean) => {
        if (!hasReturnRequest) {
            // Standard Flow
            const standardSteps = [
                { id: 'pending', label: 'Order Placed', icon: ShoppingBag },
                { id: 'processing', label: 'Processing', icon: Box },
                { id: 'shipped', label: 'Shipped', icon: Truck },
                { id: 'delivered', label: 'Delivered', icon: CheckCircle2 },
            ];

            if (currentStatus === 'cancelled') {
                return [{ id: 'cancelled', label: 'Cancelled', icon: AlertCircle, isError: true, isCompleted: false, isActive: false }];
            }

            const statusIndex = standardSteps.findIndex(s => s.id === currentStatus);
            return standardSteps.map((step, index) => ({
                ...step,
                isCompleted: index <= statusIndex,
                isActive: index === statusIndex,
                isError: false
            }));
        }

        // Detailed Exchange Flow
        const exchangeSteps = [
            { id: 'return_requested', label: 'Exchange Pending', icon: RotateCcw },
            { id: 'return_accepted', label: 'Accepted', icon: CheckCircle2 },
            { id: 'returned', label: 'Item Received', icon: Box },
            { id: 'processing', label: 'Processed', icon: Box },
            { id: 'shipped', label: 'Shipped', icon: Truck },
            { id: 'delivered', label: 'Delivered', icon: CheckCircle2 },
        ];

        if (currentStatus === 'return_rejected') {
            return [{ id: 'return_rejected', label: 'Exchange Rejected', icon: AlertCircle, isError: true, isCompleted: true, isActive: true }];
        }

        // Active index mapping for exchange journey
        const statusMap: Record<string, number> = {
            'return_requested': 0,
            'return_accepted': 1,
            'returned': 2,
            'processing': 3,
            'shipped': 4,
            'delivered': 5
        };

        const statusIndex = statusMap[currentStatus] ?? -1;

        return exchangeSteps.map((step, index) => ({
            ...step,
            isCompleted: index <= statusIndex,
            isActive: index === statusIndex,
            isError: false
        }));
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    const isExchangeAvailable = () => {
        if (!order || order.status !== OrderStatus.DELIVERED) return false;

        // Fallback: If deliveredAt is missing (for older orders), use updatedAt or createdAt
        const deliveryDateStr = order.deliveredAt || order.updatedAt || order.createdAt;
        const deliveredAt = new Date(deliveryDateStr);
        const now = new Date();
        const diffInTime = now.getTime() - deliveredAt.getTime();
        const diffInDays = diffInTime / (1000 * 3600 * 24);

        return diffInDays <= 7;
    };

    if (isLoading) return <Loader />;
    if (!order) return <div className="order-not-found-view">Order not found</div>;

    const steps = getStatusSteps(order.status, !!order.returnReason);

    return (
        <motion.div
            className="order-details-container"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            <div className="order-details-header-premium">
                <button onClick={() => navigate('/my-orders')} className="details-back-btn">
                    <ArrowLeft size={20} />
                    <span>Back to Orders</span>
                </button>
                <div className="header-main-info">
                    <div className="id-group">
                        <span className="order-label">ORDER DETAILS</span>
                        <div className="id-header-row">
                            <h1>#{order._id.toUpperCase()}</h1>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="download-invoice-btn-mini"
                                onClick={() => downloadInvoice(order._id)}
                            >
                                <Download size={18} />
                                <span>Invoice</span>
                            </motion.button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Status Tracking Section */}
            <motion.section className="status-tracker-section" variants={itemVariants}>
                <div className="section-card-premium">
                    <div className="timeline-container">
                        {steps.map((step: any, idx: number) => (
                            <div
                                key={step.id}
                                className={`timeline-step ${step.isCompleted ? 'completed' : ''} ${step.isActive ? 'active' : ''} ${step.isError ? 'cancelled' : ''}`}
                            >
                                <div className="step-icon-wrapper">
                                    <step.icon size={24} />
                                </div>
                                <div className="step-info">
                                    <span className="step-label">{step.label}</span>
                                    {step.isActive && <span className="current-badge">Today</span>}
                                </div>
                                {idx < steps.length - 1 && <div className="step-connector"></div>}
                            </div>
                        ))}
                    </div>
                </div>
            </motion.section>

            <div className="details-main-grid">
                <div className="grid-left-col">
                    {/* Order Items */}
                    <motion.section className="order-items-listing" variants={itemVariants}>
                        <div className="section-card-premium">
                            <div className="card-header-with-icon">
                                <Package size={22} />
                                <h2>Shipment Details ({order.items.length} items)</h2>
                            </div>
                            <div className="items-stack-details">
                                {order.items.map((item, idx) => (
                                    <div key={idx} className="order-item-row-premium">
                                        <div className="item-img-box">
                                            <img src={item.book_id?.cover_image_url || 'https://via.placeholder.com/150x225?text=No+Cover'} alt={item.book_id?.title || 'Deleted Book'} />
                                        </div>
                                        <div className="item-text-info">
                                            <div className="title-row">
                                                <h4>{item.book_id?.title || 'Deleted Book'}</h4>
                                                <span className="unit-price">₹{item.priceAtOrder.toFixed(2)}</span>
                                            </div>
                                            <div className="quantity-row">
                                                <span>Quantity: {item.quantity}</span>
                                                <span className="row-total">₹{(item.priceAtOrder * item.quantity).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.section>
                </div>

                <div className="grid-right-col">
                    {/* Delivery & Payment Info */}
                    <motion.section className="sidebar-info-section" variants={itemVariants}>
                        <div className="section-card-premium info-card">
                            <div className="card-header-with-icon">
                                <MapPin size={22} />
                                <h2>Delivery Address</h2>
                            </div>
                            <div className="address-display-premium">
                                <div className="delivery-estimate-box">
                                    <span className="estimate-label">Estimated Delivery</span>
                                    <span className="estimate-date">
                                        {order.estimatedDeliveryDate
                                            ? new Date(order.estimatedDeliveryDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                            : 'Calculating...'}
                                    </span>
                                </div>
                                <div className="address-divider"></div>
                                <span className="street-line">{order.address_id?.street}</span>
                                <span className="city-line">{order.address_id?.city}, {order.address_id?.state}</span>
                                <span className="zip-line">{order.address_id?.zipCode}</span>
                                <span className="country-line">{order.address_id?.country}</span>
                                <div className="address-phone-row" style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Phone size={14} />
                                    <span>{order.address_id?.phoneNumber}</span>
                                </div>
                            </div>
                        </div>

                        <div className="section-card-premium info-card">
                            <div className="card-header-with-icon">
                                <CreditCard size={22} />
                                <h2>Payment Method</h2>
                            </div>
                            <p className="payment-value">{order.paymentMethod || 'Cash on Delivery'}</p>
                        </div>

                        {/* Order Summary */}
                        <div className="section-card-premium summary-card-details">
                            <div className="summary-details-stack">
                                <div className="summary-line">
                                    <span className="label">Subtotal</span>
                                    <span className="value">₹{order.items.reduce((sum, item) => sum + (item.priceAtOrder * item.quantity), 0).toFixed(2)}</span>
                                </div>
                                <div className="summary-line">
                                    <span className="label">Delivery Fee</span>
                                    <span className={`value ${order.deliveryFee === 0 ? 'free-text' : ''}`}>
                                        {order.deliveryFee > 0 ? `₹${order.deliveryFee.toFixed(2)}` : 'FREE'}
                                    </span>
                                </div>
                                <div className="summary-divider"></div>
                                <div className="summary-line final-total">
                                    <span className="label">Total Amount</span>
                                    <span className="value">₹{order.totalAmount.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Exchange Order Button */}
                        {isExchangeAvailable() && (
                            <div className="exchange-section-premium" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <motion.button
                                    className="exchange-order-btn-premium"
                                    onClick={() => setIsExchangeModalOpen(true)}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.75rem',
                                        padding: '1rem',
                                        background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontWeight: '600',
                                        width: '100%',
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
                                    }}
                                >
                                    <RotateCcw size={18} />
                                    <span>Exchange Order</span>
                                </motion.button>
                                <p className="exchange-policy-hint" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', margin: 0, fontStyle: 'italic' }}>
                                    Only 7 days exchange available for damaged, missing pages, or print error books only.
                                </p>
                            </div>
                        )}

                        {/* Exchange Status Info */}
                        {order.status === 'return_requested' && (
                            <div className="return-status-box pending">
                                <RotateCcw size={20} />
                                <div>
                                    <h4>Exchange Pending</h4>
                                    <p>Your exchange request is being reviewed by our team.</p>
                                </div>
                            </div>
                        )}

                        {order.status === 'return_accepted' && (
                            <div className="return-status-box success">
                                <CheckCircle2 size={20} />
                                <div>
                                    <h4>Request Accepted</h4>
                                    <p>Your exchange request has been approved! We are waiting to receive your item.</p>
                                </div>
                            </div>
                        )}

                        {order.status === 'returned' && (
                            <div className="return-status-box success">
                                <Box size={20} />
                                <div>
                                    <h4>Item Received</h4>
                                    <p>We've received your item and are now processing the exchange.</p>
                                </div>
                            </div>
                        )}

                        {['processing', 'shipped', 'delivered'].includes(order.status) && order.returnReason && (
                            <div className="return-status-box success">
                                <Truck size={20} />
                                <div>
                                    <h4>Exchange Processed</h4>
                                    <p>Your replacement item is on its way!</p>
                                </div>
                            </div>
                        )}

                        {order.status === 'return_rejected' && (
                            <div className="return-status-box warning">
                                <AlertCircle size={20} />
                                <div>
                                    <h4>Exchange Rejected</h4>
                                    <p>Your request for exchange has been reviewed and declined. Please contact support if you have any questions.</p>
                                </div>
                            </div>
                        )}
                    </motion.section>
                </div>
            </div>

            {/* Exchange Modal */}
            <AnimatePresence>
                {isExchangeModalOpen && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsExchangeModalOpen(false)}
                    >
                        <motion.div
                            className="modal-content-premium"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h3>Request Exchange</h3>
                                <button onClick={() => setIsExchangeModalOpen(false)} className="close-btn">
                                    <X size={24} />
                                </button>
                            </div>
                            <form onSubmit={handleExchangeSubmit}>
                                <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', padding: '1.5rem' }}>
                                    <div className="exchange-policy-alert" style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-secondary)', borderLeft: '4px solid var(--primary-color)', borderRadius: '8px' }}>
                                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                                            <WarningIcon size={20} color="var(--primary-color)" />
                                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                                <strong>Exchange Policy:</strong> Available for damaged books, missing pages, or print errors within 7 days of delivery.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-primary)' }}>Select Reason <span style={{ color: 'var(--error-color)' }}>*</span></label>
                                        <select
                                            value={selectedReason}
                                            onChange={(e) => {
                                                setSelectedReason(e.target.value);
                                                if (e.target.value !== 'Others') setExchangeReason('');
                                            }}
                                            required
                                            className="exchange-reason-select"
                                            style={{
                                                width: '100%',
                                                padding: '0.75rem',
                                                borderRadius: '8px',
                                                border: '1px solid var(--border-color)',
                                                background: 'var(--bg-primary)',
                                                color: 'var(--text-primary)',
                                                outline: 'none'
                                            }}
                                        >
                                            <option value="" disabled>Select a reason...</option>
                                            <option value="Damaged Book">Damaged Book</option>
                                            <option value="Pages Missing">Pages Missing</option>
                                            <option value="Print Error">Print Error</option>
                                            <option value="Others">Others</option>
                                        </select>
                                    </div>

                                    {selectedReason === 'Others' && (
                                        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-primary)' }}>Describe Reason <span style={{ color: 'var(--error-color)' }}>*</span></label>
                                            <textarea
                                                value={exchangeReason}
                                                onChange={(e) => setExchangeReason(e.target.value)}
                                                placeholder="Please provide more details..."
                                                required
                                                className="return-reason-input"
                                                rows={3}
                                                style={{
                                                    width: '100%',
                                                    padding: '0.75rem',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--border-color)',
                                                    background: 'var(--bg-primary)',
                                                    color: 'var(--text-primary)',
                                                    outline: 'none',
                                                    resize: 'vertical'
                                                }}
                                            />
                                        </div>
                                    )}

                                    <div className="form-group">
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--text-primary)' }}>Upload Proof (Optional)</label>
                                        <div
                                            className="image-upload-wrapper"
                                            style={{
                                                border: '2px dashed var(--border-color)',
                                                borderRadius: '12px',
                                                padding: '1.5rem',
                                                textAlign: 'center',
                                                cursor: 'pointer',
                                                position: 'relative',
                                                background: imagePreview ? 'transparent' : 'var(--bg-secondary)',
                                                transition: 'all 0.2s ease'
                                            }}
                                            onClick={() => document.getElementById('exchange-image-input')?.click()}
                                        >
                                            {imagePreview ? (
                                                <div style={{ position: 'relative', width: 'fit-content', margin: '0 auto' }}>
                                                    <img
                                                        src={imagePreview}
                                                        alt="Proof Preview"
                                                        style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setExchangeImage(null);
                                                            setImagePreview(null);
                                                        }}
                                                        style={{
                                                            position: 'absolute',
                                                            top: '-10px',
                                                            right: '-10px',
                                                            background: 'var(--error-color)',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '50%',
                                                            width: '24px',
                                                            height: '24px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            cursor: 'pointer',
                                                            fontSize: '14px'
                                                        }}
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                                                    <Upload size={32} />
                                                    <span style={{ fontSize: '0.9rem' }}>Click to upload an image of the issue</span>
                                                    <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>JPG, PNG or WEBP (Max 5MB)</span>
                                                </div>
                                            )}
                                            <input
                                                id="exchange-image-input"
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageChange}
                                                style={{ display: 'none' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-actions" style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsExchangeModalOpen(false);
                                            resetExchangeForm();
                                        }}
                                        className="cancel-btn"
                                        style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="submit-btn-premium"
                                        disabled={isSubmittingExchange || !selectedReason || (selectedReason === 'Others' && !exchangeReason)}
                                        style={{
                                            padding: '0.75rem 2rem',
                                            borderRadius: '8px',
                                            border: 'none',
                                            background: (isSubmittingExchange || !selectedReason || (selectedReason === 'Others' && !exchangeReason)) ? 'var(--text-muted)' : 'var(--primary-color)',
                                            color: 'white',
                                            fontWeight: '600',
                                            cursor: (isSubmittingExchange || !selectedReason || (selectedReason === 'Others' && !exchangeReason)) ? 'not-allowed' : 'pointer',
                                            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
                                        }}
                                    >
                                        {isSubmittingExchange ? 'Submitting...' : 'Submit Request'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default UserOrderDetails;
