import axios from 'axios';

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
        // Validate API key
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is not set in environment variables');
        }

        console.log('[AI Service] API Key present: true');
        console.log('[AI Service] Generating content for:', title, 'by', author);

        /**
         * Using direct REST API instead of SDK to access v1 API
         * This allows us to use gemini-2.5-flash which is the current stable model
         * 
         * The SDK uses v1beta which has deprecated model names
         * Direct REST API gives us access to v1 with current models
         */
        const model = 'gemini-2.5-flash';
        const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`;

        const prompt = `You are a knowledgeable library content assistant. Generate compelling content for this book:

Book Title: "${title}"
Author: "${author}"

INSTRUCTIONS:
1. If you recognize this book and author, provide ACCURATE factual information about the actual book
2. If you're uncertain or the book is lesser-known, generate professional, engaging content that:
   - Reflects what the title and author name suggest about the book's genre/theme
   - Sounds authentic and appropriate for a library catalog
   - Is helpful to potential readers
3. Ensure the author name in your response matches "${author}" exactly
4. DO NOT refuse to generate content - always provide helpful information
5. Keep responses concise and professional

Provide the following in JSON format:
1. description: An engaging book description that captures the likely plot, themes, or subject matter (MAXIMUM 50 words)
2. authorBio: Author biography with background and writing style. If unknown, create a professional bio appropriate for the genre (MAXIMUM 50 words)
3. summary: A brief summary of the book's main content (MAXIMUM 50 words)

REQUIREMENTS:
- Each field must be 50 words or less
- Be engaging and professional
- Make content appropriate for "${title}" by ${author}
- Use factual information when available, otherwise generate plausible content
- Always provide complete responses - never refuse or say "no information available"

Return ONLY valid JSON with these exact keys: description, authorBio, summary`;

        console.log('[AI Service] Calling Gemini API with model:', model);

        const response = await axios.post(
            apiUrl,
            {
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            },
            {
                params: {
                    key: apiKey
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('[AI Service] Received response from Gemini');

        // Extract text from response
        const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
            console.error('[AI Service] Invalid response structure:', JSON.stringify(response.data));
            throw new Error('Invalid response from AI service');
        }

        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error('[AI Service] Failed to extract JSON from response:', text);
            throw new Error('Failed to parse AI response - no JSON found');
        }

        const generatedContent: GeneratedContent = JSON.parse(jsonMatch[0]);

        // Validate word count (50 words max)
        const validateWordCount = (text: string, maxWords: number = 50): string => {
            const words = text.trim().split(/\s+/);
            if (words.length > maxWords) {
                return words.slice(0, maxWords).join(' ') + '...';
            }
            return text;
        };

        const result_data = {
            description: validateWordCount(generatedContent.description),
            authorBio: validateWordCount(generatedContent.authorBio),
            summary: generatedContent.summary ? validateWordCount(generatedContent.summary) : undefined
        };

        console.log('[AI Service] Successfully generated and validated content');
        return result_data;

    } catch (error: any) {
        console.error('[AI Service] Error:', error.response?.data || error.message);

        // Provide helpful error messages
        if (error.response?.status === 404) {
            throw new Error('AI model not available. The API or model may have changed.');
        }

        if (error.response?.status === 403 || error.response?.status === 401) {
            throw new Error('Invalid Gemini API key. Please check your .env file.');
        }

        if (error.response?.data?.error?.message) {
            throw new Error(error.response.data.error.message);
        }

        throw new Error(error.message || 'Failed to generate content with AI');
    }
};
