import api from '../api';

export const getAllUsers = async () => {
    const response = await api.get('/super-admin/users');
    return response.data;
};

export const manageAdmin = async (userId: string, action: 'promote' | 'demote') => {
    const response = await api.post('/super-admin/manage-admin', { userId, action });
    return response.data;
};

export const deleteUser = async (userId: string, force: boolean = false) => {
    // Send force in body or query. Since original was delete, body might not be supported/standard in axios delete without structure.
    // Recommended: Use data property for delete body or query param. Let's use body with 'data' config.
    const response = await api.delete(`/super-admin/user/${userId}`, {
        data: { force }
    });
    return response.data;
};

export const revokeUserDeletion = async (userId: string) => {
    const response = await api.post(`/super-admin/user/${userId}/revoke-deletion`);
    return response.data;
};

export const getSystemLogs = async () => {
    const response = await api.get('/super-admin/system-logs');
    return response.data;
};

export const getSystemMetrics = async () => {
    const response = await api.get('/super-admin/metrics');
    return response.data;
};

export const getAnnouncements = async () => {
    const response = await api.get('/super-admin/announcements');
    return response.data;
};

export const createAnnouncement = async (title: string, content: string, type: string, targetPage: string) => {
    const response = await api.post('/super-admin/announcements', { title, content, type, targetPage });
    return response.data;
};

export const deleteAnnouncement = async (id: string) => {
    const response = await api.delete(`/super-admin/announcements/${id}`);
    return response.data;
};

export const getAllReviews = async () => {
    const response = await api.get('/super-admin/reviews');
    return response.data;
};

export const deleteReview = async (id: string) => {
    const response = await api.delete(`/super-admin/review/${id}`);
    return response.data;
};

export const getAdmins = async () => {
    const response = await api.get('/super-admin/admins');
    return response.data;
};

export const getContactQueries = async () => {
    const response = await api.get('/super-admin/contact-queries');
    return response.data;
};

export const updateContactQueryStatus = async (id: string, status: string) => {
    const response = await api.patch(`/super-admin/contact-queries/${id}`, { status });
    return response.data;
};

export const replyToContactQuery = async (id: string, replyText: string) => {
    const response = await api.post(`/super-admin/contact-queries/${id}/reply`, { replyText });
    return response.data;
};

export const getReportedReviews = async () => {
    const response = await api.get('/super-admin/reported-reviews');
    return response.data;
};

export const dismissReviewReports = async (id: string) => {
    const response = await api.patch(`/super-admin/reviews/${id}/dismiss`);
    return response.data;
};
