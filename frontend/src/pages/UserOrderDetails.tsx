import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
import { getOrderDetails, requestReturn, downloadInvoice, submitRefundDetails } from '../services/userOrderService';
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
            addedBy?: {
                _id: string;
                name: string;
            };
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
    exchangeImageUrl?: string;
    refundDetails?: {
        accountName: string;
        bankName: string;
        accountNumber: string;
        ifscCode: string;
        submittedAt: string;
    };
}

const UserOrderDetails: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();
    const { search } = useLocation();
    const queryParams = new URLSearchParams(search);
    const bookId = queryParams.get('bookId');

    const [order, setOrder] = useState<OrderDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false);
    const [selectedReason, setSelectedReason] = useState('');
    const [exchangeReason, setExchangeReason] = useState('');
    const [exchangeImage, setExchangeImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isSubmittingExchange, setIsSubmittingExchange] = useState(false);
    const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
    const [refundForm, setRefundForm] = useState({
        accountName: '',
        bankName: '',
        accountNumber: '',
        ifscCode: ''
    });
    const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);

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

    const isRefundFormValid = () => {
        const { accountName, bankName, accountNumber, ifscCode } = refundForm;
        const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
        const isAccountNumberValid = /^\d{9,18}$/.test(accountNumber);
        return (
            accountName.trim().length >= 3 &&
            bankName.trim().length >= 3 &&
            isAccountNumberValid &&
            ifscRegex.test(ifscCode)
        );
    };

    const handleRefundSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!order || !orderId) return;

        setIsSubmittingRefund(true);
        try {
            await submitRefundDetails(orderId, refundForm);
            toast.success('Refund details submitted successfully');
            setIsRefundModalOpen(false);
            fetchOrderDetails(orderId);
        } catch (error: any) {
            toast.error(error || 'Failed to submit refund details');
        } finally {
            setIsSubmittingRefund(false);
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
            if (!exchangeImage) {
                toast.error('Please upload proof (image) for the exchange request');
                setIsSubmittingExchange(false);
                return;
            }
            formData.append('image', exchangeImage);

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

    const getStatusSteps = (order: OrderDetails, hasReturnRequest: boolean) => {
        const currentStatus = order.status;
        const formatDate = (date: string | undefined) => {
            if (!date) return '';
            return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        };

        if (currentStatus === 'cancelled') {
            return [{ id: 'cancelled', label: 'Cancelled', icon: AlertCircle, isError: true, isCompleted: false, isActive: false, showToday: false }];
        }

        if (currentStatus === 'return_rejected') {
            return [{ id: 'return_rejected', label: 'Exchange Rejected', icon: AlertCircle, isError: true, isCompleted: true, isActive: true, showToday: false }];
        }

        const standardSteps = [
            { id: 'pending', label: `Placed on ${formatDate(order.createdAt)}`, icon: ShoppingBag, date: order.createdAt },
            { id: 'processing', label: 'Processing', icon: Box, date: '' },
            { id: 'shipped', label: 'Shipped', icon: Truck, date: '' },
            { id: 'delivered', label: order.deliveredAt ? `Delivered on ${formatDate(order.deliveredAt)}` : 'Delivered', icon: CheckCircle2, date: order.deliveredAt },
        ];

        const isRefundPath = ['refund_initiated', 'refunded'].includes(currentStatus);

        const exchangeSteps = [
            { id: 'return_requested', label: `Requested on ${formatDate(order.returnReason ? order.updatedAt : '')}`, icon: RotateCcw, date: order.updatedAt },
            { id: 'return_accepted', label: 'Accepted', icon: CheckCircle2, date: '' },
            { id: 'returned', label: 'Item Received', icon: Box, date: '' },
            ...(isRefundPath ? [
                { id: 'refund_initiated', label: 'Refund Init', icon: AlertCircle, date: '' },
                { id: 'refunded', label: 'Refunded', icon: CheckCircle2, date: '' },
            ] : [
                { id: 'processing', label: 'Processed', icon: Box, date: '' },
                { id: 'shipped', label: 'Shipped', icon: Truck, date: '' },
                { id: 'delivered', label: order.deliveredAt ? `Delivered on ${formatDate(order.deliveredAt)}` : 'Delivered', icon: CheckCircle2, date: order.deliveredAt },
            ])
        ];

        const steps = hasReturnRequest ? exchangeSteps : standardSteps;

        const statusMap: Record<string, number> = hasReturnRequest ? {
            'return_requested': 0,
            'return_accepted': 1,
            'returned': 2,
            'refund_initiated': 3,
            'refunded': 4,
            'processing': 3,
            'shipped': 4,
            'delivered': 5
        } : {
            'pending': 0,
            'processing': 1,
            'shipped': 2,
            'delivered': 3
        };

        // If it's refund path, adjust indices for processing/shipped if they were somehow reachable (they shouldn't be)
        // But the current status is what matters.
        const statusIndex = statusMap[currentStatus] ?? -1;

        return steps.map((step: any, index: number) => {
            const isCompleted = index <= statusIndex;
            const isActive = index === statusIndex;

            let showToday = false;
            if (isActive && step.date) {
                const stepDate = new Date(step.date);
                const now = new Date();
                const diff = now.getTime() - stepDate.getTime();
                showToday = diff < 24 * 60 * 60 * 1000;
            }

            return {
                ...step,
                isCompleted,
                isActive,
                isError: false,
                showToday
            };
        });
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

    // Filter items if bookId is provided
    const displayItems = bookId
        ? order.items.filter(item => item.book_id?._id === bookId)
        : order.items;

    const steps = getStatusSteps(order, !!order.returnReason);

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
                            <h1>#{order._id.slice(-8).toUpperCase()}</h1>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="download-invoice-btn-mini"
                                onClick={async () => {
                                    try {
                                        await downloadInvoice(order._id);
                                    } catch (err) {
                                        console.error('Invoice download failed:', err);
                                    }
                                }}
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
                                    {step.showToday && <span className="current-badge">Today</span>}
                                </div>
                                {idx < steps.length - 1 && <div className="step-connector"></div>}
                            </div>
                        ))}
                    </div>
                </div>
            </motion.section>

            <div className="details-main-grid">
                <div className="grid-left-col">
                    {/* Order Items - Individual Cards */}
                    {displayItems.map((item, idx) => (
                        <motion.section
                            key={idx}
                            className="order-items-listing-individual mb-6"
                            variants={itemVariants}
                        >
                            <div className="section-card-premium">
                                <div className="card-header-with-icon card-header-between">
                                    <div className="header-title-group">
                                        <Package size={22} />
                                        <h2>Item {idx + 1}</h2>
                                    </div>
                                    <div className="seller-badge-premium">
                                        <ShoppingBag size={14} />
                                        <span>Managed By: {item.book_id?.addedBy?.name || 'Unknown'}</span>
                                    </div>
                                </div>
                                <div className="items-stack-details">
                                    <div className="order-item-row-premium item-row-no-border">
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
                                            <div className="author-row author-row-styled">
                                                <span>Author: {item.book_id?.author || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.section>
                    ))}
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
                                <div className="address-phone-row address-phone-row-styled">
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
                                    <span className="value">₹{displayItems.reduce((sum, item) => sum + (item.priceAtOrder * item.quantity), 0).toFixed(2)}</span>
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
                                    <span className="value">₹{(displayItems.reduce((sum, item) => sum + (item.priceAtOrder * item.quantity), 0) + order.deliveryFee).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Exchange Order Button */}
                        {isExchangeAvailable() && (
                            <div className="exchange-section-premium exchange-section-wrapper">
                                <motion.button
                                    className="exchange-order-btn-premium exchange-order-btn-styled"
                                    onClick={() => setIsExchangeModalOpen(true)}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <RotateCcw size={18} />
                                    <span>Exchange Order</span>
                                </motion.button>
                                <p className="exchange-policy-hint exchange-policy-hint-styled">
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

                        {order.status === 'refund_initiated' && (
                            <div className="return-status-box warning status-box-warning">
                                <AlertCircle size={20} color="#f59e0b" />
                                <div>
                                    <h4 className="text-warning-dark">Refund Initiated (Out of Stock)</h4>
                                    <p>The item you requested for exchange is currently out of stock. We have initiated a refund for your order.</p>
                                    {!order.refundDetails ? (
                                        <button
                                            className="refund-action-btn mt-3 p-3 btn-primary text-white br-8 cursor-pointer font-semibold text-sm shadow-sm"
                                            onClick={() => setIsRefundModalOpen(true)}
                                        >
                                            Provide Bank Details for Refund
                                        </button>
                                    ) : (
                                        <div className="mt-3 text-sm text-success-dark flex-items-center gap-2 font-semibold">
                                            <CheckCircle2 size={16} />
                                            Bank details submitted. Awaiting processing.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {order.status === 'refunded' && (
                            <div className="return-status-box success status-box-success">
                                <CheckCircle2 size={20} color="#10b981" />
                                <div>
                                    <h4 className="text-success-dark">Refund Completed</h4>
                                    <p>Your refund has been processed successfully. Please check your bank account for the credit.</p>
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
                                <div className="modal-body modal-body-scrollable">
                                    <div className="exchange-policy-alert exchange-policy-alert-styled">
                                        <div className="alert-content-flex">
                                            <WarningIcon size={20} color="var(--primary-color)" />
                                            <p className="alert-text-styled">
                                                <strong>Exchange Policy:</strong> Available for damaged books, missing pages, or print errors within 7 days of delivery.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="form-group form-group-mb">
                                        <label className="form-label-styled">Select Reason <span className="required-star">*</span></label>
                                        <select
                                            value={selectedReason}
                                            onChange={(e) => {
                                                setSelectedReason(e.target.value);
                                                if (e.target.value !== 'Others') setExchangeReason('');
                                            }}
                                            required
                                            className="exchange-reason-select exchange-reason-select-styled"
                                        >
                                            <option value="" disabled>Select a reason...</option>
                                            <option value="Damaged Book">Damaged Book</option>
                                            <option value="Pages Missing">Pages Missing</option>
                                            <option value="Print Error">Print Error</option>
                                            <option value="Others">Others</option>
                                        </select>
                                    </div>

                                    {selectedReason === 'Others' && (
                                        <div className="form-group form-group-mb">
                                            <label className="form-label-styled">Describe Reason <span className="required-star">*</span></label>
                                            <textarea
                                                value={exchangeReason}
                                                onChange={(e) => setExchangeReason(e.target.value)}
                                                placeholder="Please provide more details..."
                                                required
                                                className="return-reason-input return-reason-input-styled"
                                                rows={3}
                                            />
                                        </div>
                                    )}

                                    <div className="form-group">
                                        <label className="form-label-styled">Upload Proof <span className="required-star">*</span></label>
                                        <div
                                            className={`image-upload-wrapper image-upload-wrapper-styled ${imagePreview ? 'has-preview' : ''}`}
                                            onClick={() => document.getElementById('exchange-image-input')?.click()}
                                        >
                                            {imagePreview ? (
                                                <div className="preview-container">
                                                    <img
                                                        src={imagePreview}
                                                        alt="Proof Preview"
                                                        className="preview-image-styled"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setExchangeImage(null);
                                                            setImagePreview(null);
                                                        }}
                                                        className="remove-image-btn"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="upload-placeholder">
                                                    <Upload size={32} />
                                                    <span className="upload-text-main">Click to upload an image of the issue</span>
                                                    <span className="upload-text-sub">JPG, PNG or WEBP (Max 5MB)</span>
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
                                <div className="modal-actions modal-actions-styled">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsExchangeModalOpen(false);
                                            resetExchangeForm();
                                        }}
                                        className="cancel-btn cancel-btn-styled"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className={`submit-btn-premium submit-btn-styled ${(isSubmittingExchange || !selectedReason || (selectedReason === 'Others' && !exchangeReason) || !exchangeImage) ? 'submit-btn-disabled' : 'submit-btn-active'}`}
                                        disabled={isSubmittingExchange || !selectedReason || (selectedReason === 'Others' && !exchangeReason) || !exchangeImage}
                                    >
                                        {isSubmittingExchange ? 'Submitting...' : 'Submit Request'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Refund Details Modal */}
            <AnimatePresence>
                {isRefundModalOpen && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsRefundModalOpen(false)}
                    >
                        <motion.div
                            className="modal-content-premium refund-modal-size max-w-450"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <form onSubmit={handleRefundSubmit}>
                                <div className="modal-header">
                                    <h3>Bank Details for Refund</h3>
                                    <button type="button" onClick={() => setIsRefundModalOpen(false)} className="close-btn">
                                        <X size={24} />
                                    </button>
                                </div>
                                <div className="modal-body modal-body-scrollable">
                                    <p className="mb-2 text-secondary text-xs line-height-1-3">
                                        Please provide accurate bank details so we can process your refund as quickly as possible.
                                    </p>

                                    <div className="form-group form-group-mb">
                                        <label className="form-label-styled">Account Holder Name <span className="required-star">*</span></label>
                                        <input
                                            type="text"
                                            className="exchange-reason-select-styled"
                                            placeholder="e.g. Rahul Kumar"
                                            required
                                            value={refundForm.accountName}
                                            onChange={(e) => setRefundForm({ ...refundForm, accountName: e.target.value })}
                                        />
                                    </div>

                                    <div className="form-group form-group-mb">
                                        <label className="form-label-styled">Bank Name <span className="required-star">*</span></label>
                                        <input
                                            type="text"
                                            className="exchange-reason-select-styled"
                                            placeholder="e.g. State Bank of India"
                                            required
                                            value={refundForm.bankName}
                                            onChange={(e) => setRefundForm({ ...refundForm, bankName: e.target.value })}
                                        />
                                    </div>

                                    <div className="form-group form-group-mb">
                                        <label className="form-label-styled">Account Number <span className="required-star">*</span></label>
                                        <input
                                            type="text"
                                            className="exchange-reason-select-styled"
                                            placeholder="0000 0000 0000 0000"
                                            required
                                            value={refundForm.accountNumber}
                                            onChange={(e) => setRefundForm({ ...refundForm, accountNumber: e.target.value })}
                                        />
                                        {refundForm.accountNumber && !/^\d{9,18}$/.test(refundForm.accountNumber) && (
                                            <span className="validation-error">9-18 digit numeric account number required</span>
                                        )}
                                    </div>

                                    <div className="form-group form-group-mb">
                                        <label className="form-label-styled">IFSC Code <span className="required-star">*</span></label>
                                        <input
                                            type="text"
                                            className="exchange-reason-select-styled uppercase"
                                            placeholder="e.g. SBIN0001234"
                                            required
                                            value={refundForm.ifscCode}
                                            onChange={(e) => setRefundForm({ ...refundForm, ifscCode: e.target.value.toUpperCase() })}
                                        />
                                        {refundForm.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(refundForm.ifscCode) && (
                                            <span className="validation-error">Invalid IFSC format (e.g. SBIN0001234)</span>
                                        )}
                                    </div>
                                </div>
                                <div className="modal-footer p-6 pt-0">
                                    <button
                                        type="submit"
                                        className={`submit-exchange-btn submit-btn-styled w-full ${(!isRefundFormValid() || isSubmittingRefund) ? 'submit-btn-disabled cursor-not-allowed' : 'submit-btn-active cursor-pointer'}`}
                                        disabled={!isRefundFormValid() || isSubmittingRefund}
                                    >
                                        {isSubmittingRefund ? 'Submitting...' : 'Submit Refund Details'}
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
