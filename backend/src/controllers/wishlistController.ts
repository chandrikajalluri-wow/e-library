import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import * as wishlistService from '../services/wishlistService';

export const getMyWishlist = async (req: AuthRequest, res: Response) => {
    try {
        const items = await wishlistService.getMyWishlist(req.user!._id);
        res.json(items);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getAllWishlists = async (req: AuthRequest, res: Response) => {
    try {
        const items = await wishlistService.getAllWishlistsAdmin();
        res.json(items);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const addToWishlist = async (req: AuthRequest, res: Response) => {
    try {
        const { book_id } = req.body;
        const item = await wishlistService.addToWishlist(req.user!._id, book_id);
        res.status(201).json(item);
    } catch (err: any) {
        console.log(err);
        res.status(err.message === 'Already in wishlist' ? 400 : 500).json({ error: err.message });
    }
};

export const removeFromWishlist = async (req: AuthRequest, res: Response) => {
    try {
        await wishlistService.removeFromWishlist(req.params.id);
        res.json({ message: 'Removed from wishlist' });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Server error' });
    }
};

