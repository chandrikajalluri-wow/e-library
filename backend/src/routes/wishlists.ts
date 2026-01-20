import express from 'express';
import { auth, checkRole } from '../middleware/authMiddleware';
import { RoleName } from '../types/enums';
import * as wishlistController from '../controllers/wishlistController';

const router = express.Router();

// Get My Wishlist
router.get('/', auth, wishlistController.getMyWishlist);

// Get All Wishlists (Admin - for Stats)
router.get('/all', auth, checkRole([RoleName.ADMIN]), wishlistController.getAllWishlists);

// Add to Wishlist
router.post('/', auth, wishlistController.addToWishlist);

// Remove from Wishlist
router.delete('/:id', auth, wishlistController.removeFromWishlist);

export default router;
