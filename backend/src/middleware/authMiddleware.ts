import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';
import { IRole } from '../models/Role';
import { RoleName } from '../types/enums';
import * as sessionManager from '../utils/sessionManager';
import { UnauthorizedError } from '../utils/errors';

export interface AuthRequest extends Request {
  user?: IUser;
}

export const auth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  let token: string | undefined;

  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new UnauthorizedError('Not authorized, no token'));
  }

  try {
    // 1. Blacklist Check
    const tokenBlacklisted = await sessionManager.isTokenBlacklisted(token);

    if (tokenBlacklisted) {
      return next(new UnauthorizedError('Token has been revoked. Please login again.'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    const user = await User.findById(decoded.id)
      .populate('role_id')
      .populate('membership_id');

    if (!user) {
      return next(new UnauthorizedError('Not authorized, user not found'));
    }

    if (user.isDeleted) {
      return next(new UnauthorizedError('Account has been deleted'));
    }

    // 2. Redis Session Check
    let isSessionActive = true;
    if (process.env.NODE_ENV !== 'test') {
      isSessionActive = await sessionManager.isValidSession(user._id.toString(), token);
    }

    if (!isSessionActive) {
      // Fallback: If Redis doesn't have it, check database activeSessions (for transition)
      const isDbSessionActive = user.activeSessions?.some(s => s.token === token);

      if (!isDbSessionActive) {
        return next(new UnauthorizedError('Session has been revoked or expired. Please login again.'));
      }
    }

    req.user = user as IUser;
    next();
  } catch (error) {
    console.error('[AuthMiddleware] Error:', error);
    next(new UnauthorizedError('Not authorized, token failed'));
  }
};

export const checkRole = (roles: RoleName[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return next(new UnauthorizedError('Not authorized'));

    const userRole = (req.user.role_id as IRole).name;
    if (!roles.includes(userRole)) {
      return res
        .status(403)
        .json({ error: 'Forbidden: insufficient permissions' });
    }
    next();
  };
};
