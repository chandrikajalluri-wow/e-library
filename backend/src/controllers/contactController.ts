import { Request, Response } from 'express';
import * as contactService from '../services/contactService';

export const submitContactForm = async (req: Request, res: Response) => {
    try {
        await contactService.submitContactForm(req.body);
        res.json({ message: 'Message sent successfully. An automated response has been sent to your email.' });
    } catch (err: any) {
        console.error('Contact form error:', err);
        res.status(err.message === 'All fields are required' ? 400 : 500).json({ error: err.message });
    }
};

