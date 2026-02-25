import Membership from '../models/Membership';
import User from '../models/User';
import ActivityLog from '../models/ActivityLog';
import { MembershipName, ActivityAction } from '../types/enums';

export const getAllMemberships = async () => {
    return await Membership.find().sort({ price: 1 });
};

export const getMyMembership = async (userId: string) => {
    const user = await User.findById(userId).populate('membership_id');
    if (!user) throw new Error('User not found');
    return user.membership_id || null;
};

export const upgradeMembership = async (userId: string, membershipId: string) => {
    const membership = await Membership.findById(membershipId);
    if (!membership) throw new Error('Membership plan not found');

    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    user.membership_id = membership._id;
    const now = new Date();
    const expiry = new Date(now);
    expiry.setDate(expiry.getDate() + 30);

    user.membershipStartDate = now;
    user.membershipExpiryDate = expiry;
    await user.save();

    await ActivityLog.create({
        user_id: user._id,
        action: ActivityAction.MEMBERSHIP_UPGRADED,
        description: `Upgraded to ${membership.displayName} membership`,
        timestamp: new Date()
    });

    return await User.findById(userId).populate('membership_id');
};

export const updateUserMembershipAdmin = async (userId: string, membershipId: string) => {
    const membership = await Membership.findById(membershipId);
    if (!membership) throw new Error('Membership plan not found');

    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    user.membership_id = membership._id;
    await user.save();

    await ActivityLog.create({
        user_id: user._id,
        action: ActivityAction.MEMBERSHIP_UPGRADED,
        description: `Admin updated user membership to ${membership.displayName}`,
        timestamp: new Date()
    });

    return await User.findById(userId).populate('membership_id');
};


