import React, { useState, useEffect, useRef } from 'react';
import { Search, Send, User, MessageSquare, Filter, BarChart3 } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { getAllSessionsAdmin, getSessionMessages, closeSession } from '../services/chatService';
import { getProfile } from '../services/userService';
import { toast } from 'react-toastify';
import '../styles/AdminSupportManager.css';

const AdminSupportManager: React.FC = () => {
    const [sessions, setSessions] = useState<any[]>([]);
    const [activeSession, setActiveSession] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [admin, setAdmin] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [userTyping, setUserTyping] = useState<any>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'closed'>('all');
    const socketRef = useRef<Socket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        initAdminSupport();
        return () => {
            socketRef.current?.disconnect();
        };
    }, []);

    useEffect(() => {
        if (activeSession) {
            loadSessionMessages(activeSession._id);
        }
    }, [activeSession]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const initAdminSupport = async () => {
        try {
            const adminData = await getProfile();
            setAdmin(adminData);

            const allSessions = await getAllSessionsAdmin();
            setSessions(allSessions);

            const token = localStorage.getItem('token');
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            const socketUrl = API_URL.replace('/api', '');

            socketRef.current = io(socketUrl, {
                auth: { token }
            });

            socketRef.current.on('admin_notification', (notif: any) => {
                if (notif.type === 'new_chat_message') {
                    refreshSessions();
                }
            });

            socketRef.current.on('new_message', (message: any) => {
                if (activeSession && message.session_id === activeSession._id) {
                    setMessages(prev => [...prev, message]);
                }
                refreshSessions();
            });

            socketRef.current.on('user_typing', (data: any) => {
                if (activeSession && data.sessionId === activeSession._id) {
                    setUserTyping(data.isTyping ? data.userName : null);
                }
            });

        } catch (error) {
            console.error('Failed to init admin support:', error);
            toast.error('Failed to load support sessions');
        }
    };

    const refreshSessions = async () => {
        const allSessions = await getAllSessionsAdmin();
        setSessions(allSessions);
    };

    const loadSessionMessages = async (sessionId: string) => {
        try {
            const data = await getSessionMessages(sessionId);
            setMessages(data);
            socketRef.current?.emit('join_session', sessionId);
        } catch (error) {
            toast.error('Failed to load messages');
        }
    };

    const handleSendMessage = () => {
        if (!inputValue.trim() || !socketRef.current || !activeSession || !admin) return;

        const messageData = {
            sessionId: activeSession._id,
            senderId: admin._id,
            content: inputValue,
            userName: admin.name
        };

        socketRef.current.emit('send_message', messageData);
        setInputValue('');

        socketRef.current.emit('typing', {
            sessionId: activeSession._id,
            isTyping: false,
            userName: admin.name
        });
    };

    const handleCloseSession = async (sessionId: string) => {
        try {
            await closeSession(sessionId);
            toast.success('Session closed');
            setActiveSession(null);
            refreshSessions();
        } catch (error) {
            toast.error('Failed to close session');
        }
    };

    const filteredSessions = sessions.filter(s => {
        const matchesSearch = s.user_id?.name.toLowerCase().includes(searchTerm.toLowerCase()) || s._id.includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const stats = {
        open: sessions.filter(s => s.status === 'open').length,
        inProgress: sessions.filter(s => s.status === 'in_progress').length,
        closed: sessions.filter(s => s.status === 'closed').length
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

    const groupedMessages = groupMessagesByDate(messages);

    return (
        <div className="admin-support-container saas-reveal active">
            <div className="sessions-sidebar">
                <div className="sidebar-header">
                    <div className="title-stack">
                        <h2>Support Center</h2>
                        <p className="subtitle">Real-time interactions</p>
                    </div>
                </div>

                <div className="stats-mini-row">
                    <div className="stat-card-mini">
                        <span className="value">{stats.open}</span>
                        <span className="label">Open</span>
                    </div>
                    <div className="stat-card-mini">
                        <span className="value">{stats.inProgress}</span>
                        <span className="label">Active</span>
                    </div>
                    <div className="stat-card-mini">
                        <span className="value">{stats.closed}</span>
                        <span className="label">Closed</span>
                    </div>
                </div>

                <div className="sidebar-controls">
                    <div className="search-box-premium">
                        <Search size={14} />
                        <input
                            type="text"
                            placeholder="Search user or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="filter-tabs">
                        <button className={statusFilter === 'all' ? 'active' : ''} onClick={() => setStatusFilter('all')}>All</button>
                        <button className={statusFilter === 'open' ? 'active' : ''} onClick={() => setStatusFilter('open')}>Open</button>
                        <button className={statusFilter === 'in_progress' ? 'active' : ''} onClick={() => setStatusFilter('in_progress')}>Active</button>
                        <button className={statusFilter === 'closed' ? 'active' : ''} onClick={() => setStatusFilter('closed')}>Archived</button>
                    </div>
                </div>

                <div className="sessions-list">
                    {filteredSessions.map(session => (
                        <div
                            key={session._id}
                            className={`session-item ${activeSession?._id === session._id ? 'active' : ''}`}
                            onClick={() => setActiveSession(session)}
                        >
                            <div className="user-avatar-premium">
                                {session.user_id?.profileImage ? (
                                    <img src={session.user_id.profileImage} alt="" />
                                ) : (
                                    <div className="avatar-placeholder">{session.user_id?.name?.charAt(0)}</div>
                                )}
                                <div className={`presence-dot ${session.status}`}></div>
                            </div>
                            <div className="session-content">
                                <div className="session-top">
                                    <h4>{session.user_id?.name}</h4>
                                    <span className="time-ago">
                                        {session.lastMessage ? new Date(session.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                    </span>
                                </div>
                                <p className="last-msg">{session.lastMessage?.content || 'Started a new session'}</p>
                            </div>
                        </div>
                    ))}
                    {filteredSessions.length === 0 && (
                        <div className="empty-search-state">
                            <Filter size={32} />
                            <p>No {statusFilter !== 'all' ? statusFilter : ''} chats found</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="chat-main-area">
                {activeSession ? (
                    <>
                        <div className="active-chat-header-premium">
                            <div className="header-user">
                                <div className="user-avatar-premium small">
                                    {activeSession.user_id?.profileImage ? <img src={activeSession.user_id.profileImage} alt="" /> : <User size={20} />}
                                </div>
                                <div>
                                    <h3>{activeSession.user_id?.name}</h3>
                                    <p className="user-meta">{activeSession.user_id?.email}</p>
                                </div>
                            </div>
                            <div className="actions-cluster">
                                <div className={`status-tag ${activeSession.status}`}>{activeSession.status.replace('_', ' ')}</div>
                                <button
                                    className="btn-close-action"
                                    onClick={() => handleCloseSession(activeSession._id)}
                                >
                                    End Session
                                </button>
                            </div>
                        </div>

                        <div className="admin-messages-container">
                            {Object.entries(groupedMessages).map(([date, msgs]) => (
                                <React.Fragment key={date}>
                                    <div className="date-separator"><span>{date}</span></div>
                                    {msgs.map((msg, index) => (
                                        <div
                                            key={index}
                                            className={`admin-chat-bubble ${msg.sender_id?._id === admin?._id || msg.sender_id === admin?._id ? 'mine' : 'other'}`}
                                        >
                                            {msg.content}
                                            <span className="msg-timestamp">
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    ))}
                                </React.Fragment>
                            ))}
                            {userTyping && (
                                <div className="typing-indicator-admin">
                                    <span className="dot"></span>
                                    <span className="text">{userTyping} is typing...</span>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="admin-chat-input-premium">
                            <div className="input-group-enhanced">
                                <input
                                    type="text"
                                    placeholder="Write your response..."
                                    value={inputValue}
                                    onChange={(e) => {
                                        setInputValue(e.target.value);
                                        socketRef.current?.emit('typing', {
                                            sessionId: activeSession._id,
                                            isTyping: e.target.value.length > 0,
                                            userName: admin.name
                                        });
                                    }}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                />
                                <button
                                    className="btn-send-premium"
                                    onClick={handleSendMessage}
                                    disabled={!inputValue.trim()}
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="chat-welcome-state">
                        <div className="welcome-icon">
                            <MessageSquare size={48} />
                        </div>
                        <h2>Inbox Assistant</h2>
                        <p>Select a user from the sidebar to start a real-time conversation.</p>
                        <div className="quick-stats">
                            <div className="stat">
                                <BarChart3 size={16} />
                                <span>{stats.open + stats.inProgress} active requests</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminSupportManager;
