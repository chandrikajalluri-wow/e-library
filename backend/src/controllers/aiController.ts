import { Request, Response } from 'express';
import { generateBookContent } from '../services/aiService';

export const generateBookContentController = async (req: Request, res: Response) => {
    try {
        const { title, author } = req.body;

        // Validate required fields
        if (!title || !author) {
            return res.status(400).json({
                error: 'Book title and author are required'
            });
        }

        // Validate input length
        if (title.length > 200 || author.length > 100) {
            return res.status(400).json({
                error: 'Title or author name is too long'
            });
        }

        // Generate content using AI
        const generatedContent = await generateBookContent(title.trim(), author.trim());

        res.status(200).json({
            success: true,
            data: generatedContent
        });
    } catch (error: any) {
        console.error('AI Controller Error:', error);
        res.status(500).json({
            error: error.message || 'Failed to generate book content'
        });
    }
};
