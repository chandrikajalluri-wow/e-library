import api from '../api';

const BASE_URL = 'users';

export const getDashboardStats = async () => {
    const res = await api.get(`${BASE_URL}/dashboard-stats`);
    return res.data;
};

export const getProfile = async () => {
    const res = await api.get(`${BASE_URL}/me`);
    return res.data;
};

export const updateProfile = async (formData: FormData) => {
    const res = await api.put(`${BASE_URL}/profile`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
};

export const changePassword = async (passwordData: any) => {
    const res = await api.put(`${BASE_URL}/change-password`, passwordData);
    return res.data;
};

export const renewMembership = async () => {
    const res = await api.post(`${BASE_URL}/renew-membership`, {});
    return res.data;
};

export const requestBook = async (requestData: any) => {
    const res = await api.post(`${BASE_URL}/book-requests`, requestData);
    return res.data;
};

// Admin Methods
export const getAllBookRequests = async () => {
    const res = await api.get(`${BASE_URL}/admin/book-requests`);
    return res.data;
};

export const updateBookRequestStatus = async (id: string, status: string) => {
    const res = await api.put(`${BASE_URL}/admin/book-requests/${id}`, { status });
    return res.data;
};



export const getSessions = async () => {
    const res = await api.get(`${BASE_URL}/sessions`);
    return res.data;
};

export const revokeSession = async (token: string) => {
    const res = await api.post(`${BASE_URL}/sessions/revoke`, { token });
    return res.data;
};

export const logoutAll = async () => {
    const res = await api.post(`${BASE_URL}/logout-all`, {});
    return res.data;
};

export const deleteAccount = async (password: string) => {
    const res = await api.delete(`${BASE_URL}/me`, { data: { password } });
    return res.data;
};

// Address Management
export const getAddresses = async () => {
    const res = await api.get(`${BASE_URL}/addresses`);
    return res.data;
};

export const addAddress = async (addressData: any) => {
    const res = await api.post(`${BASE_URL}/addresses`, addressData);
    return res.data;
};

// Cart Management
export const getCart = async () => {
    const res = await api.get(`${BASE_URL}/cart`);
    return res.data;
};

export const syncCart = async (cartItems: any[]) => {
    const res = await api.post(`${BASE_URL}/cart/sync`, { cartItems });
    return res.data;
};

export const clearCart = async () => {
    const res = await api.delete(`${BASE_URL}/cart`);
    return res.data;
};

// Readlist Management
export const getReadlist = async () => {
    const res = await api.get(`${BASE_URL}/readlist`);
    return res.data;
};

// Check if user has access to book (either in readlist or purchased)
export const checkBookAccess = async (bookId: string) => {
    const res = await api.get(`${BASE_URL}/book-access/${bookId}`);
    return res.data;
};
