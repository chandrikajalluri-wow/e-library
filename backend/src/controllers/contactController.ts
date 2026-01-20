import { Request, Response } from 'express';
import { sendEmail } from '../utils/mailer';

export const submitContactForm = async (req: Request, res: Response) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const userSubject = 'We received your message - E-Library Support';
        const userText = `Hi ${name},\n\nThank you for contacting E-Library Global System. We have received your query and our team will get back to you soon.\n\nYour message:\n"${message}"\n\nBest regards,\nE-Library Administration`;

        await sendEmail(email, userSubject, userText);

        const adminSubject = 'New Contact Us Submission';
        const adminText = `New message from ${name} (${email}):\n\n${message}`;
        await sendEmail(process.env.EMAIL_USER!, adminSubject, adminText);

        res.json({ message: 'Message sent successfully. An automated response has been sent to your email.' });
    } catch (err) {
        console.error('Contact form error:', err);
        res.status(500).json({ error: 'Failed to process message' });
    }
};
