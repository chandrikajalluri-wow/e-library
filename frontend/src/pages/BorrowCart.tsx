import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingCart, Trash2, ChevronRight, Package, Truck, ArrowLeft, Plus, Minus, History, Sparkles, Zap } from 'lucide-react';
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
    const { cartItems, removeFromCart, increaseQty, decreaseQty, addToCart, isInCart, clearCart } = useBorrowCart();

    const [recommendations, setRecommendations] = useState<Book[]>([]);
    const [buyAgain, setBuyAgain] = useState<Book[]>([]);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);
    const [userMembership, setUserMembership] = useState<Membership | null>(null);
    const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
    const [isAllSelected, setIsAllSelected] = useState(true);

    // Initialize/Update selection when cartItems change (usually on first load or manual add)
    useEffect(() => {
        if (selectedItemIds.length === 0 && cartItems.length > 0) {
            setSelectedItemIds(cartItems.map(item => item.book._id));
            setIsAllSelected(true);
        }
    }, [cartItems]);

    const toggleItemSelection = (bookId: string) => {
        setSelectedItemIds(prev => {
            const newSelection = prev.includes(bookId)
                ? prev.filter(id => id !== bookId)
                : [...prev, bookId];

            setIsAllSelected(newSelection.length === cartItems.length);
            return newSelection;
        });
    };

    const toggleAllSelection = () => {
        if (isAllSelected) {
            setSelectedItemIds([]);
            setIsAllSelected(false);
        } else {
            setSelectedItemIds(cartItems.map(item => item.book._id));
            setIsAllSelected(true);
        }
    };

    useEffect(() => {
        const fetchSuggestions = async () => {
            try {
                setIsLoadingSuggestions(true);
                const [recData, orderData] = await Promise.all([
                    getRecommendedBooks(),
                    getMyOrders()
                ]);

                setRecommendations(recData.slice(0, 10));

                const historicalBooks: Book[] = [];
                const seenIds = new Set();

                orderData.forEach((order: any) => {
                    order.items.forEach((item: any) => {
                        if (item.book_id && !seenIds.has(item.book_id._id)) {
                            historicalBooks.push({
                                ...item.book_id,
                                price: item.book_id.price || item.priceAtOrder
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
        if (selectedOutOfStockItems.length > 0) {
            toast.error('Please deselect out of stock items to proceed');
            return;
        }
        if (selectedCartItems.length === 0) {
            toast.error('Please select at least one item');
            return;
        }
        navigate('/checkout', { state: { checkoutItems: selectedCartItems } });
    };

    // Derived selections
    const selectedCartItems = cartItems.filter(item => selectedItemIds.includes(item.book._id));
    const selectedOutOfStockItems = selectedCartItems.filter(item => item.book.noOfCopies <= 0);
    const hasSelectedOutOfStock = selectedOutOfStockItems.length > 0;

    // Summary based on SELECTED items
    const totalItems = selectedCartItems.reduce((acc, item) => acc + item.quantity, 0);
    const subtotal = selectedCartItems.reduce((acc, item) => acc + (item.book.price * item.quantity), 0);

    const FREE_SHIPPING_THRESHOLD = 500;
    const isPremium = userMembership?.name === 'premium' || userMembership?.name === 'Premium';
    const deliveryFee = subtotal > 0 && (subtotal >= FREE_SHIPPING_THRESHOLD || isPremium) ? 0 : 50;
    const totalPrice = subtotal + deliveryFee;
    const progressToFree = Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100);



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
                        <div className="suggestion-price-box">
                            <span className="suggestion-price">₹{book.price.toFixed(2)}</span>
                        </div>
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
                            {inCart ? 'In' : <Plus size={18} />}
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
                        <span>{selectedItemIds.length}/{cartItems.length} Selected</span>
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
                                    <div className="card-header-minimal" style={{ justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <Package size={20} />
                                            <h3>Shipping Items</h3>
                                        </div>
                                        <div className="header-actions-group">
                                            <label className="select-all-container">
                                                <input
                                                    type="checkbox"
                                                    checked={isAllSelected}
                                                    onChange={toggleAllSelection}
                                                />
                                                <span>Select All</span>
                                            </label>
                                            <div className="v-divider"></div>
                                            <button className="clear-all-btn" onClick={() => {
                                                clearCart();
                                                toast.info('Cart cleared');
                                            }}>
                                                <Trash2 size={16} />
                                                <span>Clear All</span>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="cart-items-stack">
                                        <AnimatePresence>
                                            {cartItems.map((item) => (
                                                <motion.div
                                                    key={item.book._id}
                                                    className={`premium-cart-item ${selectedItemIds.includes(item.book._id) ? 'selected' : ''}`}
                                                    variants={itemVariants}
                                                    exit="exit"
                                                    layout
                                                >
                                                    <div className="item-checkbox-wrapper">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedItemIds.includes(item.book._id)}
                                                            onChange={() => toggleItemSelection(item.book._id)}
                                                        />
                                                    </div>
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
                                                                {item.book.noOfCopies > 0 ? `₹${item.book.price.toFixed(2)}` : <span style={{ color: 'var(--danger-color)', fontSize: '0.8rem' }}>Out of Stock</span>}
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

                                                                {item.book.noOfCopies > 0 && (
                                                                    <button
                                                                        className="minimal-remove-btn"
                                                                        style={{ marginLeft: '1rem', color: 'var(--primary-color)', borderColor: 'var(--primary-color)' }}
                                                                        onClick={() => navigate('/checkout', { state: { checkoutItems: [item] } })}
                                                                    >
                                                                        <Zap size={16} />
                                                                        <span>Buy Now</span>
                                                                    </button>
                                                                )}
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
                                {hasSelectedOutOfStock ? (
                                    <motion.div
                                        className="out-of-stock-warning"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        style={{
                                            padding: '1.5rem',
                                            background: 'rgba(239, 68, 68, 0.05)',
                                            border: '1px solid var(--danger-color)',
                                            borderRadius: '16px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '1rem'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--danger-color)' }}>
                                            <Zap size={24} />
                                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Checkout Restricted</h3>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                            Some items in your cart are currently <strong>out of stock</strong>.
                                            Please remove these items to proceed with your order.
                                        </p>
                                        <button
                                            onClick={() => navigate('/books')}
                                            className="btn-link"
                                            style={{ alignSelf: 'flex-start', color: 'var(--primary-color)', fontSize: '0.9rem', fontWeight: 600, padding: 0 }}
                                        >
                                            Find alternative books
                                        </button>
                                    </motion.div>
                                ) : (
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
                                                <span className="label">Estimated Delivery charges</span>
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

                                        <button
                                            className="premium-checkout-btn"
                                            onClick={handleProceedToCheckout}
                                            disabled={cartItems.length === 0}
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
                                                <span>Easy exchanges</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </aside>
                        </div>
                    )}
                </AnimatePresence>

                {/* Recommendation Sections */}
                {
                    !isLoadingSuggestions && (
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
                                        <h2>Buy More</h2>
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
                    )
                }
            </div >
        </motion.div >
    );
};

export default BorrowCart;
