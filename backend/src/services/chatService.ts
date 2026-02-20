import ChatSession, { SessionStatus } from '../models/ChatSession';
import ChatMessage from '../models/ChatMessage';
import { onlineUsers } from '../socket/socketManager';

export const createOrGetSession = async (userId: string) => {
    let session = await ChatSession.findOne({
        user_id: userId,
        status: { $ne: SessionStatus.CLOSED }
    }).populate('admin_id', 'name profileImage');

    if (!session) {
        session = await ChatSession.create({
            user_id: userId,
            status: SessionStatus.OPEN
        });
    }

    return session;
};

export const getSessionMessages = async (sessionId: string) => {
    return await ChatMessage.find({ session_id: sessionId })
        .sort({ createdAt: 1 })
        .populate('sender_id', 'name profileImage role_id');
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
    return await ChatSession.findByIdAndUpdate(
        sessionId,
        { status: SessionStatus.CLOSED },
        { new: true }
    );
};
