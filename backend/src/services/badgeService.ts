import { eventBus, Events } from '../utils/eventBus';
import User from '../models/User';
import ActivityLog from '../models/ActivityLog';
import { ActivityAction, NotificationType } from '../types/enums';
import { sendNotification } from '../utils/notification';

export enum BadgeType {
    STREAK_7 = 'STREAK_7',
    STREAK_30 = 'STREAK_30',
    READER_LITE = 'READER_LITE',
    READER_PRO = 'READER_PRO',
    CRITIC = 'CRITIC',
}

const BADGE_CONFIG = {
    [BadgeType.STREAK_7]: { name: '7-Day Streak', description: 'Logged in for 7 consecutive days' },
    [BadgeType.STREAK_30]: { name: '30-Day Streak', description: 'Logged in for 30 consecutive days' },
    [BadgeType.READER_LITE]: { name: 'Avid Reader', description: 'Completed 5 books' },
    [BadgeType.READER_PRO]: { name: 'Reading Pro', description: 'Completed 20 books' },
    [BadgeType.CRITIC]: { name: 'Book Critic', description: 'Added 5 reviews' },
};

export class BadgeService {
    public static init() {
        console.log('[BadgeService] Initializing listeners...');
        
        eventBus.on(Events.USER_LOGIN, async (data) => {
            const { userId, streakCount } = data;
            await this.checkStreakBadges(userId, streakCount);
        });

        eventBus.on(Events.BOOK_COMPLETED, async (data) => {
            const { userId } = data;
            await this.checkReaderBadges(userId);
        });

        eventBus.on(Events.REVIEW_ADDED, async (data) => {
            const { userId } = data;
            await this.checkCriticBadges(userId);
        });
    }

    private static async awardBadge(userId: string, badgeType: BadgeType, metadata?: any) {
        const user = await User.findById(userId);
        if (!user) return;

        // Check if user already has this badge
        const hasBadge = user.badges?.some(b => b.type === badgeType);
        if (hasBadge) return;

        const badgeInfo = BADGE_CONFIG[badgeType];
        
        user.badges = user.badges || [];
        user.badges.push({
            type: badgeType,
            awardedAt: new Date(),
            metadata
        });

        await user.save();

        // Log activity
        await ActivityLog.create({
            user_id: user._id,
            action: ActivityAction.BADGE_AWARDED,
            description: `Awarded badge: ${badgeInfo.name}`,
            timestamp: new Date()
        });

        // Send notification
        await sendNotification(
            NotificationType.BADGE,
            `Congratulations! You've earned the "${badgeInfo.name}" badge!`,
            user._id as any
        );

        console.log(`[BadgeService] Badge ${badgeType} awarded to user ${userId}`);
    }

    private static async checkStreakBadges(userId: string, streakCount: number) {
        if (streakCount >= 30) {
            await this.awardBadge(userId, BadgeType.STREAK_30);
        } else if (streakCount >= 7) {
            await this.awardBadge(userId, BadgeType.STREAK_7);
        }
    }

    private static async checkReaderBadges(userId: string) {
        const user = await User.findById(userId);
        if (!user) return;

        // We can use the booksRead field which is updated in getMe or query Readlist
        // For efficiency, let's query the Readlist count for status 'completed'
        const mongoose = require('mongoose');
        const Readlist = mongoose.model('Readlist');
        const completedCount = await Readlist.countDocuments({ user_id: userId, status: 'completed' });

        if (completedCount >= 20) {
            await this.awardBadge(userId, BadgeType.READER_PRO);
        } else if (completedCount >= 5) {
            await this.awardBadge(userId, BadgeType.READER_LITE);
        }
    }

    private static async checkCriticBadges(userId: string) {
        const mongoose = require('mongoose');
        const Review = mongoose.model('Review');
        const reviewCount = await Review.countDocuments({ user_id: userId });

        if (reviewCount >= 5) {
            await this.awardBadge(userId, BadgeType.CRITIC);
        }
    }
}
