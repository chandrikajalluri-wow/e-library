
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

export const requestReturn = async (orderId: string, data: string | FormData) => {
    try {
        const payload = data instanceof FormData ? data : { reason: data };
        const response = await api.patch(`orders/${orderId}/return`, payload, {
            headers: {
                'Content-Type': data instanceof FormData ? 'multipart/form-data' : 'application/json'
            }
        });
        return response.data;
    } catch (error: any) {
        throw error.response?.data?.error || 'Failed to submit exchange request';
    }
};
