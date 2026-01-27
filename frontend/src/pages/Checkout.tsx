import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Wallet } from 'lucide-react';
import { useBorrowCart } from '../context/BorrowCartContext';
import { toast } from 'react-toastify';
import '../styles/Checkout.css';

const Checkout: React.FC = () => {
    const navigate = useNavigate();
    const { cartItems, getCartCount } = useBorrowCart();

    const handleContinue = () => {
        if (cartItems.length === 0) {
            toast.error('Your cart is empty');
            navigate('/borrow-cart');
            return;
        }
        navigate('/checkout/address');
    };

    const totalItems = getCartCount();

    // Calculate financial summary
    const subtotal = cartItems.reduce((acc, item) => acc + (item.book.price * item.quantity), 0);
    const deliveryFee = subtotal > 0 && subtotal <= 50 ? 50 : 0;
    const totalPrice = subtotal + deliveryFee;

    if (cartItems.length === 0) {
        return (
            <div className="dashboard-container saas-reveal">
                <div className="checkout-container">
                    <div className="empty-checkout">
                        <h2>Your cart is empty</h2>
                        <p>Add some books to your cart before checking out.</p>
                        <button onClick={() => navigate('/books')} className="btn-primary">
                            Browse Books
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container saas-reveal">
            <div className="checkout-container">
                {/* Header */}
                <div className="checkout-header">
                    <button onClick={() => navigate('/borrow-cart')} className="back-btn">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="checkout-title-section">
                        <div className="checkout-icon">
                            <Wallet size={24} />
                        </div>
                        <h1 className="checkout-title">Order Checkout</h1>
                    </div>
                </div>
                <p className="checkout-subtitle">Review and confirm your order items before payment</p>

                <div className="checkout-grid">
                    {/* Order Summary */}
                    <div className="checkout-order-summary">
                        <h2 className="section-title">Order Summary</h2>
                        <div className="order-items-list">
                            {cartItems.map((item) => (
                                <div key={item.book._id} className="checkout-item">
                                    <div className="checkout-item-image">
                                        <img
                                            src={item.book.cover_image_url || 'https://via.placeholder.com/80x120?text=No+Cover'}
                                            alt={item.book.title}
                                        />
                                    </div>
                                    <div className="checkout-item-details">
                                        <h3 className="checkout-item-title">{item.book.title}</h3>
                                        <p className="checkout-item-qty">Qty: {item.quantity}</p>
                                    </div>
                                    <div className="checkout-item-price">
                                        ₹{(item.book.price * item.quantity).toFixed(2)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Payment Section */}
                    <div className="checkout-payment-section">
                        <h2 className="section-title">Payment Method</h2>
                        <div className="payment-method-card">
                            <div className="payment-option selected">
                                <Wallet size={20} />
                                <span>Cash on Delivery</span>
                            </div>
                        </div>

                        <div className="checkout-summary">
                            <div className="summary-row">
                                <span className="summary-label">Subtotal</span>
                                <span className="summary-value">₹{subtotal.toFixed(2)}</span>
                            </div>
                            <div className="summary-row">
                                <span className="summary-label">Delivery</span>
                                <span className="summary-value">
                                    {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee.toFixed(2)}`}
                                </span>
                            </div>
                            <div className="summary-divider"></div>
                            <div className="summary-total-row">
                                <span className="total-label">Total Payable</span>
                                <span className="total-value">₹{totalPrice.toFixed(2)}</span>
                            </div>
                        </div>

                        <button
                            className="confirm-order-btn"
                            onClick={handleContinue}
                        >
                            Continue →
                        </button>

                        <p className="checkout-note">
                            By clicking confirm, you agree to the purchase of {totalItems} {totalItems === 1 ? 'book' : 'books'}.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Checkout;
