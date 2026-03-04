import redis from '../config/redis';

const SESSION_PREFIX = 'sess:';
const BLACKLIST_PREFIX = 'bl:';
const DEFAULT_SESSION_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Save a session in Redis.
 * @param userId - ID of the user.
 * @param token - JWT token.
 * @param ttl - Time to live in seconds.
 */
export const saveSession = async (userId: string, token: string, ttl: number = DEFAULT_SESSION_TTL): Promise<void> => {
    if (!redis) return;
    const key = `${SESSION_PREFIX}${userId}:${token}`;
    await redis.set(key, '1', 'EX', ttl);
};

/**
 * Check if a session is valid in Redis.
 * @param userId - ID of the user.
 * @param token - JWT token.
 */
export const isValidSession = async (userId: string, token: string): Promise<boolean> => {
    if (!redis) return true; // Fallback if Redis is down
    const key = `${SESSION_PREFIX}${userId}:${token}`;
    const exists = await redis.exists(key);
    return exists === 1;
};

/**
 * Revoke a specific session from Redis.
 * @param userId - ID of the user.
 * @param token - JWT token.
 */
export const revokeSession = async (userId: string, token: string): Promise<void> => {
    if (!redis) return;
    const key = `${SESSION_PREFIX}${userId}:${token}`;
    await redis.del(key);
};

/**
 * Revoke all sessions for a specific user.
 * @param userId - ID of the user.
 */
export const revokeAllUserSessions = async (userId: string): Promise<void> => {
    if (!redis) return;
    const pattern = `${SESSION_PREFIX}${userId}:*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
        await redis.del(...keys);
    }
};

/**
 * Add a token to the blacklist.
 * @param token - JWT token to blacklist.
 * @param ttl - Time to live in seconds (time until token expires).
 */
export const blacklistToken = async (token: string, ttl: number): Promise<void> => {
    if (!redis) return;
    const key = `${BLACKLIST_PREFIX}${token}`;
    await redis.set(key, '1', 'EX', ttl > 0 ? ttl : 1);
};

/**
 * Check if a token is blacklisted.
 * @param token - JWT token.
 */
export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
    if (!redis) return false;
    const key = `${BLACKLIST_PREFIX}${token}`;
    const exists = await redis.exists(key);
    return exists === 1;
};
