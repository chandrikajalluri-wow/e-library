import ChatSession, { SessionStatus } from '../models/ChatSession';
import ChatMessage from '../models/ChatMessage';
import Contact from '../models/Contact';
import User from '../models/User';
import ActivityLog from '../models/ActivityLog';
import { ActivityAction, NotificationType } from '../types/enums';
import { sendEmail } from '../utils/mailer';
import { notifySuperAdmins } from '../utils/notification';
import { getContactResponseTemplate } from '../utils/emailTemplates';
import { onlineUsers } from '../socket/socketManager';
import { BaseService } from './baseService';

const chatSessionRepo = new BaseService(ChatSession);
const chatMessageRepo = new BaseService(ChatMessage);
const contactRepo = new BaseService(Contact);

// --- Chat Logic ---

export const createOrGetSession = async (userId: string) => {
    let session = await chatSessionRepo.findOne({
        user_id: userId,
        status: { $ne: SessionStatus.CLOSED }
    }, { populate: { path: 'admin_id', select: 'name profileImage' } });

    if (!session) {
        session = await chatSessionRepo.create({
            user_id: userId,
            status: SessionStatus.OPEN
        });
    }

    return session;
};

export const getSessionMessages = async (sessionId: string) => {
    return await chatMessageRepo.findAll({ session_id: sessionId }, {
        sort: { createdAt: 1 },
        populate: { path: 'sender_id', select: 'name profileImage role_id' }
    }).then(res => res.data);
};

export const getAllSessionsAdmin = async () => {
    const sessions = await ChatSession.find()
        .populate('user_id', 'name email profileImage')
        .populate('admin_id', 'name')
        .populate({
            path: 'lastMessage',
            populate: { path: 'sender_id', select: 'name' }
        })
        .sort({ updatedAt: -1 });

    return await Promise.all(sessions.map(async (session: any) => {
        const userId = session.user_id?._id.toString();
        const unreadCount = await ChatMessage.countDocuments({
            session_id: session._id,
            sender_id: session.user_id?._id,
            isRead: false
        });

        return {
            ...session.toObject(),
            isOnline: onlineUsers.has(userId),
            unreadCount
        };
    }));
};

export const closeSession = async (sessionId: string) => {
    return await chatSessionRepo.update(sessionId, { status: SessionStatus.CLOSED });
};

// --- Contact Logic ---

export const submitContactForm = async (data: { name: string, email: string, message: string }) => {
    const { name, email, message } = data;
    if (!name || !email || !message) {
        throw new Error('All fields are required');
    }

    await contactRepo.create({ name, email, message });

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
