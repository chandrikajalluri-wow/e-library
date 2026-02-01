import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Wallet, Check, Package, ShieldCheck, Truck, ShoppingBag } from 'lucide-react';
import { useBorrowCart, type CartItem } from '../context/BorrowCartContext';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { getMyMembership, type Membership } from '../services/membershipService';
import { MembershipName } from '../types/enums';
import '../styles/Checkout.css';

const Checkout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { cartItems: contextCartItems } = useBorrowCart();

    // Use items passed via state, or fall back to full cart
    const cartItems = (location.state?.checkoutItems || contextCartItems) as CartItem[];
    const [membership, setMembership] = React.useState<Membership | null>(null);

    React.useEffect(() => {
        loadMembership();
    }, []);

    const loadMembership = async () => {
        try {
            const data = await getMyMembership();
            setMembership(data);
        } catch (err) {
            console.error('Failed to load membership', err);
        }
    };

    const handleContinue = () => {
        if (availableItems.length === 0) {
            toast.error('No items available for delivery in your cart');
            navigate('/borrow-cart');
            return;
        }
        navigate('/checkout/address', { state: { checkoutItems: availableItems } });
    };

    const availableItems = cartItems.filter(item => item.book.noOfCopies > 0);
    const totalItems = availableItems.reduce((acc, item) => acc + item.quantity, 0);

    // Calculate financial summary
    const subtotal = availableItems.reduce((acc, item) => acc + (item.book.price * item.quantity), 0);
    const isPremium = membership?.name === 'premium' || membership?.name === MembershipName.PREMIUM;
    const deliveryFee = subtotal > 0 && (subtotal >= 500 || isPremium) ? 0 : 50;
    const totalPrice = subtotal + deliveryFee;

    const hasOutOfStockItems = cartItems.some(item => item.book.noOfCopies <= 0);

    const containerVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.6,
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, x: -20 },
        visible: { opacity: 1, x: 0 }
    };

    if (cartItems.length === 0) {
        return (
            <div className="checkout-page-wrapper">
                <div className="empty-checkout-premium saas-reveal">
                    <div className="empty-checkout-icon">
                        <ShoppingBag size={60} />
                    </div>
                    <h2>Your cart is empty</h2>
                    <p>It seems you haven't added any books to your cart yet. Discover your next read!</p>
                    <button onClick={() => navigate('/books')} className="premium-discovery-btn">
                        Browse Collection
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="checkout-page-wrapper">
            <div className="checkout-max-width">
                {/* Progress Stepper */}
                <div className="checkout-stepper">
                    <div className="step active">
                        <div className="step-circle"><ShoppingBag size={18} /></div>
                        <span>Review</span>
                    </div>
                    <div className="step-line"></div>
                    <div className="step">
                        <div className="step-circle"><Truck size={18} /></div>
                        <span>Delivery</span>
                    </div>
                    <div className="step-line"></div>
                    <div className="step">
                        <div className="step-circle"><Check size={18} /></div>
                        <span>Success</span>
                    </div>
                </div>

                <motion.div
                    className="checkout-content-container"
                    initial="hidden"
                    animate="visible"
                    variants={containerVariants}
                >
                    <header className="checkout-enhanced-header">
                        <button onClick={() => navigate('/borrow-cart')} className="back-btn-modern">
                            <ArrowLeft size={18} />
                            <span>Return to Cart</span>
                        </button>
                        <div className="checkout-header-main">
                            <h1>Order Checkout</h1>
                            <p>Verify your items and proceed to delivery details</p>
                        </div>
                    </header>

                    <div className="checkout-main-grid">
                        <div className="checkout-items-card-new">
                            <div className="items-card-header">
                                <Package size={20} />
                                <h2>Review My Items ({totalItems})</h2>
                            </div>

                            <div className="checkout-items-scroller">
                                <AnimatePresence>
                                    {cartItems.map((item) => (
                                        <motion.div
                                            key={item.book._id}
                                            className={`checkout-item-premium ${item.book.noOfCopies <= 0 ? 'out-of-stock-item' : ''}`}
                                            variants={itemVariants}
                                            style={item.book.noOfCopies <= 0 ? { opacity: 0.6 } : {}}
                                        >
                                            <div className="item-img-box">
                                                <img
                                                    src={item.book.cover_image_url || 'https://via.placeholder.com/100x150?text=No+Cover'}
                                                    alt={item.book.title}
                                                />
                                            </div>
                                            <div className="item-info-box">
                                                <h3 className="item-title">
                                                    {item.book.title}
                                                    {item.book.noOfCopies <= 0 && <span className="oos-label" style={{ color: 'var(--danger-color)', fontSize: '0.7rem', marginLeft: '8px' }}>(Out of Stock)</span>}
                                                </h3>
                                                <span className="item-author-label">by {item.book.author}</span>
                                                <div className="item-meta-row">
                                                    <span className="item-qty-badge">Qty: {item.quantity}</span>
                                                    {item.book.noOfCopies > 0 && <span className="item-price-each">₹{item.book.price.toFixed(2)} ea</span>}
                                                </div>
                                            </div>
                                            <div className="item-total-price-box">
                                                {item.book.noOfCopies > 0 ? `₹${(item.book.price * item.quantity).toFixed(2)}` : '—'}
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                                {hasOutOfStockItems && (
                                    <p className="oos-warning" style={{ fontSize: '0.8rem', color: 'var(--danger-color)', padding: '10px 0', borderTop: '1px dashed var(--border-color)' }}>
                                        * Items marked as Out of Stock are excluded from the order summary.
                                    </p>
                                )}
                            </div>

                            <div className="trust-badges-checkout">
                                <div className="trust-item">
                                    <ShieldCheck size={18} />
                                    <span>Secure SSL Encrypted</span>
                                </div>
                                <div className="trust-item">
                                    <Truck size={18} />
                                    <span>Safe Delivery</span>
                                </div>
                            </div>
                        </div>

                        <aside className="checkout-sidebar-sticky">
                            <motion.div
                                className="payment-summary-box-new"
                                variants={itemVariants}
                            >
                                <h2 className="summary-title">Payment Method</h2>
                                <div className="payment-method-selected">
                                    <div className="payment-icon">
                                        <Wallet size={20} />
                                    </div>
                                    <div className="payment-text">
                                        <strong>Cash on Delivery</strong>
                                        <span>Pay when you receive items</span>
                                    </div>
                                    <div className="payment-check">
                                        <Check size={16} />
                                    </div>
                                </div>

                                <div className="summary-table">
                                    <div className="summary-tr">
                                        <span>Items Subtotal</span>
                                        <span>₹{subtotal.toFixed(2)}</span>
                                    </div>
                                    <div className="summary-tr">
                                        <span>Delivery Fee</span>
                                        <span className={deliveryFee === 0 ? 'free-text' : ''}>
                                            {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee.toFixed(2)}`}
                                        </span>
                                    </div>
                                    <div className="summary-tr">
                                        <span>Estimated Delivery</span>
                                        <span className="estimate-text">
                                            {membership?.name === MembershipName.PREMIUM ? '24 Hours' : '3-4 Days'}
                                        </span>
                                    </div>
                                    <div className="summary-divider-modern"></div>
                                    <div className="summary-total-row-new">
                                        <span className="total-label">Total Amount</span>
                                        <span className="total-amount-val">₹{totalPrice.toFixed(2)}</span>
                                    </div>
                                </div>

                                <button
                                    className="premium-checkout-confirm-btn"
                                    onClick={handleContinue}
                                >
                                    Continue to Address
                                    <ArrowLeft size={18} className="rotate-180" />
                                </button>

                                <p className="legal-notice">
                                    I agree to the Terms & Conditions of E-library marketplace.
                                </p>
                            </motion.div>
                        </aside>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Checkout;
