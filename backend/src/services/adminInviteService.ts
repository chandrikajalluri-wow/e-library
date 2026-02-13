import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import AdminInvite, { IAdminInvite } from '../models/AdminInvite';
import User from '../models/User';
import Role from '../models/Role';
import ActivityLog from '../models/ActivityLog';
import { RoleName, InviteStatus, ActivityAction } from '../types/enums';
import { sendEmail } from '../utils/mailer';
import { getAdminInvitationTemplate } from '../utils/emailTemplates';

const INVITE_EXPIRY_HOURS = 24;
const TOKEN_LENGTH = 32; // Will produce 64-char hex string

/**
 * Generate a cryptographically secure random token
 * @returns Object with raw token (for email) and hashed token (for DB)
 */
export const generateSecureToken = async (): Promise<{
    rawToken: string;
    hashedToken: string;
}> => {
    // Generate 32 random bytes = 64 hex characters
    const rawToken = crypto.randomBytes(TOKEN_LENGTH).toString('hex');

    // Hash the token using bcrypt (cost factor 10)
    const hashedToken = await bcrypt.hash(rawToken, 10);

    return { rawToken, hashedToken };
};

/**
 * Create an admin invitation for a target user
 * @param targetUserId - ID of user to invite
 * @param invitedById - ID of super admin sending invite
 * @returns Success message or throws error
 */
export const createAdminInvite = async (
    targetUserId: string,
    invitedById: string
): Promise<{ message: string; email: string }> => {
    // 1. Validate inviter is not inviting themselves
    if (targetUserId === invitedById) {
        throw new Error('Cannot invite yourself');
    }

    // 2. Get target user
    const targetUser = await User.findById(targetUserId).populate('role_id');
    if (!targetUser) {
        throw new Error('Target user not found');
    }

    if (targetUser.isDeleted) {
        throw new Error('Cannot invite deleted user');
    }

    // 3. Check if user is already admin or super admin
    const userRole = (targetUser.role_id as any).name;
    if (userRole === RoleName.ADMIN || userRole === RoleName.SUPER_ADMIN) {
        throw new Error('User is already an admin');
    }

    // 4. Check for existing pending invite
    const existingInvite = await AdminInvite.findOne({
        email: targetUser.email,
        status: InviteStatus.PENDING,
    });

    if (existingInvite) {
        throw new Error('Invitation already sent to this user');
    }

    // 5. Generate secure token
    const { rawToken, hashedToken } = await generateSecureToken();

    // 6. Calculate expiry time (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + INVITE_EXPIRY_HOURS);

    // 7. Create invite record
    const invite = await AdminInvite.create({
        email: targetUser.email,
        token_hash: hashedToken,
        invited_by: invitedById,
        status: InviteStatus.PENDING,
        expires_at: expiresAt,
    });

    // 8. Get inviter details for email
    const inviter = await User.findById(invitedById);
    const inviterName = inviter?.name || 'Super Admin';

    // 9. Send invitation email
    const acceptLink = `${process.env.FRONTEND_URL}/accept-admin?token=${rawToken}`;

    try {
        await sendEmail(
            targetUser.email,
            'You\'ve been invited to become an Admin',
            `You have been invited by ${inviterName} to become an admin. Click the link to accept: ${acceptLink}`,
            getAdminInvitationTemplate(
                targetUser.name,
                inviterName,
                acceptLink,
                expiresAt
            )
        );
    } catch (emailError) {
        console.error('Failed to send invitation email:', emailError);
        // Don't throw - invite is created, can be resent manually
    }

    // 10. Log activity
    await ActivityLog.create({
        user_id: invitedById,
        action: ActivityAction.ADMIN_INVITE_SENT,
        description: `Invited ${targetUser.email} to become admin`,
    });

    return {
        message: 'Invitation sent successfully',
        email: targetUser.email,
    };
};

/**
 * Verify an invite token and return invite details
 * @param rawToken - The token from the URL
 * @returns Invite details or throws error
 */
export const verifyInviteToken = async (
    rawToken: string
): Promise<{
    email: string;
    inviterName: string;
    expiresAt: Date;
    isValid: boolean;
}> => {
    // Find all pending invites and check each one
    // (We can't query by hash directly since we need to compare)
    const pendingInvites = await AdminInvite.find({
        status: InviteStatus.PENDING,
    }).populate('invited_by');

    let matchedInvite: IAdminInvite | null = null;

    for (const invite of pendingInvites) {
        const isMatch = await bcrypt.compare(rawToken, invite.token_hash);
        if (isMatch) {
            matchedInvite = invite;
            break;
        }
    }

    if (!matchedInvite) {
        throw new Error('Invalid invitation link');
    }

    // Check if expired
    if (new Date() > matchedInvite.expires_at) {
        // Update status to expired
        matchedInvite.status = InviteStatus.EXPIRED;
        await matchedInvite.save();
        throw new Error('Invitation has expired');
    }

    const inviter = matchedInvite.invited_by as any;
    const inviterName = inviter?.name || 'Super Admin';

    return {
        email: matchedInvite.email,
        inviterName,
        expiresAt: matchedInvite.expires_at,
        isValid: true,
    };
};

/**
 * Accept an admin invitation
 * @param rawToken - The token from the URL
 * @returns Success message or throws error
 */
export const acceptInvite = async (
    rawToken: string
): Promise<{ message: string; email: string }> => {
    // 1. Verify token (this also checks expiry)
    const inviteDetails = await verifyInviteToken(rawToken);

    // 2. Find the invite again to update it
    const pendingInvites = await AdminInvite.find({
        status: InviteStatus.PENDING,
        email: inviteDetails.email,
    });

    let matchedInvite: IAdminInvite | null = null;

    for (const invite of pendingInvites) {
        const isMatch = await bcrypt.compare(rawToken, invite.token_hash);
        if (isMatch) {
            matchedInvite = invite;
            break;
        }
    }

    if (!matchedInvite) {
        throw new Error('Invitation not found or already used');
    }

    // 3. Find user by email
    const user = await User.findOne({ email: matchedInvite.email });
    if (!user) {
        throw new Error('User account no longer exists');
    }

    if (user.isDeleted) {
        throw new Error('User account has been deleted');
    }

    // 4. Get admin role ID
    const adminRole = await Role.findOne({ name: RoleName.ADMIN });
    if (!adminRole) {
        throw new Error('Admin role not found in system');
    }

    // 5. Update user role
    user.role_id = adminRole._id;
    await user.save();

    // 6. Update invite status
    matchedInvite.status = InviteStatus.ACCEPTED;
    matchedInvite.accepted_at = new Date();
    await matchedInvite.save();

    // 7. Log activity
    await ActivityLog.create({
        user_id: user._id,
        action: ActivityAction.ADMIN_INVITE_ACCEPTED,
        description: `Accepted admin invitation from ${inviteDetails.inviterName}`,
    });

    return {
        message: 'Admin invitation accepted successfully',
        email: user.email,
    };
};

/**
 * Cleanup expired invitations (for cron job)
 * @returns Number of invites marked as expired
 */
export const cleanupExpiredInvites = async (): Promise<number> => {
    const result = await AdminInvite.updateMany(
        {
            status: InviteStatus.PENDING,
            expires_at: { $lt: new Date() },
        },
        {
            $set: { status: InviteStatus.EXPIRED },
        }
    );

    console.log(`Marked ${result.modifiedCount} invites as expired`);
    return result.modifiedCount;
};
