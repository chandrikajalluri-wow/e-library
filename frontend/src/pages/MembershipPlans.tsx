import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMembershipPlans, getMyMembership, upgradeMembership, type Membership } from '../services/membershipService';
import { MembershipName } from '../types/enums';
import { toast } from 'react-toastify';
import MembershipCard from '../components/MembershipCard';
import PaymentModal from '../components/PaymentModal';

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

    const handleUpgrade = async (membership: Membership) => {
        if (!isAuthenticated) {
            navigate('/signup');
            return;
        }

        if (membership.price === 0) {
            try {
                await upgradeMembership(membership._id);
                toast.success(`Successfully switched to ${membership.displayName} plan!`);
                loadData();
            } catch (err: any) {
                toast.error(err.response?.data?.error || 'Failed to switch plan');
            }
            return;
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
        <div className="memberships-page dashboard-container saas-reveal">
            <header className="admin-header">
                <div className="admin-header-titles">
                    <h1 className="admin-header-title">Membership Plans</h1>
                    <p className="admin-header-subtitle">Unlock more books and features with our flexible plans</p>
                </div>
            </header>

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
                                <th>{MembershipName.BASIC.charAt(0).toUpperCase() + MembershipName.BASIC.slice(1)}</th>
                                <th>{MembershipName.PREMIUM.charAt(0).toUpperCase() + MembershipName.PREMIUM.slice(1)}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Monthly Price</td>
                                <td>Free</td>
                                <td>₹99</td>
                            </tr>
                            <tr>
                                <td>Reading Limit</td>
                                <td>3 books</td>
                                <td>10 books</td>
                            </tr>
                            <tr>
                                <td>Reading Period</td>
                                <td>7 days</td>
                                <td>21 days</td>
                            </tr>
                            <tr>
                                <td>Delivery Time</td>
                                <td>3-4 Days</td>
                                <td>24 Hours</td>
                            </tr>
                            <tr>
                                <td>Delivery Fee</td>
                                <td>₹50 (Free over ₹500)</td>
                                <td>FREE</td>
                            </tr>
                            <tr>
                                <td>Request New Books</td>
                                <td>❌</td>
                                <td>✅</td>
                            </tr>
                            <tr>
                                <td>Premium Collection</td>
                                <td>❌</td>
                                <td>✅</td>
                            </tr>
                            <tr>
                                <td>Recommendations</td>
                                <td>❌</td>
                                <td>✅</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {
                isPaymentModalOpen && selectedMembership && (
                    <PaymentModal
                        membership={selectedMembership}
                        onClose={() => setIsPaymentModalOpen(false)}
                        onSuccess={handlePaymentSuccess}
                    />
                )
            }


        </div >
    );
};

export default MembershipPlans;
