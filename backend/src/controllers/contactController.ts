import { Request, Response } from 'express';
import { sendEmail } from '../utils/mailer';
import Contact from '../models/Contact';
import { notifySuperAdmins } from '../utils/notification';
import { getContactResponseTemplate } from '../utils/emailTemplates';

export const submitContactForm = async (req: Request, res: Response) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        await Contact.create({ name, email, message });

        const userSubject = 'We received your message - BookStack Support';
        const userText = `Hi ${name},\n\nThank you for contacting BookStack. We have received your query and our team will get back to you soon.\n\nYour message:\n"${message}"\n\nBest regards,\nBookStack Administration`;

        await sendEmail(email, userSubject, userText, getContactResponseTemplate(name, message));

        const adminSubject = 'New Contact Us Submission - BookStack';
        const adminText = `New message from ${name} (${email}):\n\n${message}`;
        await sendEmail(process.env.EMAIL_USER!, adminSubject, adminText);

        // Notify Super Admins
        await notifySuperAdmins(
            `New Query Received: ${message.substring(0, 30)}${message.length > 30 ? '...' : ''} from ${name}`,
            'system' as any
        );

        res.json({ message: 'Message sent successfully. An automated response has been sent to your email.' });
    } catch (err) {
        console.error('Contact form error:', err);
        res.status(500).json({ error: 'Failed to process message' });
    }
};
