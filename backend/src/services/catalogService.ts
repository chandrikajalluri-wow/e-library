import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors';
import Book from '../models/Book';
import Readlist from '../models/Readlist';
import Order from '../models/Order';
import ActivityLog from '../models/ActivityLog';
import User from '../models/User';
import Category, { ICategory } from '../models/Category';
import { notifySuperAdmins, notifyAllUsers } from '../utils/notification';
import { uploadToS3 } from '../utils/s3Service';
import { RoleName, BookStatus, OrderStatus, ActivityAction, NotificationType } from '../types/enums';
import { BaseService } from './baseService';

const bookRepo = new BaseService(Book);
const categoryRepo = new BaseService(Category);

// --- Category Logic ---

export const getAllCategories = async () => {
    const categories: any[] = await categoryRepo.findAll({}, { sort: { name: 1 } });

    const categoriesWithStats = await Promise.all(
        categories.map(async (cat: any) => {
            const bookCount = await Book.countDocuments({ category_id: cat._id });
            const catObj = cat.toObject ? cat.toObject() : cat;
            return {
                ...catObj,
                bookCount
            };
        })
    );

    return categoriesWithStats;
};

export const createCategory = async (name: string, description: string, user: any) => {
    const existing = await categoryRepo.findOne({ name });
    if (existing) {
        throw new Error('Category already exists');
    }

    const category = await categoryRepo.create({
        name,
        description,
        addedBy: user._id
    } as any);

    await new ActivityLog({
        user_id: user._id,
        action: ActivityAction.CATEGORY_CREATED,
        description: `Category ${category.name} created by ${user.name}`,
    }).save();

    const userRole = (user.role_id as any).name;
    if (userRole === RoleName.ADMIN) {
        await notifySuperAdmins(`Admin ${user.name} created a new category: ${category.name}`, NotificationType.CATEGORY_CREATED);
    }

    return category;
};

export const updateCategory = async (id: string, name: string, description: string, user: any) => {
    const category = await categoryRepo.update(id, { name, description });

    await new ActivityLog({
        user_id: user._id,
        action: ActivityAction.CATEGORY_UPDATED,
        description: `Category ${category.name} updated by ${user.name}`,
    }).save();

    const userRole = (user.role_id as any).name;
    if (userRole === RoleName.ADMIN) {
        await notifySuperAdmins(`Admin ${user.name} updated category: ${category.name}`, NotificationType.CATEGORY_UPDATED);
    }

    return category;
};

export const deleteCategory = async (id: string, user: any) => {
    const bookCount = await Book.countDocuments({ category_id: id });
    if (bookCount > 0) {
        throw new Error('Cannot delete category because there are books assigned to it.');
    }

    const category = await categoryRepo.delete(id);

    await new ActivityLog({
        user_id: user._id,
        action: ActivityAction.CATEGORY_DELETED,
        description: `Category ${category.name} deleted by ${user.name}`,
    }).save();

    const userRole = (user.role_id as any).name;
    if (userRole === RoleName.ADMIN) {
        await notifySuperAdmins(`Admin ${user.name} deleted category: ${category.name}`);
    }

    return { message: 'Category deleted' };
};

// --- Book Logic ---

export const getAllBooks = async (filters: any, pagination: { page: number; limit: number }, sort: any) => {
    const { search, category, genre, showArchived, isPremium, addedBy, language, stock } = filters;
    const query: any = {};

    if (addedBy) query.addedBy = addedBy;
    if (language) {
        const languages = (language as string).split(',').map(lang => new RegExp(`^${lang.trim()}$`, 'i'));
        query.language = { $in: languages };
    }
    if (search) {
        query.$or = [
            { title: { $regex: search, $options: 'i' } },
            { author: { $regex: search, $options: 'i' } },
        ];
    }
    if (category) {
        const categoryIds = (category as string).split(',');
        query.category_id = { $in: categoryIds };
    }
    if (genre) query.genre = genre;
    if (isPremium === 'true') query.isPremium = true;
    if (isPremium === 'false') query.isPremium = { $ne: true };

    if (stock === 'inStock') {
        query.noOfCopies = { $gt: 0 };
    } else if (stock === 'outOfStock') {
        query.noOfCopies = 0;
    } else if (stock === 'lowStock') {
        query.noOfCopies = { $lte: 2, $gt: 0 };
    }

    if (showArchived !== 'true') {
        query.status = { $ne: BookStatus.ARCHIVED };
    }

    const result = await bookRepo.findAll(query, {
        pagination,
        sort,
        populate: [
            { path: 'category_id', select: 'name' },
            { path: 'addedBy', select: 'name email' }
        ]
    });

    return {
        books: result.data,
        total: result.total,
        page: result.page,
        pages: result.pages,
    };
};

export const getBookById = async (id: string) => {
    return await bookRepo.findById(id, 'category_id');
};

export const createBook = async (bookData: any, files: any, user: any) => {
    const { title } = bookData;

    if (title) {
        const existingBook = await bookRepo.findOne({
            title: { $regex: new RegExp(`^${title.trim()}$`, 'i') }
        });
        if (existingBook) {
            throw new BadRequestError(`A book with the title "${title}" already exists.`);
        }
    }

    const userRole = (user.role_id as any).name;
    if (userRole === RoleName.ADMIN) {
        bookData.addedBy = user._id;
    } else if (userRole === RoleName.SUPER_ADMIN) {
        bookData.addedBy = bookData.addedBy || user._id;
    } else {
        bookData.addedBy = user._id;
    }

    if (files?.['cover_image']?.[0]) {
        bookData.cover_image_url = files['cover_image'][0].path;
    }
    if (files?.['author_image']?.[0]) {
        bookData.author_image_url = files['author_image'][0].path;
    }
    if (files?.['pdf']?.[0]) {
        const pdfFile = files['pdf'][0];
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const fileName = `${uniqueSuffix}_${pdfFile.originalname.replace(/\s+/g, '_')}`;
        bookData.pdf_url = await uploadToS3(pdfFile.buffer, fileName, pdfFile.mimetype);
    }

    const book = await bookRepo.create(bookData);

    await new ActivityLog({
        user_id: user._id,
        action: ActivityAction.BOOK_CREATED,
        description: `Added new book: ${book.title}`,
        book_id: book._id,
    }).save();

    if (userRole === RoleName.ADMIN) {
        await notifySuperAdmins(`Admin ${user.name} added a new book: ${book.title}`, NotificationType.BOOK_CREATED);
    }

    await notifyAllUsers(`New Addition: "${book.title}" is now available!`, 'system', book._id, RoleName.USER);

    return book;
};

export const updateBook = async (id: string, bookData: any, files: any, user: any) => {
    const userRole = (user.role_id as any).name;
    if (userRole === 'admin') {
        delete bookData.addedBy;
    }

    if (files?.['cover_image']?.[0]) {
        bookData.cover_image_url = files['cover_image'][0].path;
    }
    if (files?.['author_image']?.[0]) {
        bookData.author_image_url = files['author_image'][0].path;
    }
    if (files?.['pdf']?.[0]) {
        const pdfFile = files['pdf'][0];
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const fileName = `${uniqueSuffix}_${pdfFile.originalname.replace(/\s+/g, '_')}`;
        bookData.pdf_url = await uploadToS3(pdfFile.buffer, fileName, pdfFile.mimetype);
    }

    const book = await bookRepo.update(id, bookData);

    try {
        await new ActivityLog({
            user_id: user._id,
            action: ActivityAction.BOOK_UPDATED,
            description: `Updated book: ${book.title}`,
            book_id: book._id,
        }).save();

        if (userRole === RoleName.ADMIN) {
            await notifySuperAdmins(`Admin ${user.name} updated book: ${book.title}`, NotificationType.BOOK_UPDATED);
        }
    } catch (logErr) {
        console.error('Failed to log activity:', logErr);
    }

    return book;
};

export const deleteBook = async (id: string, user: any) => {
    const activeReadlist = await Readlist.findOne({
        book_id: id,
        status: 'active'
    });

    if (activeReadlist) {
        throw new BadRequestError('Cannot delete book because it is currently in a user\'s active readlist.');
    }

    const activeOrder = await Order.findOne({
        'items.book_id': id,
        status: { $in: ['pending', 'processing', 'shipped'] }
    });

    if (activeOrder) {
        throw new BadRequestError('Cannot delete book because it is part of an active order checkout.');
    }

    const book = await bookRepo.delete(id);

    await new ActivityLog({
        user_id: user._id,
        action: ActivityAction.BOOK_DELETED,
        description: `Deleted book: ${book.title}`,
        book_id: book._id,
    }).save();

    if ((user.role_id as any).name === RoleName.ADMIN) {
        await notifySuperAdmins(`Admin ${user.name} deleted book: ${book.title}`);
    }

    return { message: 'Book deleted' };
};

export const getSimilarBooks = async (id: string) => {
    const book = await bookRepo.findById(id);

    const similarBooks = await Book.find({
        _id: { $ne: id },
        $or: [
            { genre: book.genre },
            { author: book.author }
        ],
        status: { $ne: BookStatus.ARCHIVED }
    })
        .limit(5)
        .populate('category_id', 'name');

    return similarBooks;
};

export const getRecommendedBooks = async (user: any) => {
    const userId = user._id;
    const readlistItems = await Readlist.find({ user_id: userId }).populate('book_id');

    const borrowedBookIds = new Set<string>();
    const genres = new Set<string>();
    const authors = new Set<string>();
    const preferredCategoryIds = new Set<string>();

    const userData = await User.findById(userId);
    if (userData && userData.favoriteGenres) {
        userData.favoriteGenres.forEach((catId: any) => preferredCategoryIds.add(catId.toString()));
    }

    readlistItems.forEach((item: any) => {
        if (item.book_id) {
            borrowedBookIds.add((item.book_id as any)._id).toString();
            if ((item.book_id as any).genre) genres.add((item.book_id as any).genre);
            if ((item.book_id as any).author) authors.add((item.book_id as any).author);
            if ((item.book_id as any).category_id) preferredCategoryIds.add((item.book_id as any).category_id.toString());
        }
    });

    if (borrowedBookIds.size === 0 && preferredCategoryIds.size === 0) {
        return [];
    }

    const recommendations = await Book.find({
        _id: { $nin: Array.from(borrowedBookIds) },
        $or: [
            { genre: { $in: Array.from(genres) } },
            { author: { $in: Array.from(authors) } },
            { category_id: { $in: Array.from(preferredCategoryIds) } }
        ],
        status: { $ne: BookStatus.ARCHIVED }
    })
        .limit(8)
        .populate('category_id', 'name');

    return recommendations;
};

export const checkDeletionSafety = async (id: string) => {
    const activeReadlist = await Readlist.findOne({
        book_id: id,
        status: 'active'
    });

    if (activeReadlist) {
        return {
            canDelete: false,
            reason: 'This book is currently in a user\'s active readlist.'
        };
    }

    const activeOrder = await Order.findOne({
        'items.book_id': id,
        status: { $in: [OrderStatus.PENDING, OrderStatus.PROCESSING, OrderStatus.SHIPPED] }
    });

    if (activeOrder) {
        return {
            canDelete: false,
            reason: 'This book is part of an active order checkout.'
        };
    }

    return { canDelete: true };
};

export const validatePdfAccess = async (bookId: string, user: any) => {
    const book = await bookRepo.findById(bookId);

    if (!book.pdf_url) throw new NotFoundError('PDF URL is missing for this book');

    const userRole = (user?.role_id as any)?.name;
    const userId = user?._id;

    if (book.isPremium) {
        const membership = user?.membership_id as any;
        if (userRole !== RoleName.ADMIN && userRole !== RoleName.SUPER_ADMIN && !membership?.canAccessPremiumBooks) {
            throw new ForbiddenError('This is a premium book. Upgrade to Premium membership to read this book.');
        }
    }

    if (userRole !== RoleName.ADMIN && userRole !== RoleName.SUPER_ADMIN) {
        const readlistItem = await Readlist.findOne({
            user_id: userId,
            book_id: bookId,
            status: { $in: ['active', 'completed'] }
        }).sort({ addedAt: -1 });

        if (!readlistItem) {
            throw new ForbiddenError('You need to add this book to your library before you can read it.');
        }

        const now = new Date();
        const dueDate = readlistItem.dueDate ? new Date(readlistItem.dueDate) : null;
        const hasValidReadlist = dueDate && dueDate.getTime() > now.getTime();

        if (!hasValidReadlist) {
            throw new ForbiddenError('Your reading access for this book has expired. Please renew access from the book details page.');
        }
    }

    return book;
};
