import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Membership } from '../services/membershipService';
import '../styles/MembershipCard.css';

interface MembershipCardProps {
    membership: Membership;
    currentMembership?: Membership | null;
    isAuthenticated: boolean;
    onUpgrade: (membership: Membership) => void;
}

const MembershipCard: React.FC<MembershipCardProps> = ({
    membership,
    currentMembership,
    isAuthenticated,
    onUpgrade,
}) => {
    const navigate = useNavigate();
    const isCurrent = currentMembership?._id === membership._id;
    const isPremium = membership.name === 'premium';

    const handleAction = () => {
        if (!isAuthenticated) {
            navigate('/signup');
        } else if (isCurrent) {
            return; // Do nothing if it's the current plan
        } else {
            onUpgrade(membership);
        }
    };

    const getButtonText = () => {
        if (!isAuthenticated) return 'Sign Up';
        if (isCurrent) return 'Current Plan';
        if (membership.price === 0) return 'Downgrade';
        return 'Upgrade Now';
    };

    return (
        <div className={`membership-card ${isPremium ? 'membership-card-premium' : ''} ${isCurrent ? 'membership-card-current' : ''}`}>
            {isPremium && <div className="membership-card-badge">Most Popular</div>}
            {isCurrent && <div className="membership-card-current-badge">Your Plan</div>}

            <div className="membership-card-header">
                <h3 className="membership-card-title">{membership.displayName}</h3>
                <div className="membership-card-price">
                    {membership.price === 0 ? (
                        <span className="price-free">FREE</span>
                    ) : (
                        <>
                            <span className="price-amount">₹{membership.price}</span>
                            <span className="price-period">/month</span>
                        </>
                    )}
                </div>
                <p className="membership-card-description">{membership.description}</p>
            </div>

            <ul className="membership-card-features">
                {membership.features.map((feature, index) => (
                    <li key={index} className="membership-feature-item">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <span>{feature}</span>
                    </li>
                ))}
            </ul>

            <button
                className={`membership-card-button ${isCurrent ? 'membership-card-button-current' : ''}`}
                onClick={handleAction}
                disabled={isCurrent}
            >
                {getButtonText()}
            </button>
        </div>
    );
};

export default MembershipCard;
