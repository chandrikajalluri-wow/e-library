import { Response } from 'express';
import * as categoryService from '../services/categoryService';

export const getAllCategories = async (req: any, res: Response) => {
    try {
        const categories = await categoryService.getAllCategories();
        res.json(categories);
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const createCategory = async (req: any, res: Response) => {
    const { name, description } = req.body;
    try {
        const category = await categoryService.createCategory(name, description, req.user);
        res.status(201).json(category);
    } catch (err: any) {
        console.error(err);
        if (err.message === 'Category already exists') {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Server error' });
    }
};

export const updateCategory = async (req: any, res: Response) => {
    const { name, description } = req.body;
    try {
        const category = await categoryService.updateCategory(req.params.id, name, description, req.user);
        res.json(category);
    } catch (err: any) {
        console.error(err);
        if (err.message === 'Category not found') {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: 'Server error' });
    }
};

export const deleteCategory = async (req: any, res: Response) => {
    try {
        const result = await categoryService.deleteCategory(req.params.id, req.user);
        res.json(result);
    } catch (err: any) {
        console.error(err);
        if (err.message === 'Category not found') {
            return res.status(404).json({ error: err.message });
        }
        if (err.message === 'Cannot delete category because there are books assigned to it.') {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Server error' });
    }
};

