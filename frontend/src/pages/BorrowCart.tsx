import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingCart, Trash2, ChevronRight, Package, Truck, ArrowLeft, Plus, Minus, History, Sparkles } from 'lucide-react';
import { useBorrowCart } from '../context/BorrowCartContext';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { getRecommendedBooks } from '../services/bookService';
import { getMyOrders } from '../services/userOrderService';
import { getMyMembership, type Membership } from '../services/membershipService';
import type { Book } from '../types';
import '../styles/BorrowCart.css';

const BorrowCart: React.FC = () => {
    const navigate = useNavigate();
    const { cartItems, removeFromCart, increaseQty, decreaseQty, getCartCount, addToCart, isInCart } = useBorrowCart();

    const [recommendations, setRecommendations] = useState<Book[]>([]);
    const [buyAgain, setBuyAgain] = useState<Book[]>([]);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);
    const [userMembership, setUserMembership] = useState<Membership | null>(null);

    useEffect(() => {
        const fetchSuggestions = async () => {
            try {
                setIsLoadingSuggestions(true);
                const [recData, orderData] = await Promise.all([
                    getRecommendedBooks(),
                    getMyOrders()
                ]);

                setRecommendations(recData.slice(0, 10));

                // Process buy again books: flatten items from all orders and remove duplicates
                const historicalBooks: Book[] = [];
                const seenIds = new Set();

                orderData.forEach((order: any) => {
                    order.items.forEach((item: any) => {
                        if (item.book_id && !seenIds.has(item.book_id._id)) {
                            historicalBooks.push({
                                ...item.book_id,
                                price: item.book_id.price || item.priceAtOrder // Fallback to priceAtOrder if book price missing
                            });
                            seenIds.add(item.book_id._id);
                        }
                    });
                });

                setBuyAgain(historicalBooks.slice(0, 10));
            } catch (error) {
                console.error('Error fetching cart suggestions:', error);
            } finally {
                setIsLoadingSuggestions(false);
            }
        };

        fetchSuggestions();
        fetchUserMembership();
    }, []);

    const fetchUserMembership = async () => {
        try {
            const data = await getMyMembership();
            setUserMembership(data);
        } catch (err) {
            console.error('Error fetching membership:', err);
        }
    };

    const handleProceedToCheckout = () => {
        if (cartItems.length === 0) return;
        navigate('/checkout');
    };

    const totalItems = getCartCount();

    // Calculate financial summary
    const subtotal = cartItems.reduce((acc, item) => acc + (item.book.price * item.quantity), 0);
    const FREE_SHIPPING_THRESHOLD = 500;
    const deliveryFee = subtotal > 0 && subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : 50;
    const totalPrice = subtotal + deliveryFee;
    const progressToFree = Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100);

    const hasPremiumRestrictedItems = cartItems.some(item => item.book.isPremium && !userMembership?.canAccessPremiumBooks);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 },
        exit: { x: -20, opacity: 0 }
    };

    const BookSuggestionCard = ({ book }: { book: Book }) => {
        const inCart = isInCart(book._id);

        return (
            <motion.div className="suggestion-card" whileHover={{ y: -5 }}>
                <Link to={`/books/${book._id}`} className="suggestion-img-link">
                    <img
                        src={book.cover_image_url || 'https://via.placeholder.com/150x225?text=No+Cover'}
                        alt={book.title}
                    />
                </Link>
                <div className="suggestion-details">
                    <Link to={`/books/${book._id}`} className="suggestion-title">{book.title}</Link>
                    <p className="suggestion-author">by {book.author}</p>
                    <div className="suggestion-footer">
                        <span className="suggestion-price">₹{book.price.toFixed(2)}</span>
                        <button
                            className={`suggestion-add-btn ${inCart ? 'in-cart' : ''}`}
                            onClick={() => {
                                if (!inCart) {
                                    addToCart(book);
                                    toast.success('Added to cart');
                                }
                            }}
                            disabled={inCart}
                        >
                            {inCart ? 'In Cart' : <Plus size={16} />}
                        </button>
                    </div>
                </div>
            </motion.div>
        );
    };

    return (
        <motion.div
            className="cart-view-wrapper"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            <div className="cart-page-max-width">
                <header className="cart-enhanced-header">
                    <div className="header-nav-back">
                        <button onClick={() => navigate('/books')} className="back-btn-minimal">
                            <ArrowLeft size={18} />
                            <span>Continue Shopping</span>
                        </button>
                    </div>
                    <h1 className="cart-title-main">My Shopping Cart</h1>
                    <div className="cart-item-count-badge">
                        <ShoppingCart size={18} />
                        <span>{totalItems} {totalItems === 1 ? 'Book' : 'Books'}</span>
                    </div>
                </header>

                <AnimatePresence mode="wait">
                    {cartItems.length === 0 ? (
                        <motion.div
                            key="empty"
                            className="empty-cart-premium"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                        >
                            <div className="empty-visual">
                                <motion.div
                                    className="icon-sphere"
                                    animate={{ y: [0, -15, 0] }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                >
                                    <ShoppingCart size={64} className="floating-icon" />
                                </motion.div>
                                <div className="glow-effect"></div>
                            </div>
                            <h2 className="empty-title">Your library is waiting</h2>
                            <p className="empty-description">
                                It looks like you haven't added any books to your cart yet.
                                Discover your next favorite read today.
                            </p>
                            <button
                                onClick={() => navigate('/books')}
                                className="premium-cta-btn"
                            >
                                Explore Collection
                                <ChevronRight size={20} />
                            </button>
                        </motion.div>
                    ) : (
                        <div key="content" className="cart-main-grid">
                            <div className="cart-content-left">
                                <div className="cart-items-card">
                                    <div className="card-header-minimal">
                                        <Package size={20} />
                                        <h3>Shipping Items</h3>
                                    </div>
                                    <div className="cart-items-stack">
                                        <AnimatePresence>
                                            {cartItems.map((item) => (
                                                <motion.div
                                                    key={item.book._id}
                                                    className="premium-cart-item"
                                                    variants={itemVariants}
                                                    exit="exit"
                                                    layout
                                                >
                                                    <div className="item-image-wrapper">
                                                        <img
                                                            src={item.book.cover_image_url || 'https://via.placeholder.com/150x225?text=No+Cover'}
                                                            alt={item.book.title}
                                                            className="item-cover-img"
                                                        />
                                                        <div className="image-overlay"></div>
                                                    </div>

                                                    <div className="item-info-extended">
                                                        <div className="info-top">
                                                            <div className="title-group">
                                                                <Link to={`/books/${item.book._id}`} className="item-link-title">
                                                                    {item.book.title}
                                                                </Link>
                                                                <span className="item-author-sub">by {item.book.author}</span>
                                                            </div>
                                                            <div className="price-tag-premium">
                                                                ₹{item.book.price.toFixed(2)}
                                                            </div>
                                                        </div>

                                                        <div className="info-bottom">
                                                            <div className="stock-info-row">
                                                                <div className={`stock-status ${item.book.noOfCopies > 5 ? 'in-stock' : 'low-stock'}`}>
                                                                    <div className="status-dot"></div>
                                                                    {item.book.noOfCopies > 0 ? `${item.book.noOfCopies} available` : 'Sold out'}
                                                                </div>
                                                            </div>

                                                            <div className="item-interactive-row">
                                                                <div className="quantity-stepper-premium">
                                                                    <button
                                                                        className="step-btn"
                                                                        onClick={() => decreaseQty(item.book._id)}
                                                                        disabled={item.quantity <= 1}
                                                                    >
                                                                        <Minus size={14} />
                                                                    </button>
                                                                    <span className="step-value">{item.quantity}</span>
                                                                    <button
                                                                        className="step-btn"
                                                                        onClick={() => increaseQty(item.book._id)}
                                                                        disabled={item.quantity >= item.book.noOfCopies}
                                                                    >
                                                                        <Plus size={14} />
                                                                    </button>
                                                                </div>

                                                                <button
                                                                    className="minimal-remove-btn"
                                                                    onClick={() => {
                                                                        removeFromCart(item.book._id);
                                                                        toast.info('Item removed');
                                                                    }}
                                                                >
                                                                    <Trash2 size={16} />
                                                                    <span>Remove</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>

                            <aside className="cart-sidebar-right">
                                <motion.div
                                    className="price-summary-card"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    <h2 className="summary-title-alt">Order Summary</h2>

                                    {/* Shipping Progress */}
                                    <div className="shipping-progress-section">
                                        <div className="progress-labels">
                                            <div className="progress-status">
                                                <Truck size={16} className={deliveryFee === 0 ? 'truck-free' : ''} />
                                                <span>{deliveryFee === 0 ? 'Free delivery unlocked!' : 'Delivery'}</span>
                                            </div>
                                            {deliveryFee > 0 && <span className="needed-amount">₹{(FREE_SHIPPING_THRESHOLD - subtotal).toFixed(0)} more for FREE</span>}
                                        </div>
                                        <div className="progress-track">
                                            <motion.div
                                                className="progress-fill"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${progressToFree}%` }}
                                                transition={{ duration: 1, ease: "easeOut" }}
                                            ></motion.div>
                                        </div>
                                    </div>

                                    <div className="summary-data-list">
                                        <div className="data-row">
                                            <span className="label">Subtotal ({totalItems} items)</span>
                                            <span className="value">₹{subtotal.toFixed(2)}</span>
                                        </div>
                                        <div className="data-row">
                                            <span className="label">Estimated Delivery</span>
                                            <span className={`value ${deliveryFee === 0 ? 'free-text' : ''}`}>
                                                {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee.toFixed(2)}`}
                                            </span>
                                        </div>
                                        <div className="data-row discount-row">
                                            <span className="label">Discount</span>
                                            <span className="value">-₹0.00</span>
                                        </div>
                                    </div>

                                    <div className="total-divider"></div>

                                    <div className="total-payable-row">
                                        <span className="total-label">Total Payable</span>
                                        <div className="total-amount-group">
                                            <span className="currency">₹</span>
                                            <span className="amount">{totalPrice.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    {hasPremiumRestrictedItems && (
                                        <div className="premium-restriction-warning" style={{ color: '#ef4444', backgroundColor: '#fef2f2', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', border: '1px solid #fee2e2' }}>
                                            <p style={{ margin: 0, fontWeight: 600 }}>Action Required</p>
                                            <p style={{ margin: '0.25rem 0 0.75rem' }}>Your cart contains Premium books that require a Premium membership.</p>
                                            <button
                                                onClick={() => navigate('/memberships')}
                                                style={{ width: '100%', padding: '0.5rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                                            >
                                                Upgrade Now
                                            </button>
                                        </div>
                                    )}

                                    <button
                                        className={`premium-checkout-btn ${hasPremiumRestrictedItems ? 'disabled-checkout' : ''}`}
                                        onClick={handleProceedToCheckout}
                                        disabled={cartItems.length === 0 || hasPremiumRestrictedItems}
                                    >
                                        <span>Proceed to Checkout</span>
                                        <ChevronRight size={20} />
                                    </button>

                                    <div className="trust-badges">
                                        <div className="badge">
                                            <div className="badge-dot"></div>
                                            <span>Secure Checkout</span>
                                        </div>
                                        <div className="badge">
                                            <div className="badge-dot"></div>
                                            <span>Easy Returns</span>
                                        </div>
                                    </div>
                                </motion.div>
                            </aside>
                        </div>
                    )}
                </AnimatePresence>

                {/* Recommendation Sections */}
                {!isLoadingSuggestions && (
                    <motion.div
                        className="cart-recommendations-wrapper"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        {recommendations.length > 0 && (
                            <section className="recommendation-section">
                                <div className="section-header">
                                    <Sparkles size={20} className="text-primary" />
                                    <h2>Buy More, Save More</h2>
                                    <span className="section-tag">Based on your interests</span>
                                </div>
                                <div className="horizontal-scroll-container">
                                    {recommendations.map(book => (
                                        <BookSuggestionCard key={book._id} book={book} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {buyAgain.length > 0 && (
                            <section className="recommendation-section buy-again-section">
                                <div className="section-header">
                                    <History size={20} className="text-secondary" />
                                    <h2>Buy Again</h2>
                                    <span className="section-tag">Because you've read these</span>
                                </div>
                                <div className="horizontal-scroll-container">
                                    {buyAgain.map(book => (
                                        <BookSuggestionCard key={book._id} book={book} />
                                    ))}
                                </div>
                            </section>
                        )}
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
};

export default BorrowCart;
