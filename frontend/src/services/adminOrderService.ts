
import api from '../api';

export const getAllOrders = async (filters: any) => {
    try {
        const queryParams = new URLSearchParams();
        if (filters.status && filters.status !== 'all') queryParams.append('status', filters.status);
        if (filters.search) queryParams.append('search', filters.search);
        if (filters.sort) queryParams.append('sort', filters.sort);
        if (filters.startDate) queryParams.append('startDate', filters.startDate);
        if (filters.endDate) queryParams.append('endDate', filters.endDate);

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
