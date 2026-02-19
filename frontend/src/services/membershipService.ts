import api from '../api';

export interface Membership {
    _id: string;
    name: string;
    displayName: string;
    price: number;
    monthlyLimit: number;
    accessDuration: number;
    canRequestBooks: boolean;
    canAccessPremiumBooks: boolean;
    hasRecommendations: boolean;
    description: string;
    features: string[];
}

export const getMembershipPlans = async (): Promise<Membership[]> => {
    const res = await api.get('/memberships');
    return res.data;
};

export const getMyMembership = async (): Promise<Membership | null> => {
    const res = await api.get('/memberships/my');
    return res.data;
};

export const upgradeMembership = async (membershipId: string): Promise<{ message: string; membership: Membership }> => {
    const res = await api.put('/memberships/upgrade', { membershipId });
    return res.data;
};

export const updateUserMembership = async (userId: string, membershipId: string): Promise<unknown> => {
    const res = await api.put(`/memberships/admin/users/${userId}/membership`, { membershipId });
    return res.data;
};

export const cancelMembership = async (reason: string): Promise<{ message: string; membership: Membership }> => {
    const res = await api.put('/memberships/cancel', { reason });
    return res.data;
};

export const renewMembership = async (): Promise<{ message: string; membershipExpiryDate: string }> => {
    const res = await api.post('/users/renew-membership');
    return res.data;
};
