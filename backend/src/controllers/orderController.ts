import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import * as orderService from '../services/orderService';

export const placeOrder = async (req: AuthRequest, res: Response) => {
    try {
        const { items, selectedAddressId } = req.body;
        const newOrder = await orderService.placeOrder(req.user!._id, items, selectedAddressId);
        res.status(201).json({ message: 'Order placed successfully', order: newOrder });
    } catch (err: any) {
        console.error('Order error:', err);
        res.status(err.message.includes('not found') || err.message.includes('empty') || err.message.includes('required') ? 404 : 400).json({ error: err.message });
    }
};

export const getAllOrders = async (req: AuthRequest, res: Response) => {
    try {
        const result = await orderService.getAllOrders(req.query);
        res.status(200).json(result);
    } catch (error: any) {
        console.error('Get all orders error:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const order = await orderService.updateOrderStatus(id, status, req.user);
        res.status(200).json({ message: 'Order status updated successfully', order });
    } catch (error: any) {
        console.error('Update order status error:', error);
        res.status(error.message.includes('Invalid') ? 400 : 500).json({ error: error.message });
    }
};

export const submitRefundDetails = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const order = await orderService.submitRefundDetails(id, req.user!._id, req.body, req.user!.name);
        res.status(200).json({ message: 'Refund details submitted successfully', order });
    } catch (error: any) {
        console.error('Submit refund details error:', error);
        res.status(error.message === 'Unauthorized' ? 403 : 400).json({ error: error.message });
    }
};

export const bulkUpdateOrderStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { orderIds, status } = req.body;
        const result = await orderService.bulkUpdateOrderStatus(orderIds, status, req.user);
        res.status(200).json({
            message: `Successfully updated ${result.modifiedCount} orders to ${status}. ${result.skippedCount} orders were skipped.`,
            ...result
        });
    } catch (error: any) {
        console.error('Bulk update order status error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getOrderById = async (req: AuthRequest, res: Response) => {
    try {
        const order = await orderService.getOrderById(req.params.id);
        res.status(200).json(order);
    } catch (error: any) {
        console.error('Get order by ID error:', error);
        res.status(404).json({ error: error.message });
    }
};

export const getMyOrders = async (req: AuthRequest, res: Response) => {
    try {
        const orders = await orderService.getMyOrders(req.user!._id, req.query);
        res.status(200).json(orders);
    } catch (error: any) {
        console.error('Get my orders error:', error);
        res.status(500).json({ error: 'Failed to fetch your orders' });
    }
};

export const cancelOwnOrder = async (req: AuthRequest, res: Response) => {
    try {
        const order = await orderService.cancelOwnOrder(req.params.id, req.user!._id);
        res.status(200).json({ message: 'Order cancelled successfully', order });
    } catch (error: any) {
        console.error('Cancel order error:', error);
        res.status(error.message === 'Unauthorized' ? 403 : 400).json({ error: error.message });
    }
};

export const getMyOrderById = async (req: AuthRequest, res: Response) => {
    try {
        const order = await orderService.getOrderById(req.params.id);
        if (order.user_id._id.toString() !== req.user!._id.toString()) {
            return res.status(403).json({ error: 'Unauthorized to view this order' });
        }
        res.status(200).json(order);
    } catch (error: any) {
        console.error('Get my order by ID error:', error);
        res.status(404).json({ error: error.message });
    }
};

export const requestReturnOrder = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const order = await orderService.requestReturnOrder(id, req.user!._id, reason, req.file, req.user!.name);
        res.status(200).json({ message: 'Exchange request submitted successfully', order });
    } catch (error: any) {
        console.error('Request exchange error:', error);
        res.status(error.message === 'Unauthorized' ? 403 : 400).json({ error: error.message });
    }
};

export const getOrderInvoice = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { buffer, orderId } = await orderService.generateInvoicePdf(id, req.user);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=Invoice_${orderId.toString().toUpperCase()}.pdf`,
            'Content-Length': buffer.length
        });
        res.send(buffer);
    } catch (error: any) {
        console.error(`[InvoiceError] Failed to generate invoice:`, error);
        res.status(error.message === 'Unauthorized' ? 403 : 500).json({ error: error.message });
    }
};

