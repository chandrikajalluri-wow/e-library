import React, { useState, useEffect, useRef } from 'react';
import { Search, Send, User, MessageSquare, Filter, BarChart3, X, ArrowLeft, Info } from 'lucide-react';
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
    const [showUserDetails, setShowUserDetails] = useState(false);
    const socketRef = useRef<Socket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const activeSessionRef = useRef<any>(null);
    const adminRef = useRef<any>(null);

    // Keep refs in sync with state for socket listeners
    useEffect(() => {
        activeSessionRef.current = activeSession;
    }, [activeSession]);

    useEffect(() => {
        adminRef.current = admin;
    }, [admin]);

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
                auth: { token },
                transports: ['websocket']
            });

            socketRef.current.on('admin_notification', (notif: any) => {
                if (notif.type === 'new_chat_message') {
                    debouncedRefresh();
                }
            });

            socketRef.current.on('new_message', (message: any) => {
                const currentActive = activeSessionRef.current;
                if (currentActive && message.session_id === currentActive._id) {
                    setMessages(prev => {
                        // Avoid duplicates if any
                        if (prev.some(m => m._id === message._id)) return prev;
                        return [...prev, message];
                    });
                }
                // If message is for a different session, update unread count immediately
                if (!currentActive || message.session_id !== currentActive._id) {
                    setSessions(prev => prev.map(s =>
                        s._id === message.session_id
                            ? { ...s, unreadCount: (s.unreadCount || 0) + 1 }
                            : s
                    ));
                }
                debouncedRefresh();
            });

            socketRef.current.on('user_typing', (data: any) => {
                const currentActive = activeSessionRef.current;
                if (currentActive && data.sessionId === currentActive._id) {
                    setUserTyping(data.isTyping ? data.userName : null);
                }
            });

            socketRef.current.on('presence_change', (data: { userId: string, isOnline: boolean }) => {
                setSessions(prev => prev.map(s => {
                    if (s.user_id?._id === data.userId) {
                        return { ...s, isOnline: data.isOnline };
                    }
                    return s;
                }));
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

            // Mark messages as read (use ref to avoid stale closure)
            socketRef.current?.emit('mark_read', { sessionId, userId: adminRef.current?._id });

            // Update local session list (clear unread count for this session)
            setSessions(prev => prev.map(s => s._id === sessionId ? { ...s, unreadCount: 0 } : s));
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

    const groupedMessages = React.useMemo(() => groupMessagesByDate(messages), [messages]);

    // Cleanup typing timeout
    const refreshDebounceRef = useRef<any>(null);

    const debouncedRefresh = () => {
        if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current);
        refreshDebounceRef.current = setTimeout(() => {
            refreshSessions();
        }, 1000);
    };

    return (
        <div className={`admin-support-container saas-reveal active ${activeSession ? 'has-session' : ''} ${showUserDetails ? 'show-details-mobile' : ''}`}>
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
                    <div className="support-search-box">
                        <div className="support-search-icon">
                            <Search size={18} />
                        </div>
                        <input
                            type="text"
                            placeholder="Search user name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="support-search-input"
                        />
                        {searchTerm && (
                            <button
                                className="support-search-clear-btn"
                                onClick={() => setSearchTerm('')}
                                aria-label="Clear search"
                            >
                                <X size={16} />
                            </button>
                        )}
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
                                <div className={`presence-dot ${session.status === 'closed' ? 'closed' : (session.isOnline ? 'online' : 'offline')}`}></div>
                            </div>
                            <div className="session-content">
                                <div className="session-top">
                                    <div className="name-unread">
                                        <h4>{session.user_id?.name}</h4>
                                        {session.unreadCount > 0 && (
                                            <span className="unread-badge">{session.unreadCount}</span>
                                        )}
                                    </div>
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
                            <button
                                className="mobile-back-btn"
                                onClick={() => {
                                    setActiveSession(null);
                                    setShowUserDetails(false);
                                }}
                            >
                                <ArrowLeft size={20} />
                            </button>
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
                                {activeSession.status !== 'closed' && (
                                    <button
                                        className="btn-close-action"
                                        onClick={() => handleCloseSession(activeSession._id)}
                                    >
                                        <span>End Session</span>
                                    </button>
                                )}
                                <button
                                    className={`btn-info-action ${showUserDetails ? 'active' : ''}`}
                                    onClick={() => setShowUserDetails(!showUserDetails)}
                                >
                                    <Info size={20} />
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
                                            className={`admin-chat-bubble ${msg.sender_id?._id === activeSession.user_id?._id || msg.sender_id === activeSession.user_id?._id ? 'other' : 'mine'}`}
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

            {/* Column 3: User Details Sidebar */}
            <div className="user-details-sidebar">
                {activeSession ? (
                    <>
                        <div className="user-profile-summary">
                            <div className="user-avatar-premium large">
                                {activeSession.user_id?.profileImage ? (
                                    <img src={activeSession.user_id.profileImage} alt="" />
                                ) : (
                                    <div className="avatar-placeholder">{activeSession.user_id?.name?.charAt(0)}</div>
                                )}
                            </div>
                            <div className="user-profile-info">
                                <h3>{activeSession.user_id?.name}</h3>
                                <p className="user-email">{activeSession.user_id?.email}</p>
                            </div>
                        </div>

                        <div className="user-meta-details">

                            <div className="meta-item">
                                <div className="icon-wrapper">
                                    <MessageSquare size={18} />
                                </div>
                                <div className="meta-content">
                                    <label>Session ID</label>
                                    <span>{activeSession._id}</span>
                                </div>
                            </div>

                            <div className="meta-item">
                                <div className="icon-wrapper">
                                    <Filter size={18} />
                                </div>
                                <div className="meta-content">
                                    <label>Status</label>
                                    <span style={{ textTransform: 'capitalize' }}>{activeSession.status.replace('_', ' ')}</span>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="empty-details-state">
                        <p>Select a conversation to view user details</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminSupportManager;
