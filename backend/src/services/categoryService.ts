import Category, { ICategory } from '../models/Category';
import ActivityLog from '../models/ActivityLog';
import Book from '../models/Book';
import { notifySuperAdmins } from '../utils/notification';
import { RoleName, ActivityAction, NotificationType } from '../types/enums';
import { Types } from 'mongoose';

export const getAllCategories = async () => {
    const categories = await Category.find({}).sort({ name: 1 });

    const categoriesWithStats = await Promise.all(
        categories.map(async (cat) => {
            const bookCount = await Book.countDocuments({ category_id: cat._id });
            return {
                ...cat.toObject(),
                bookCount
            };
        })
    );

    return categoriesWithStats;
};

export const createCategory = async (name: string, description: string, user: any) => {
    const existing = await Category.findOne({ name });
    if (existing) {
        throw new Error('Category already exists');
    }

    const category = new Category({
        name,
        description,
        addedBy: user._id
    });
    await category.save();

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
    const category = await Category.findByIdAndUpdate(
        id,
        { name, description },
        { new: true }
    );

    if (!category) {
        throw new Error('Category not found');
    }

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

    const category = await Category.findByIdAndDelete(id);
    if (!category) {
        throw new Error('Category not found');
    }

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
