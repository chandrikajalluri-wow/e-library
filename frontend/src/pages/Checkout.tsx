import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Wallet, Check, Package, Truck, ShoppingBag, X } from 'lucide-react';
import { useCart, type CartItem } from '../context/CartContext';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { getMyMembership, type Membership } from '../services/membershipService';
import { MembershipName } from '../types/enums';
import '../styles/Checkout.css';

const Checkout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { cartItems: contextCartItems } = useCart();

    // Use items passed via state, or fall back to full cart
    const cartItems = (location.state?.checkoutItems || contextCartItems) as CartItem[];
    const [membership, setMembership] = React.useState<Membership | null>(null);
    const [isAgreed, setIsAgreed] = React.useState(false);
    const [showTermsModal, setShowTermsModal] = React.useState(false);

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
            navigate('/cart');
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
                        <button onClick={() => navigate('/cart')} className="back-btn-modern">
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
                                                    {item.book.noOfCopies > 0 && <span className="item-price-each">₹{item.book.price.toFixed(2)}</span>}
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

                                <div className="terms-acceptance-container">
                                    <label className="terms-checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={isAgreed}
                                            onChange={(e) => setIsAgreed(e.target.checked)}
                                        />
                                        <span className="terms-text">
                                            I agree to the <button type="button" className="terms-link-btn" onClick={() => setShowTermsModal(true)}>Terms & Conditions</button>
                                        </span>
                                    </label>
                                </div>

                                <button
                                    className="premium-checkout-confirm-btn"
                                    onClick={handleContinue}
                                    disabled={!isAgreed}
                                >
                                    Continue to Address
                                    <ArrowLeft size={18} className="rotate-180" />
                                </button>

                                <p className="legal-notice-small">
                                    Secure 256-bit encrypted checkout
                                </p>
                            </motion.div>
                        </aside>
                    </div>
                </motion.div>
            </div>

            {/* Terms and Conditions Modal */}
            <AnimatePresence>
                {showTermsModal && (
                    <motion.div
                        className="modal-overlay-new"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="modal-content-premium terms-modal"
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        >
                            <div className="modal-header-new">
                                <div>
                                    <h2>Terms & Conditions</h2>
                                    <p>Please read our library policies carefully</p>
                                </div>
                                <button className="close-x-btn" onClick={() => setShowTermsModal(false)}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="terms-content-scroller">
                                <div className="terms-intro">
                                    <p><strong>Welcome to Bookstack Library</strong></p>
                                    <p>By creating an account, browsing books, buying books, reading PDFs, or using any feature, you agree to follow these Terms & Conditions.</p>
                                </div>

                                <section className="terms-section">
                                    <h3>1. Account & User Responsibilities</h3>
                                    <ul>
                                        <li>You must provide accurate information during signup.</li>
                                        <li>You are responsible for keeping your login credentials secure.</li>
                                        <li>You must not use the platform for illegal, harmful, or abusive activities.</li>
                                        <li>You cannot create multiple accounts to exploit membership plans or offers.</li>
                                    </ul>
                                </section>

                                <section className="terms-section">
                                    <h3>2. Content & Copyright</h3>
                                    <ul>
                                        <li>All book content, descriptions, metadata, and images belong to their respective authors or publishers.</li>
                                        <li>Users must not copy, redistribute, or modify protected content.</li>
                                        <li>AI-generated descriptions are for internal use and may not always be 100% accurate.</li>
                                    </ul>
                                </section>

                                <section className="terms-section">
                                    <h3>3. Orders, Checkout & Delivery</h3>
                                    <ul>
                                        <li>Users must provide valid delivery information.</li>
                                        <li>Users can track order status: Processing → Shipped → Delivered → Canceled.</li>
                                        <li>Delivery timelines may vary based on location and availability.</li>
                                        <li>False claims, invalid addresses, or abusive behavior may lead to account suspension.</li>
                                    </ul>
                                </section>

                                <section className="terms-section">
                                    <h3>4. Email Notifications</h3>
                                    <p>You agree to receive transactional emails such as:</p>
                                    <ul>
                                        <li>Due date reminders</li>
                                        <li>Return approvals & Order updates</li>
                                        <li>Account-related alerts</li>
                                    </ul>
                                </section>

                                <section className="terms-section">
                                    <h3>5. Privacy & Data Usage</h3>
                                    <ul>
                                        <li>We collect only necessary information (name, email, membership, history).</li>
                                        <li>Passwords are encrypted and stored securely.</li>
                                        <li>We do not sell your personal data to third parties.</li>
                                        <li>Cookies may be used for login sessions and offline reading.</li>
                                    </ul>
                                </section>

                                <section className="terms-section">
                                    <h3>6. Prohibited Activities</h3>
                                    <p>You are not allowed to:</p>
                                    <ul>
                                        <li>Hack or attempt to bypass system restrictions.</li>
                                        <li>Download files using automated tools.</li>
                                        <li>Access content fairly and abide by membership rules.</li>
                                        <li>Upload harmful files or impersonate others.</li>
                                    </ul>
                                </section>

                                <section className="terms-section">
                                    <h3>7. Service Changes</h3>
                                    <p>We may update features, membership benefits, or remove content at our discretion. You will be notified of important changes.</p>
                                </section>

                                <section className="terms-section">
                                    <h3>8. Limitation of Liability</h3>
                                    <p>We are not responsible for loss of offline files due to device resets, incorrect AI descriptions, or issues caused by third-party services.</p>
                                </section>

                                <section className="terms-section">
                                    <h3>9. Account Deletion</h3>
                                    <p>Users can delete their account anytime. Deleted accounts cannot be recovered. We reserve the right to delete accounts that violate these rules.</p>
                                </section>

                                <section className="terms-section">
                                    <h3>10. Governing Law</h3>
                                    <p>These terms are governed by Indian laws.</p>
                                </section>

                                <section className="terms-section">
                                    <h3>11. Contact Us</h3>
                                    <p>For support or inquiries: <strong>chandrika6300@gmail.com</strong></p>
                                </section>
                            </div>

                            <div className="modal-footer-btns single-footer-btn">
                                <button className="btn-primary-modern" onClick={() => setShowTermsModal(false)}>
                                    I Understand
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Checkout;
