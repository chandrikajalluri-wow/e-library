import express from 'express';
import { auth, checkRole } from '../middleware/authMiddleware';
import * as orderController from '../controllers/orderController';
import { RoleName } from '../types/enums';

const router = express.Router();

// Admin Routes
router.get('/admin/all', auth, checkRole([RoleName.ADMIN, RoleName.SUPER_ADMIN]), orderController.getAllOrders);

router.patch('/admin/:id/status', auth, checkRole([RoleName.ADMIN, RoleName.SUPER_ADMIN]), orderController.updateOrderStatus);
router.post('/admin/bulk-status', auth, checkRole([RoleName.ADMIN, RoleName.SUPER_ADMIN]), orderController.bulkUpdateOrderStatus);
router.get('/admin/:id', auth, checkRole([RoleName.ADMIN, RoleName.SUPER_ADMIN]), orderController.getOrderById);

// User Routes
router.get('/my-orders', auth, orderController.getMyOrders);
router.get('/my-order/:id', auth, orderController.getMyOrderById);
router.patch('/:id/cancel', auth, orderController.cancelOwnOrder);
router.patch('/:id/return', auth, orderController.requestReturnOrder);
router.post('/', auth, orderController.placeOrder);

export default router;
