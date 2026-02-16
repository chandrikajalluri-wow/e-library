
import api from '../api';
import { toast } from 'react-toastify';

export const getAllOrders = async (filters: any) => {
    try {
        const queryParams = new URLSearchParams();
        if (filters.status && filters.status !== 'all') queryParams.append('status', filters.status);
        if (filters.search) queryParams.append('search', filters.search);
        if (filters.sort) queryParams.append('sort', filters.sort);
        if (filters.startDate) queryParams.append('startDate', filters.startDate);
        if (filters.endDate) queryParams.append('endDate', filters.endDate);
        if (filters.membership && filters.membership !== 'all') queryParams.append('membership', filters.membership);
        if (filters.page) queryParams.append('page', filters.page.toString());
        if (filters.limit) queryParams.append('limit', filters.limit.toString());

        // API base URL is already configured in api.ts, just append the endpoint
        const response = await api.get(`orders/admin/all?${queryParams.toString()}`);
        return response.data;
    } catch (error: any) {
        throw error.response?.data?.error || 'Failed to fetch orders';
    }
};

export const updateOrderStatus = async (orderId: string, status: string) => {
    try {
        const response = await api.patch(`orders/admin/${orderId}/status`, { status });
        return response.data;
    } catch (error: any) {
        throw error.response?.data?.error || 'Failed to update order status';
    }
};

export const getOrderById = async (orderId: string) => {
    try {
        const response = await api.get(`orders/admin/${orderId}`);
        return response.data;
    } catch (error: any) {
        throw error.response?.data?.error || 'Failed to fetch order details';
    }
};
export const bulkUpdateOrderStatus = async (orderIds: string[], status: string) => {
    try {
        const response = await api.post('orders/admin/bulk-status', { orderIds, status });
        return response.data;
    } catch (error: any) {
        throw error.response?.data?.error || 'Failed to perform bulk update';
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
