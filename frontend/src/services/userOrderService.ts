
import api from '../api';

export const getMyOrders = async () => {
    try {
        const response = await api.get('orders/my-orders');
        return response.data;
    } catch (error: any) {
        throw error.response?.data?.error || 'Failed to fetch your orders';
    }
};

export const getOrderDetails = async (orderId: string) => {
    try {
        const response = await api.get(`orders/my-order/${orderId}`);
        return response.data;
    } catch (error: any) {
        throw error.response?.data?.error || 'Failed to fetch order details';
    }
};
export const cancelOrder = async (orderId: string) => {
    try {
        const response = await api.patch(`orders/${orderId}/cancel`);
        return response.data;
    } catch (error: any) {
        throw error.response?.data?.error || 'Failed to cancel order';
    }
};

export const requestReturn = async (orderId: string, reason: string) => {
    try {
        const response = await api.patch(`orders/${orderId}/return`, { reason });
        return response.data;
    } catch (error: any) {
        throw error.response?.data?.error || 'Failed to submit return request';
    }
};
