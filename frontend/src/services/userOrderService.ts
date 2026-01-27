
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
        const response = await api.get(`orders/admin/${orderId}`);
        return response.data;
    } catch (error: any) {
        throw error.response?.data?.error || 'Failed to fetch order details';
    }
};
