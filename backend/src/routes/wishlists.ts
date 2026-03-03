import express from 'express';
import { auth, checkRole } from '../middleware/authMiddleware';
import { RoleName } from '../types/enums';
import * as userProfileController from '../controllers/userProfileController';

const router = express.Router();

// Get My Wishlist
router.get('/', auth, userProfileController.getMyWishlist);

// Get All Wishlists (Admin - for Stats)
router.get('/all', auth, checkRole([RoleName.ADMIN]), userProfileController.getAllWishlists);

// Add to Wishlist
router.post('/', auth, userProfileController.addToWishlist);

// Remove from Wishlist
router.delete('/:id', auth, userProfileController.removeFromWishlist);

export default router;
