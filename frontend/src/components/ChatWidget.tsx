import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, ShieldCheck, Minus } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { createOrGetSession, getSessionMessages } from '../services/chatService';
import { getProfile } from '../services/userService';
import { RoleName } from '../types/enums';
import '../styles/ChatWidget.css';

const ChatWidget: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [session, setSession] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [adminTyping, setAdminTyping] = useState(false);
    const socketRef = useRef<Socket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const role = localStorage.getItem('role');

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            initChat();
        }
    }, [isOpen]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, adminTyping]);

    const initChat = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token || role !== RoleName.USER) return;

            // Fetch user profile if not already set
            if (!user) {
                const userData = await getProfile();
                setUser(userData);
            }

            // Create or get existing session
            const sessionData = await createOrGetSession();
            setSession(sessionData);

            // Fetch history
            const history = await getSessionMessages(sessionData._id);
            setMessages(history);

            // Initialize Socket
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            const socketUrl = API_URL.replace('/api', '');

            if (!socketRef.current) {
                socketRef.current = io(socketUrl, {
                    auth: { token }
                });

                socketRef.current.emit('join_session', sessionData._id);

                socketRef.current.on('new_message', (message: any) => {
                    setMessages(prev => [...prev, message]);
                });

                socketRef.current.on('user_typing', (data: any) => {
                    if (data.sessionId === sessionData._id && data.userName !== user?.name) {
                        setAdminTyping(data.isTyping);
                    }
                });
            }
        } catch (error) {
            console.error('Failed to initialize chat:', error);
        }
    };

    const handleSendMessage = () => {
        if (!inputValue.trim() || !socketRef.current || !session || !user) return;

        const messageData = {
            sessionId: session._id,
            senderId: user._id,
            content: inputValue,
            userName: user.name
        };

        socketRef.current.emit('send_message', messageData);
        setInputValue('');

        // Stop typing indicator on send
        socketRef.current.emit('typing', {
            sessionId: session._id,
            isTyping: false,
            userName: user.name
        });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);

        if (socketRef.current && session && user) {
            socketRef.current.emit('typing', {
                sessionId: session._id,
                isTyping: e.target.value.length > 0,
                userName: user.name
            });
        }
    };

    const groupMessagesByDate = (msgs: any[]) => {
        const groups: { [key: string]: any[] } = {};
        msgs.forEach(msg => {
            const date = new Date(msg.createdAt).toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            if (!groups[date]) groups[date] = [];
            groups[date].push(msg);
        });
        return groups;
    };

    const groupedMessages = React.useMemo(() => groupMessagesByDate(messages), [messages]);

    if (!localStorage.getItem('token') || role !== RoleName.USER) return null;

    return (
        <div className="chat-widget-container">
            {isOpen && (
                <div className="chat-window-premium saas-reveal active">
                    <div className="chat-header-premium">
                        <div className="header-info-box">
                            <div className="support-avatar">
                                <ShieldCheck size={24} />
                            </div>
                            <div className="header-text-box">
                                <h3>Support Assistant</h3>
                                <div className="status-indicator">
                                    <div className="pulse-dot"></div>
                                    <span>Online</span>
                                </div>
                            </div>
                        </div>
                        <button className="minimal-close-btn" onClick={() => setIsOpen(false)}>
                            <Minus size={20} color="white" />
                        </button>
                    </div>

                    <div className="messages-area-premium">
                        <div className="message-bubble admin">
                            Hi there! 👋 How can we help you today?
                            <span className="message-time">Support • Just now</span>
                        </div>

                        {Object.entries(groupedMessages).map(([date, msgs]) => (
                            <React.Fragment key={date}>
                                <div className="chat-date-separator"><span>{date}</span></div>
                                {(msgs as any[]).map((msg, index) => (
                                    <div
                                        key={index}
                                        className={`message-bubble ${msg.sender_id?._id === user?._id || msg.sender_id === user?._id ? 'user' : 'admin'}`}
                                    >
                                        {msg.content}
                                        <span className="message-time">
                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                ))}
                            </React.Fragment>
                        ))}

                        {adminTyping && (
                            <div className="message-bubble admin typing">
                                <div className="typing-dots">
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="chat-input-area-premium">
                        <div className="input-wrapper-premium">
                            <input
                                type="text"
                                placeholder="Type your message..."
                                value={inputValue}
                                onChange={handleInputChange}
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            />
                            <button
                                className="send-btn-chat"
                                onClick={handleSendMessage}
                                disabled={!inputValue.trim()}
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <button className="chat-toggle-btn" onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? <X size={28} /> : <MessageCircle size={28} />}
            </button>
        </div>
    );
};

export default ChatWidget;
