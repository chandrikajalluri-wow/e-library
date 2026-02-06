import api from '../api';

export const createOrGetSession = async () => {
    const { data } = await api.post('/chat/session');
    return data;
};

export const getSessionMessages = async (sessionId: string) => {
    const { data } = await api.get(`/chat/messages/${sessionId}`);
    return data;
};

export const getAllSessionsAdmin = async () => {
    const { data } = await api.get('/chat/admin/sessions');
    return data;
};

export const closeSession = async (sessionId: string) => {
    const { data } = await api.patch(`/chat/admin/close/${sessionId}`);
    return data;
};
