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
    Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getOrderDetails, requestReturn } from '../services/userOrderService';
import { generateInvoice } from '../utils/invoiceGenerator';
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
    estimatedDeliveryDate?: string;
    returnReason?: string;
}

const UserOrderDetails: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();
    const [order, setOrder] = useState<OrderDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
    const [returnReason, setReturnReason] = useState('');
    const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

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

    const handleReturnSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!order) return;
        setIsSubmittingReturn(true);
        try {
            await requestReturn(order._id, returnReason);
            toast.success('Return request submitted successfully');
            setIsReturnModalOpen(false);
            fetchOrderDetails(order._id);
        } catch (error: any) {
            toast.error(error || 'Failed to submit return request');
        } finally {
            setIsSubmittingReturn(false);
        }
    };

    const getStatusSteps = (currentStatus: string) => {
        const steps = [
            { id: 'pending', label: 'Order Placed', icon: ShoppingBag },
            { id: 'processing', label: 'Processing', icon: Box },
            { id: 'shipped', label: 'Shipped', icon: Truck },
            { id: 'delivered', label: 'Delivered', icon: CheckCircle2 },
        ];

        if (currentStatus === 'cancelled') {
            return [{ id: 'cancelled', label: 'Cancelled', icon: AlertCircle, isError: true, isCompleted: false, isActive: false }];
        }

        const statusIndex = steps.findIndex(s => s.id === currentStatus);
        return steps.map((step, index) => ({
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

    if (isLoading) return <Loader />;
    if (!order) return <div className="order-not-found-view">Order not found</div>;

    const steps = getStatusSteps(order.status);

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
                                onClick={() => generateInvoice(order)}
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
                        {steps.map((step, idx) => (
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

                        {/* Return Order Button */}
                        {order.status === OrderStatus.DELIVERED && (
                            <motion.button
                                className="return-order-btn-premium"
                                onClick={() => setIsReturnModalOpen(true)}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <RotateCcw size={18} />
                                <span>Request Return</span>
                            </motion.button>
                        )}

                        {/* Return Status Info */}
                        {order.status === OrderStatus.RETURN_REQUESTED && (
                            <div className="return-status-box pending">
                                <RotateCcw size={20} />
                                <div>
                                    <h4>Return Requested</h4>
                                    <p>Your return request is being reviewed by our team.</p>
                                </div>
                            </div>
                        )}

                        {order.status === OrderStatus.RETURNED && (
                            <div className="return-status-box success">
                                <CheckCircle2 size={20} />
                                <div>
                                    <h4>Return Request Accepted</h4>
                                    <p>This order has been successfully returned.</p>
                                </div>
                            </div>
                        )}

                        {order.status === OrderStatus.RETURN_REJECTED && (
                            <div className="return-status-box warning">
                                <AlertCircle size={20} />
                                <div>
                                    <h4>Return Request Declined</h4>
                                    <p>Your request for return has been reviewed and declined. Please contact support if you have any questions.</p>
                                </div>
                            </div>
                        )}
                    </motion.section>
                </div>
            </div>

            {/* Return Modal */}
            <AnimatePresence>
                {isReturnModalOpen && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsReturnModalOpen(false)}
                    >
                        <motion.div
                            className="modal-content-premium"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h3>Request Return</h3>
                                <button onClick={() => setIsReturnModalOpen(false)} className="close-btn">
                                    <X size={24} />
                                </button>
                            </div>
                            <form onSubmit={handleReturnSubmit}>
                                <div className="modal-body">
                                    <p>Please tell us why you want to return this order:</p>
                                    <textarea
                                        value={returnReason}
                                        onChange={(e) => setReturnReason(e.target.value)}
                                        placeholder="Reason for return..."
                                        required
                                        className="return-reason-input"
                                        rows={4}
                                    />
                                </div>
                                <div className="modal-actions">
                                    <button type="button" onClick={() => setIsReturnModalOpen(false)} className="cancel-btn">
                                        Cancel
                                    </button>
                                    <button type="submit" className="submit-btn-premium" disabled={isSubmittingReturn}>
                                        {isSubmittingReturn ? 'Submitting...' : 'Submit Request'}
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
