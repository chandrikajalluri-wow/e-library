import { Server, Socket } from 'socket.io';
import ChatMessage, { MessageType } from '../models/ChatMessage';
import ChatSession from '../models/ChatSession';

export const initSocket = (io: Server) => {
    io.on('connection', (socket: Socket) => {
        console.log('New client connected:', socket.id);

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
                    messageType: type
                });

                // Update session's last message
                await ChatSession.findByIdAndUpdate(sessionId, {
                    lastMessage: newMessage._id
                });

                // Emit to todos in the room
                io.to(sessionId).emit('new_message', newMessage);

                // Also notify admins if it's a new message in an open session
                io.emit('admin_notification', {
                    type: 'new_chat_message',
                    sessionId,
                    content
                });

            } catch (error) {
                console.error('Error sending message:', error);
                socket.emit('error', 'Failed to send message');
            }
        });

        socket.on('typing', (data: { sessionId: string, isTyping: boolean, userName: string }) => {
            socket.to(data.sessionId).emit('user_typing', data);
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });
};
