import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingCart, Trash2 } from 'lucide-react';
import { useBorrowCart } from '../context/BorrowCartContext';
import { toast } from 'react-toastify';
import '../styles/BorrowCart.css';

const BorrowCart: React.FC = () => {
    const navigate = useNavigate();
    const { cartItems, removeFromCart, increaseQty, decreaseQty, getCartCount } = useBorrowCart();

    const handleProceedToCheckout = () => {
        if (cartItems.length === 0) return;
        navigate('/checkout');
    };

    const totalItems = getCartCount();

    // Calculate financial summary
    const subtotal = cartItems.reduce((acc, item) => acc + (item.book.price * item.quantity), 0);
    const deliveryFee = subtotal > 0 && subtotal <= 50 ? 50 : 0;
    const totalPrice = subtotal + deliveryFee;

    return (
        <div className="dashboard-container saas-reveal">
            <div className="cart-page-container">
                <div className="cart-page-header">
                    <h1 className="cart-page-title">Shopping Cart</h1>
                    <p className="cart-page-subtitle">
                        {totalItems > 0 ? `${totalItems} ${totalItems === 1 ? 'item' : 'items'} in your cart` : 'Your cart is empty'}
                    </p>
                </div>

                {cartItems.length === 0 ? (
                    <div className="empty-cart-state">
                        <div className="empty-cart-icon">
                            <ShoppingCart size={80} />
                        </div>
                        <h2 className="empty-cart-title">Your cart is empty</h2>
                        <p className="empty-cart-text">
                            Add some books to your cart to get started!
                        </p>
                        <button
                            onClick={() => navigate('/books')}
                            className="browse-books-btn"
                        >
                            Browse Books
                        </button>
                    </div>
                ) : (
                    <div className="cart-grid">
                        {/* Cart Items Section */}
                        <div className="cart-items-section">
                            <h2 className="cart-items-header">Cart Items</h2>
                            <div className="cart-items-list">
                                {cartItems.map((item) => (
                                    <div key={item.book._id} className="cart-item">
                                        <Link to={`/books/${item.book._id}`} className="cart-item-cover">
                                            <img
                                                src={item.book.cover_image_url || 'https://via.placeholder.com/150x225?text=No+Cover'}
                                                alt={item.book.title}
                                            />
                                        </Link>

                                        <div className="cart-item-details">
                                            <div className="cart-item-header-row">
                                                <Link to={`/books/${item.book._id}`}>
                                                    <h3 className="cart-item-title">{item.book.title}</h3>
                                                </Link>
                                                <span className="cart-item-price">₹{item.book.price.toFixed(2)}</span>
                                            </div>
                                            <p className="cart-item-author">by {item.book.author}</p>

                                            <div className="cart-item-stock">
                                                <span className={item.book.noOfCopies > 5 ? 'stock-available' : 'stock-low'}>
                                                    {item.book.noOfCopies > 0
                                                        ? `${item.book.noOfCopies} in stock`
                                                        : 'Out of stock'}
                                                </span>
                                            </div>

                                            <div className="cart-item-actions">
                                                <div className="quantity-controls">
                                                    <button
                                                        className="qty-btn"
                                                        onClick={() => decreaseQty(item.book._id)}
                                                        disabled={item.quantity <= 1}
                                                        title="Decrease quantity"
                                                    >
                                                        −
                                                    </button>
                                                    <span className="qty-display">{item.quantity}</span>
                                                    <button
                                                        className="qty-btn"
                                                        onClick={() => increaseQty(item.book._id)}
                                                        disabled={item.quantity >= item.book.noOfCopies}
                                                        title="Increase quantity"
                                                    >
                                                        +
                                                    </button>
                                                </div>

                                                <button
                                                    className="remove-btn"
                                                    onClick={() => {
                                                        removeFromCart(item.book._id);
                                                        toast.info('Removed from cart');
                                                    }}
                                                >
                                                    <Trash2 size={16} />
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Order Summary Section */}
                        <div className="order-summary-section">
                            <h2 className="summary-header">Order Summary</h2>

                            <div className="summary-row">
                                <span className="summary-label">Subtotal</span>
                                <span className="summary-value">₹{subtotal.toFixed(2)}</span>
                            </div>

                            <div className="summary-row">
                                <span className="summary-label">Delivery Fee</span>
                                <span className={`summary-value ${deliveryFee === 0 ? 'free-badge' : ''}`}>
                                    {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee.toFixed(2)}`}
                                </span>
                            </div>

                            {deliveryFee > 0 && (
                                <p className="delivery-tip">Add items worth ₹{(51 - subtotal).toFixed(2)} more for FREE delivery!</p>
                            )}

                            <div className="summary-divider"></div>

                            <div className="summary-total">
                                <span>Total Payable</span>
                                <span>₹{totalPrice.toFixed(2)}</span>
                            </div>

                            <button
                                className="checkout-btn"
                                onClick={handleProceedToCheckout}
                                disabled={cartItems.length === 0}
                            >
                                Proceed to Checkout →
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BorrowCart;
