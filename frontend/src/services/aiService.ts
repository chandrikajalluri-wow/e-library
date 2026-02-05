import api from '../api';

interface GeneratedContent {
    description: string;
    authorBio: string;
    summary?: string;
}

export const generateBookContent = async (
    title: string,
    author: string
): Promise<GeneratedContent> => {
    try {
        const response = await api.post(
            '/ai/generate-book-content',
            { title, author }
        );

        return response.data.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.error || 'Failed to generate content with AI'
        );
    }
};

export const explainBook = async (
    title: string,
    author: string,
    description: string
): Promise<{ explanation: string }> => {
    try {
        const response = await api.post(
            '/ai/explain-book',
            { title, author, description }
        );

        return response.data.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.error || 'Failed to get explanation from AI'
        );
    }
};
