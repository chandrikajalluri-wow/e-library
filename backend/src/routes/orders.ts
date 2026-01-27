import express from 'express';
import { auth } from '../middleware/authMiddleware';
import * as orderController from '../controllers/orderController';

const router = express.Router();

// Admin Routes
router.get('/admin/all', auth, orderController.getAllOrders);

router.patch('/admin/:id/status', auth, orderController.updateOrderStatus);
router.get('/admin/:id', auth, orderController.getOrderById);

router.post('/', auth, orderController.placeOrder);

export default router;
