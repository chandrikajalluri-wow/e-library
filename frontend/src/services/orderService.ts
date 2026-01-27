import api from '../api';

const BASE_URL = 'orders';

export const placeOrder = async (orderData: { items: any[], selectedAddressId: string }) => {
    const res = await api.post(BASE_URL, orderData);
    return res.data;
};
