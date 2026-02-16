
import api from '../api';
import { toast } from 'react-toastify';

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
export const downloadInvoice = async (orderId: string) => {
    try {
        const response = await api.get(`orders/${orderId}/invoice`, {
            responseType: 'blob'
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Invoice_${orderId.toUpperCase()}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    } catch (error: any) {
        if (error.response?.data instanceof Blob) {
            const reader = new FileReader();
            return new Promise((_, reject) => {
                reader.onload = () => {
                    try {
                        const message = JSON.parse(reader.result as string).error || 'Failed to download invoice';
                        toast.error(message);
                        reject(message);
                    } catch (e) {
                        toast.error('Failed to download invoice');
                        reject('Failed to download invoice');
                    }
                };
                reader.onerror = () => {
                    toast.error('Failed to download invoice');
                    reject('Failed to download invoice');
                };
                reader.readAsText(error.response.data);
            });
        }
        const errorMessage = error.response?.data?.error || 'Failed to download invoice';
        toast.error(errorMessage);
        throw errorMessage;
    }
};

export const submitRefundDetails = async (orderId: string, details: any) => {
    try {
        const response = await api.patch(`orders/${orderId}/refund-details`, details);
        return response.data;
    } catch (error: any) {
        throw error.response?.data?.error || 'Failed to submit refund details';
    }
};
