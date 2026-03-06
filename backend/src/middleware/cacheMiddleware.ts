import { Response, NextFunction } from 'express';
import redis from '../config/redis';
import { AuthRequest } from './authMiddleware';

/**
 * Middleware to cache JSON responses in Redis.
 * @param keyPrefix - Prefix for the Redis key.
 * @param ttlSeconds - Time-To-Live in seconds (default: 300s / 5m).
 * @param isUserSpecific - If true, appends the user ID to the cache key.
 */
export const cacheMiddleware = (keyPrefix: string, ttlSeconds: number = 300, isUserSpecific: boolean = false) => {
    return async (req: any, res: Response, next: NextFunction) => {
        if (!redis) {
            return next();
        }

        let cacheKey = keyPrefix;
        if (isUserSpecific && req.user) {
            cacheKey = `${keyPrefix}:${req.user._id}`;
        }

        try {
            const cachedData = await redis.get(cacheKey);
            if (cachedData) {
                // console.log(`Cache hit for ${cacheKey}`);
                return res.json(JSON.parse(cachedData));
            }

            // Override res.json to capture the response and cache it
            const originalJson = res.json.bind(res);
            res.json = (body: any) => {
                // Only cache successful responses
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    const cacheOp = redis?.set(cacheKey, JSON.stringify(body), 'EX', ttlSeconds);
                    if (cacheOp instanceof Promise) {
                        cacheOp.catch(err => console.error('Redis cache set error:', err));
                    }
                }
                return originalJson(body);
            };

            next();
        } catch (err) {
            console.error('Redis cache middleware error:', err);
            next();
        }
    };
};

/**
 * Utility to clear specific cache keys or patterns.
 * @param pattern - Redis key or pattern to delete.
 */
export const clearCache = async (pattern: string) => {
    if (!redis) return;
    try {
        if (pattern.includes('*')) {
            const keys = await redis.keys(pattern);
            if (keys.length > 0) {
                await redis.del(...keys);
            }
        } else {
            await redis.del(pattern);
        }
    } catch (err) {
        console.error('Redis clear cache error:', err);
    }
};
