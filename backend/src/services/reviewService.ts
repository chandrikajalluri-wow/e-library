import Review from '../models/Review';
import Book from '../models/Book';
import Order from '../models/Order';
import Readlist from '../models/Readlist';
import ActivityLog from '../models/ActivityLog';
import { maskProfanity } from '../utils/profanityFilter';
import { notifySuperAdmins } from '../utils/notification';
import { ActivityAction, NotificationType } from '../types/enums';
import { BaseService } from './baseService';

const baseService = new BaseService(Review);

export const getReviewsForBook = async (bookId: string) => {
    return await baseService.findAll({ book_id: bookId }, {
        populate: { path: 'user_id', select: 'name' },
        sort: { reviewed_at: -1 }
    });
};

export const addReview = async (userId: string, bookId: string, rating: number, comment: string, userName: string) => {
    // Check if user has access via readlist or purchase
    const inReadlist = await Readlist.exists({ user_id: userId, book_id: bookId });
    const hasPurchased = await Order.exists({
        user_id: userId,
        'items.book_id': bookId,
        status: { $in: ['pending', 'shipped', 'delivered'] }
    });

    if (!inReadlist && !hasPurchased) {
        throw new Error('Only users who have read or purchased this book can leave a review');
    }

    const existing = await baseService.findOne({ user_id: userId, book_id: bookId });
    if (existing) throw new Error('You have already reviewed this book');

    const review = await baseService.create({
        user_id: userId as any,
        book_id: bookId as any,
        rating,
        comment: maskProfanity(comment),
    });

    // Update Book rating
    const allReviews: any = await baseService.findAll({ book_id: bookId });
    const avgRating = allReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / allReviews.length;
    const bookDoc = await Book.findByIdAndUpdate(bookId, { rating: Number(avgRating.toFixed(1)) }, { new: true });

    await ActivityLog.create({
        user_id: userId,
        action: 'REVIEW_ADDED',
        description: `Added review for: ${bookDoc?.title || 'Unknown Book'}`,
        book_id: bookId,
        timestamp: new Date()
    });

    return review;
};

export const updateReview = async (reviewId: string, userId: string, rating: number, comment: string) => {
    const review = await baseService.findById(reviewId);

    if (review.user_id.toString() !== userId.toString()) {
        throw new Error('Unauthorized to edit this review');
    }

    const updatedReview = await baseService.update(reviewId, {
        rating,
        comment: maskProfanity(comment),
        reviewed_at: new Date()
    } as any);

    // Update Book rating
    const allReviews: any = await baseService.findAll({ book_id: updatedReview.book_id });
    const avgRating = allReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / allReviews.length;
    await Book.findByIdAndUpdate(updatedReview.book_id, { rating: Number(avgRating.toFixed(1)) });

    return updatedReview;
};

export const likeReview = async (reviewId: string, userId: string) => {
    const review = await baseService.findById(reviewId);

    if (!review.likes) review.likes = [];
    if (!review.dislikes) review.dislikes = [];

    const userIdStr = userId.toString();

    if (review.likes.some(id => id.toString() === userIdStr)) {
        review.likes = review.likes.filter(id => id.toString() !== userIdStr);
    } else {
        review.likes.push(userId as any);
        review.dislikes = review.dislikes.filter(id => id.toString() !== userIdStr);
    }

    await review.save();
    return { likes: review.likes.length, dislikes: review.dislikes.length };
};

export const dislikeReview = async (reviewId: string, userId: string) => {
    const review = await baseService.findById(reviewId);

    if (!review.likes) review.likes = [];
    if (!review.dislikes) review.dislikes = [];

    const userIdStr = userId.toString();

    if (review.dislikes.some(id => id.toString() === userIdStr)) {
        review.dislikes = review.dislikes.filter(id => id.toString() !== userIdStr);
    } else {
        review.dislikes.push(userId as any);
        review.likes = review.likes.filter(id => id.toString() !== userIdStr);
    }

    await review.save();
    return { likes: review.likes.length, dislikes: review.dislikes.length };
};

export const reportReview = async (reviewId: string, userId: string, userName: string, reason: string) => {
    const review = await baseService.findById(reviewId, 'book_id');

    if (!review.reports) review.reports = [];

    const hasAlreadyReported = review.reports.some(r => r.user_id.toString() === userId.toString());
    if (hasAlreadyReported) throw new Error('You have already reported this review');

    review.reports.push({
        user_id: userId as any,
        reason,
        reported_at: new Date(),
    });

    await review.save();

    const bookTitle = (review.book_id as any).title || 'Unknown Book';
    await notifySuperAdmins(
        `Review reported by ${userName} for book "${bookTitle}". Reason: ${reason}`,
        NotificationType.REVIEW_REPORT
    );

    await ActivityLog.create({
        user_id: userId,
        action: ActivityAction.REVIEW_REPORTED,
        description: `Reported review for "${bookTitle}". Reason: ${reason}`,
        timestamp: new Date()
    });

    return true;
};
