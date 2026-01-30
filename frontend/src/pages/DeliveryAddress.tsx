import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Check, MapPin, X, Navigation, Wallet, ShoppingBag, Truck } from 'lucide-react';
import { useBorrowCart } from '../context/BorrowCartContext';
import { getAddresses, addAddress } from '../services/userService';
import { placeOrder } from '../services/orderService';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import Loader from '../components/Loader';
import '../styles/DeliveryAddress.css';

interface Address {
    _id: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    isDefault: boolean;
}

const DeliveryAddress: React.FC = () => {
    const navigate = useNavigate();
    const { cartItems, clearCart } = useBorrowCart();
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [isLocating, setIsLocating] = useState(false);

    // New Address Form State
    const [newAddress, setNewAddress] = useState({
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'India',
        isDefault: false
    });

    useEffect(() => {
        fetchAddresses();
    }, []);

    const fetchAddresses = async () => {
        try {
            const data = await getAddresses();
            setAddresses(data);
            if (data.length > 0) {
                const defaultAddr = data.find((a: Address) => a.isDefault);
                setSelectedAddressId(defaultAddr ? defaultAddr._id : data[0]._id);
            }
        } catch (error: any) {
            toast.error('Failed to load addresses');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddAddress = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const added = await addAddress(newAddress);
            toast.success('Address added successfully');
            setAddresses([...addresses, added]);
            setSelectedAddressId(added._id);
            setShowModal(false);
            setNewAddress({ street: '', city: '', state: '', zipCode: '', country: 'India', isDefault: false });
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to add address');
        }
    };

    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast.error('Geolocation is not supported by your browser');
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
                    const data = await res.json();

                    if (data.address) {
                        const addr = data.address;
                        setNewAddress({
                            ...newAddress,
                            street: addr.road || addr.suburb || addr.pedestrian || '',
                            city: addr.city || addr.town || addr.village || '',
                            state: addr.state || '',
                            zipCode: addr.postcode || '',
                            country: addr.country || 'India'
                        });
                        toast.success('Location detected!');
                    }
                } catch (error) {
                    console.error('Reverse geocoding error:', error);
                    toast.error('Could not determine address from coordinates');
                } finally {
                    setIsLocating(false);
                }
            },
            () => {
                setIsLocating(false);
                toast.error('Location permission denied or unavailable');
            }
        );
    };

    const handlePlaceOrder = async () => {
        if (!selectedAddressId) {
            toast.warn('Please select a delivery address');
            return;
        }

        const availableItems = cartItems.filter(item => item.book.noOfCopies > 0);
        if (availableItems.length === 0) {
            toast.error('No items available for delivery');
            navigate('/borrow-cart');
            return;
        }

        setIsPlacingOrder(true);
        try {
            const orderData = {
                items: availableItems.map(item => ({
                    book_id: item.book._id,
                    quantity: item.quantity
                })),
                selectedAddressId
            };

            await placeOrder(orderData);
            toast.success('🎉 Order placed successfully!');
            clearCart();
            // In a real app, you might navigate to a success page
            navigate('/my-orders');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to place order. Please try again.');
        } finally {
            setIsPlacingOrder(false);
        }
    };

    const availableItems = cartItems.filter(item => item.book.noOfCopies > 0);
    const cartCount = availableItems.reduce((acc, item) => acc + item.quantity, 0);
    const subtotal = availableItems.reduce((acc, item) => acc + (item.book.price * item.quantity), 0);
    const deliveryFee = subtotal > 50 ? 0 : 50;
    const totalAmount = subtotal + deliveryFee;

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

    if (isLoading) return <div className="loader-container"><Loader /></div>;

    return (
        <div className="address-page-wrapper">
            <div className="address-max-width">
                {/* Progress Stepper - SYNCED WITH CHECKOUT */}
                <div className="checkout-stepper">
                    <div className="step visited">
                        <div className="step-circle"><Check size={18} /></div>
                        <span>Review</span>
                    </div>
                    <div className="step-line active"></div>
                    <div className="step active">
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
                    className="address-content-container"
                    initial="hidden"
                    animate="visible"
                    variants={containerVariants}
                >
                    <header className="address-enhanced-header">
                        <button onClick={() => navigate('/checkout')} className="back-btn-modern">
                            <ArrowLeft size={18} />
                            <span>Back to Order Summary</span>
                        </button>
                        <div className="address-header-main">
                            <h1>Delivery Details</h1>
                            <p>Select where you'd like your library items to be delivered</p>
                        </div>
                    </header>

                    <div className="address-main-grid">
                        <div className="address-selection-box">
                            <div className="selection-header">
                                <MapPin size={20} />
                                <h2>Your Saved Addresses</h2>
                            </div>

                            <div className="address-list-scroller">
                                <AnimatePresence>
                                    {addresses.map((address) => (
                                        <motion.div
                                            key={address._id}
                                            className={`address-card-premium ${selectedAddressId === address._id ? 'selected' : ''}`}
                                            onClick={() => setSelectedAddressId(address._id)}
                                            variants={itemVariants}
                                            whileHover={{ scale: 1.01 }}
                                        >
                                            <div className="address-card-main">
                                                <div className="address-type-icon">
                                                    <ShoppingBag size={20} />
                                                </div>
                                                <div className="address-info-content">
                                                    <h3 className="address-label-text">
                                                        Shipping Address
                                                        {address.isDefault && <span className="default-pill">DEFAULT</span>}
                                                    </h3>
                                                    <p className="full-address-text">
                                                        {address.street}, {address.city}, {address.state} - {address.zipCode}
                                                    </p>
                                                    <span className="country-label">{address.country}</span>
                                                </div>
                                                <div className="selection-indicator">
                                                    {selectedAddressId === address._id ? <Check size={18} /> : <div className="radio-circle"></div>}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>

                            <button className="add-address-premium-btn" onClick={() => setShowModal(true)}>
                                <Plus size={20} />
                                <span>Add a New Delivery Address</span>
                            </button>
                        </div>

                        <aside className="address-sidebar-sticky">
                            <motion.div className="final-summary-box-new" variants={itemVariants}>
                                <h2 className="summary-title">Order Confirmation</h2>

                                <div className="summary-payment-preview">
                                    <div className="preview-icon"><Wallet size={18} /></div>
                                    <div className="preview-text">
                                        <strong>Cash on Delivery</strong>
                                        <span>Select address to proceed</span>
                                    </div>
                                </div>

                                <div className="summary-table">
                                    <div className="summary-tr">
                                        <span>Total Items</span>
                                        <span>{cartCount}</span>
                                    </div>
                                    <div className="summary-divider-modern"></div>
                                    <div className="summary-total-row-new">
                                        <span className="total-label">Payable Total</span>
                                        <span className="total-amount-val">₹{totalAmount.toFixed(2)}</span>
                                    </div>
                                </div>

                                <button
                                    className="premium-place-order-btn"
                                    onClick={handlePlaceOrder}
                                    disabled={isPlacingOrder || !selectedAddressId}
                                >
                                    {isPlacingOrder ? (
                                        <>
                                            <div className="mini-loader"></div>
                                            Processing...
                                        </>
                                    ) : (
                                        'Confirm & Place Order →'
                                    )}
                                </button>

                                <div className="guarantee-badges">
                                    <div className="guarantee-item">
                                        <Check size={14} />
                                        Secure Checkout
                                    </div>
                                    <div className="guarantee-item">
                                        <Check size={14} />
                                        Free Returns
                                    </div>
                                </div>
                            </motion.div>
                        </aside>
                    </div>
                </motion.div>
            </div>

            {/* Premium Address Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        className="modal-overlay-new"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="modal-content-premium"
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        >
                            <div className="modal-header-new">
                                <div>
                                    <h2>Add New Address</h2>
                                    <p>Fill in where we should deliver your books</p>
                                </div>
                                <button className="close-x-btn" onClick={() => setShowModal(false)}>
                                    <X size={20} />
                                </button>
                            </div>

                            <button
                                className="use-location-premium-btn"
                                onClick={handleUseCurrentLocation}
                                disabled={isLocating}
                            >
                                {isLocating ? 'Locating your home...' : (
                                    <>
                                        <Navigation size={18} />
                                        Auto-detect Current Location
                                    </>
                                )}
                            </button>

                            <div className="form-divider-text">
                                <span>OR ENTER MANUALLY</span>
                            </div>

                            <form className="premium-address-form" onSubmit={handleAddAddress}>
                                <div className="form-group-new">
                                    <label>Street / Flat No.</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 123, Library Lane"
                                        required
                                        value={newAddress.street}
                                        onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                                    />
                                </div>

                                <div className="form-double-row">
                                    <div className="form-group-new">
                                        <label>City</label>
                                        <input
                                            type="text"
                                            placeholder="City"
                                            required
                                            value={newAddress.city}
                                            onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group-new">
                                        <label>State</label>
                                        <input
                                            type="text"
                                            placeholder="State"
                                            required
                                            value={newAddress.state}
                                            onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="form-double-row">
                                    <div className="form-group-new">
                                        <label>Zip Code</label>
                                        <input
                                            type="text"
                                            placeholder="6-digit ZIP"
                                            required
                                            value={newAddress.zipCode}
                                            onChange={(e) => setNewAddress({ ...newAddress, zipCode: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group-new">
                                        <label>Country</label>
                                        <input
                                            type="text"
                                            placeholder="Country"
                                            required
                                            value={newAddress.country}
                                            onChange={(e) => setNewAddress({ ...newAddress, country: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <label className="custom-checkbox-row">
                                    <input
                                        type="checkbox"
                                        checked={newAddress.isDefault}
                                        onChange={(e) => setNewAddress({ ...newAddress, isDefault: e.target.checked })}
                                    />
                                    <span className="checkbox-label">Make this my default address</span>
                                </label>

                                <div className="modal-footer-btns">
                                    <button type="button" className="btn-secondary-modern" onClick={() => setShowModal(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn-primary-modern">
                                        Save Address
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DeliveryAddress;
