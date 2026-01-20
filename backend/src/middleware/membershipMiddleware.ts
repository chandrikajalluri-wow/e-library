import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';
import { IMembership } from '../models/Membership';
import { MembershipName } from '../types/enums';

/**
 * Middleware to check if the user has a required membership plan.
 * @param allowedPlans - Array of allowed membership plan names.
 */
export const checkMembership = (allowedPlans: MembershipName[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authorized' });
        }

        const membership = req.user.membership_id as unknown as IMembership;

        if (!membership || !allowedPlans.includes(membership.name)) {
            return res.status(403).json({
                error: `Access denied: This feature requires a ${allowedPlans.join(' or ')} membership.`
            });
        }

        next();
    };
};
