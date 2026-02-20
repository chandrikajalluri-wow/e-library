import Contact from '../models/Contact';
import User from '../models/User';
import ActivityLog from '../models/ActivityLog';
import { ActivityAction, NotificationType } from '../types/enums';
import { sendEmail } from '../utils/mailer';
import { notifySuperAdmins } from '../utils/notification';
import { getContactResponseTemplate } from '../utils/emailTemplates';

export const submitContactForm = async (data: { name: string, email: string, message: string }) => {
    const { name, email, message } = data;
    if (!name || !email || !message) {
        throw new Error('All fields are required');
    }

    await Contact.create({ name, email, message });

    // Send confirmation email to user
    const userSubject = 'We received your message - BookStack Support';
    const userText = `Hi ${name},\n\nThank you for contacting BookStack. We have received your query and our team will get back to you soon.\n\nYour message:\n"${message}"\n\nBest regards,\nBookStack Administration`;
    await sendEmail(email, userSubject, userText, getContactResponseTemplate(name, message));

    // Send notification email to admin
    const adminSubject = 'New Contact Us Submission - BookStack';
    const adminText = `New message from ${name} (${email}):\n\n${message}`;
    await sendEmail(process.env.EMAIL_USER!, adminSubject, adminText);

    // Notify Super Admins via In-App Notification
    await notifySuperAdmins(
        `New Query Received: ${message.substring(0, 30)}${message.length > 30 ? '...' : ''} from ${name}`,
        NotificationType.CONTACT_QUERY
    );

    // Log the activity
    const user = await User.findOne({ email });
    await ActivityLog.create({
        user_id: user?._id,
        action: ActivityAction.CONTACT_FORM_SUBMITTED,
        description: `Contact form submitted by ${name} (${email}): "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`,
        timestamp: new Date()
    });

    return true;
};
