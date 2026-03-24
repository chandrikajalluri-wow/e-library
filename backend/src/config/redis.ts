import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
    console.warn('REDIS_URL is not defined in environment variables. Redis features will be disabled.');
}

const redis = redisUrl ? new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
    connectTimeout: 10000, // 10 seconds
}) : null;

if (redis) {
    redis.on('connect', () => {
        console.log('Successfully connected to Redis (Upstash)');
    });

    redis.on('error', (err) => {
        console.error('Redis connection error:', err);
    });
}

export default redis;
