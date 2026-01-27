import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Check, MapPin, X, Navigation, Package, Wallet } from 'lucide-react';
import { useBorrowCart } from '../context/BorrowCartContext';
import { getAddresses, addAddress } from '../services/userService';
import { placeOrder } from '../services/orderService';
import { toast } from 'react-toastify';
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
    const { cartItems, clearCart, getCartCount } = useBorrowCart();
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
                    // Using Nominatim (OpenStreetMap) for free reverse geocoding
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

        if (cartItems.length === 0) {
            toast.error('Your cart is empty');
            navigate('/borrow-cart');
            return;
        }

        setIsPlacingOrder(true);
        try {
            const orderData = {
                items: cartItems.map(item => ({
                    book_id: item.book._id,
                    quantity: item.quantity
                })),
                selectedAddressId
            };

            await placeOrder(orderData);
            toast.success('🎉 Order placed successfully!');
            clearCart();
            navigate('/dashboard');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to place order. Please try again.');
        } finally {
            setIsPlacingOrder(false);
        }
    };

    const cartCount = getCartCount();
    const subtotal = cartItems.reduce((acc, item) => acc + (item.book.price * item.quantity), 0);
    const deliveryFee = subtotal > 50 ? 0 : 50;
    const totalAmount = subtotal + deliveryFee;

    if (isLoading) return <div className="loader-container"><Loader /></div>;

    return (
        <div className="dashboard-container saas-reveal">
            <div className="delivery-address-container">
                {/* Header */}
                <div className="delivery-header">
                    <button onClick={() => navigate('/checkout')} className="back-btn">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="delivery-title-section">
                        <h1>Delivery Address</h1>
                        <p>Select the address where you want your order delivered</p>
                    </div>
                </div>

                <div className="delivery-grid">
                    {/* Address Selection */}
                    <div className="address-section">
                        <div className="address-list">
                            {addresses.map((address) => (
                                <div
                                    key={address._id}
                                    className={`address-card ${selectedAddressId === address._id ? 'selected' : ''}`}
                                    onClick={() => setSelectedAddressId(address._id)}
                                >
                                    <div className="address-card-content">
                                        <h3>
                                            <MapPin size={18} />
                                            Address
                                            {address.isDefault && <span className="default-badge">DEFAULT</span>}
                                        </h3>
                                        <p className="address-details">
                                            {address.street}<br />
                                            {address.city}, {address.state} - {address.zipCode}<br />
                                            {address.country}
                                        </p>
                                    </div>
                                    {selectedAddressId === address._id && (
                                        <div className="selected-check">
                                            <Check size={16} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <button className="add-address-btn" onClick={() => setShowModal(true)}>
                            <Plus size={20} />
                            Add New Address
                        </button>
                    </div>

                    {/* Order Summary */}
                    <div className="summary-section">
                        <div className="summary-box">
                            <h2>Order Summary</h2>

                            <div className="summary-info">
                                <div className="info-row">
                                    <span className="info-label">
                                        <Wallet size={16} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                                        Payment Method
                                    </span>
                                    <span className="info-value">Cash on Delivery</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">
                                        <Package size={16} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                                        Total Items
                                    </span>
                                    <span className="info-value">{cartCount}</span>
                                </div>
                                <div className="summary-divider"></div>
                                <div className="info-row">
                                    <span className="info-label">Order Total</span>
                                    <span className="info-value" style={{ fontSize: '1.25rem', color: 'var(--primary-color)' }}>
                                        ₹{totalAmount.toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            <button
                                className="place-order-btn"
                                onClick={handlePlaceOrder}
                                disabled={isPlacingOrder || !selectedAddressId}
                            >
                                {isPlacingOrder ? 'Processing...' : 'Place Order →'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Address Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>Add New Address</h2>
                            <button className="close-modal-btn" onClick={() => setShowModal(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <button
                            className="location-btn"
                            onClick={handleUseCurrentLocation}
                            disabled={isLocating}
                        >
                            {isLocating ? 'Locating...' : (
                                <>
                                    <Navigation size={18} />
                                    Use Current Location
                                </>
                            )}
                        </button>

                        <div className="manual-divider">
                            <span>OR Enter Manually</span>
                        </div>

                        <form className="address-form" onSubmit={handleAddAddress}>
                            <div className="form-group">
                                <label>Street Address</label>
                                <input
                                    type="text"
                                    placeholder="House No, Building, Street Name"
                                    required
                                    value={newAddress.street}
                                    onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>City</label>
                                    <input
                                        type="text"
                                        placeholder="City"
                                        required
                                        value={newAddress.city}
                                        onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
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

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Zip Code</label>
                                    <input
                                        type="text"
                                        placeholder="6 digits zip code"
                                        required
                                        value={newAddress.zipCode}
                                        onChange={(e) => setNewAddress({ ...newAddress, zipCode: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
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

                            <label className="checkbox-group">
                                <input
                                    type="checkbox"
                                    checked={newAddress.isDefault}
                                    onChange={(e) => setNewAddress({ ...newAddress, isDefault: e.target.checked })}
                                />
                                Select as default address
                            </label>

                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="save-btn">
                                    Save Address
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeliveryAddress;
