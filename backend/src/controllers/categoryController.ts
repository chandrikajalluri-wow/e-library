import { Response } from 'express';
import Category from '../models/Category';
import ActivityLog from '../models/ActivityLog';
import Book from '../models/Book';
import { notifySuperAdmins } from '../utils/notification';
import { RoleName } from '../types/enums';

export const getAllCategories = async (req: any, res: Response) => {
    try {
        const query: any = {};
        const userRole = (req.user.role_id as any).name;

        if (userRole === RoleName.ADMIN) {
            query.$or = [
                { addedBy: req.user._id },
                { addedBy: { $exists: false } },
                { addedBy: null }
            ];
        }

        const categories = await Category.find(query).sort({ name: 1 });
        res.json(categories);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const createCategory = async (req: any, res: Response) => {
    const { name, description } = req.body;
    try {
        const existing = await Category.findOne({ name });
        if (existing)
            return res.status(400).json({ error: 'Category already exists' });

        const category = new Category({
            name,
            description,
            addedBy: req.user._id
        });
        await category.save();

        await new ActivityLog({
            user_id: req.user._id,
            action: `Created category: ${category.name}`,
            description: `Category ${category.name} created by ${req.user.name}`,
        }).save();

        const userRole = (req.user.role_id as any).name;
        if (userRole === RoleName.ADMIN) {
            await notifySuperAdmins(`Admin ${req.user.name} created a new category: ${category.name}`);
        }

        res.status(201).json(category);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const updateCategory = async (req: any, res: Response) => {
    const { name, description } = req.body;
    try {
        const category = await Category.findByIdAndUpdate(
            req.params.id,
            { name, description },
            { new: true }
        );
        if (!category)
            return res.status(404).json({ error: 'Category not found' });

        await new ActivityLog({
            user_id: req.user._id,
            action: `Updated category: ${category.name}`,
            description: `Category ${category.name} updated by ${req.user.name}`,
        }).save();

        const userRole = (req.user.role_id as any).name;
        if (userRole === RoleName.ADMIN) {
            await notifySuperAdmins(`Admin ${req.user.name} updated category: ${category.name}`);
        }

        res.json(category);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const deleteCategory = async (req: any, res: Response) => {
    try {
        const bookCount = await Book.countDocuments({ category: req.params.id });
        if (bookCount > 0) {
            return res.status(400).json({
                error: 'Cannot delete category because there are books assigned to it.'
            });
        }

        const category = await Category.findByIdAndDelete(req.params.id);
        if (!category)
            return res.status(404).json({ error: 'Category not found' });

        await new ActivityLog({
            user_id: req.user._id,
            action: `Deleted category: ${category.name}`,
            description: `Category ${category.name} deleted by ${req.user.name}`,
        }).save();

        const userRole = (req.user.role_id as any).name;
        if (userRole === RoleName.ADMIN) {
            await notifySuperAdmins(`Admin ${req.user.name} deleted category: ${category.name}`);
        }

        res.json({ message: 'Category deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};
