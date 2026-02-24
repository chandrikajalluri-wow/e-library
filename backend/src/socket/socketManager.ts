import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import ChatMessage, { MessageType } from '../models/ChatMessage';
import ChatSession, { SessionStatus } from '../models/ChatSession';
import User from '../models/User';

// Tracking online users (UserId -> SocketId)
export const onlineUsers = new Map<string, string>();

export const initSocket = (io: Server) => {
    // Middleware for authentication
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) return next(new Error('Authentication error'));

            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
            const user = await User.findById(decoded.id).populate('role_id');
            if (!user) return next(new Error('User not found'));

            (socket as any).user = user;
            next();
        } catch (err) {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', (socket: Socket) => {
        const user = (socket as any).user;
        const userId = user._id.toString();

        onlineUsers.set(userId, socket.id);

        // Notify admins of presence change
        io.emit('presence_change', { userId, isOnline: true });

        socket.on('join_session', async (sessionId: string) => {
            socket.join(sessionId);
            console.log(`User joined session: ${sessionId}`);
        });

        socket.on('send_message', async (data: {
            sessionId: string;
            senderId: string;
            content: string;
            type?: MessageType;
        }) => {
            try {
                const { sessionId, senderId, content, type = MessageType.TEXT } = data;

                // Save message to database
                const newMessage = await ChatMessage.create({
                    session_id: sessionId,
                    sender_id: senderId,
                    content,
                    messageType: type,
                    isRead: false
                });

                // Update session
                const session = await ChatSession.findById(sessionId);
                if (session) {
                    session.lastMessage = newMessage._id as any;

                    // If sender is NOT the user (meaning it's an admin) and status is OPEN -> set to IN_PROGRESS
                    if (session.user_id.toString() !== senderId && session.status === SessionStatus.OPEN) {
                        session.status = SessionStatus.IN_PROGRESS;
                        session.admin_id = senderId as any;
                    }

                    await session.save();
                }

                // Emit to participants in the room
                io.to(sessionId).emit('new_message', newMessage);

                // Notify admins if it's from a user
                if (session && session.user_id.toString() === senderId) {
                    io.emit('admin_notification', {
                        type: 'new_chat_message',
                        sessionId,
                        content,
                        senderName: user.name
                    });
                }

            } catch (error) {
                console.error('Error sending message:', error);
                socket.emit('error', 'Failed to send message');
            }
        });

        socket.on('mark_read', async (data: { sessionId: string, userId: string }) => {
            try {
                // Mark all messages in this session as read IF they were sent by the other party
                // Simplified: mark all unread messages in session as read when admin views it
                await ChatMessage.updateMany(
                    { session_id: data.sessionId, sender_id: { $ne: data.userId }, isRead: false },
                    { $set: { isRead: true } }
                );
                // Optionally notify the sender that their messages were read
            } catch (err) {
                console.error('Error marking messages read:', err);
            }
        });

        socket.on('typing', (data: { sessionId: string, isTyping: boolean, userName: string }) => {
            socket.to(data.sessionId).emit('user_typing', data);
        });

        socket.on('disconnect', () => {
            onlineUsers.delete(userId);
            io.emit('presence_change', { userId, isOnline: false });
        });
    });
};
