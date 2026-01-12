import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMembershipPlans, getMyMembership, type Membership } from '../services/membershipService';
import MembershipCard from '../components/MembershipCard';
import PaymentModal from '../components/PaymentModal';
import Footer from '../components/Footer';
import '../styles/MembershipPlans.css';

const MembershipPlans: React.FC = () => {
    const navigate = useNavigate();
    const [memberships, setMemberships] = useState<Membership[]>([]);
    const [currentMembership, setCurrentMembership] = useState<Membership | null>(null);
    const [selectedMembership, setSelectedMembership] = useState<Membership | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const isAuthenticated = !!localStorage.getItem('token');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const mData = await getMembershipPlans();
            setMemberships(mData);

            if (isAuthenticated) {
                const currentData = await getMyMembership();
                setCurrentMembership(currentData);
            }
        } catch (err) {
            console.error('Error loading memberships:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpgrade = (membership: Membership) => {
        if (!isAuthenticated) {
            navigate('/signup');
            return;
        }

        if (membership.price === 0) {
            return; // No downgrades for now
        }

        setSelectedMembership(membership);
        setIsPaymentModalOpen(true);
    };

    const handlePaymentSuccess = () => {
        loadData();
        setIsPaymentModalOpen(false);
        setSelectedMembership(null);
    };

    if (loading) {
        return (
            <div className="memberships-loading">
                <div className="loader"></div>
                <p>Loading membership plans...</p>
            </div>
        );
    }

    return (
        <div className="memberships-page">
            <div className="memberships-header">
                <h1>Membership Plans</h1>
                <p>Unlock more books and features with our flexible plans</p>
            </div>

            <div className="memberships-container">
                <div className="membership-plans-grid">
                    {memberships.map((m) => (
                        <MembershipCard
                            key={m._id}
                            membership={m}
                            currentMembership={currentMembership}
                            isAuthenticated={isAuthenticated}
                            onUpgrade={handleUpgrade}
                        />
                    ))}
                </div>
            </div>

            <div className="memberships-comparison">
                <h2>Features Comparison</h2>
                <div className="comparison-table-wrapper">
                    <table className="comparison-table">
                        <thead>
                            <tr>
                                <th>Feature</th>
                                <th>Basic</th>
                                <th>Standard</th>
                                <th>Premium</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Monthly Price</td>
                                <td>Free</td>
                                <td>₹49</td>
                                <td>₹99</td>
                            </tr>
                            <tr>
                                <td>Books Limit</td>
                                <td>3 books</td>
                                <td>5 books</td>
                                <td>10 books</td>
                            </tr>
                            <tr>
                                <td>Borrow Period</td>
                                <td>7 days</td>
                                <td>14 days</td>
                                <td>21 days</td>
                            </tr>
                            <tr>
                                <td>Request New Books</td>
                                <td>❌</td>
                                <td>✅</td>
                                <td>✅</td>
                            </tr>
                            <tr>
                                <td>Premium Collection</td>
                                <td>❌</td>
                                <td>❌</td>
                                <td>✅</td>
                            </tr>
                            <tr>
                                <td>Renew Books</td>
                                <td>❌</td>
                                <td>❌</td>
                                <td>✅</td>
                            </tr>
                            <tr>
                                <td>Recommendations</td>
                                <td>❌</td>
                                <td>❌</td>
                                <td>✅</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {isPaymentModalOpen && selectedMembership && (
                <PaymentModal
                    membership={selectedMembership}
                    onClose={() => setIsPaymentModalOpen(false)}
                    onSuccess={handlePaymentSuccess}
                />
            )}

            <Footer />
        </div>
    );
};

export default MembershipPlans;
