import React, { useEffect, useState } from 'react';
import { getAnnouncements, createAnnouncement, deleteAnnouncement } from '../../services/superAdminService';
import { toast } from 'react-toastify';
import { AnnouncementType, TargetPage } from '../../types/enums';
import ConfirmationModal from '../ConfirmationModal';
import { Megaphone, Type, MessageSquare, Users, Send, Trash2, Calendar } from 'lucide-react';

interface AnnouncementsProps {
    hideTitle?: boolean;
}

const Announcements: React.FC<AnnouncementsProps> = ({ hideTitle = false }) => {
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [newAnnouncement, setNewAnnouncement] = useState<{
        title: string;
        content: string;
        type: AnnouncementType;
        targetPage: TargetPage;
    }>({
        title: '',
        content: '',
        type: AnnouncementType.INFO,
        targetPage: TargetPage.ALL
    });
    const [loading, setLoading] = useState(false);

    // Modal State
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getAnnouncements();
            setAnnouncements(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createAnnouncement(
                newAnnouncement.title,
                newAnnouncement.content,
                newAnnouncement.type,
                newAnnouncement.targetPage
            );
            toast.success('Announcement created successfully!');
            setNewAnnouncement({
                title: '',
                content: '',
                type: AnnouncementType.INFO,
                targetPage: TargetPage.ALL
            });
            fetchData();
        } catch (err) {
            toast.error('Failed to create announcement');
        }
    };

    const confirmDelete = (id: string) => {
        setSelectedId(id);
        setModalOpen(true);
    };

    const handleDelete = async () => {
        if (!selectedId) return;
        try {
            await deleteAnnouncement(selectedId);
            toast.success('Announcement deleted');
            fetchData();
        } catch (err) {
            toast.error('Failed to delete announcement');
        } finally {
            setModalOpen(false);
            setSelectedId(null);
        }
    };

    const getTypeBadgeColor = (type: string) => {
        switch (type) {
            case AnnouncementType.OFFER: return { bg: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', border: 'rgba(236, 72, 153, 0.2)' };
            case AnnouncementType.WARNING: return { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.2)' };
            case AnnouncementType.MAINTENANCE: return { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.2)' };
            case AnnouncementType.GREETING: return { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: 'rgba(16, 185, 129, 0.2)' };
            case AnnouncementType.INFO:
            default: return { bg: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', border: 'rgba(99, 102, 241, 0.2)' };
        }
    };

    return (
        <div className="admin-categories-layout">
            <section className="card admin-form-section" style={{ marginBottom: '1.25rem', padding: '2rem 2.5rem' }}>
                {!hideTitle && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
                            borderRadius: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white'
                        }}>
                            <Megaphone size={24} />
                        </div>
                        <div>
                            <h3 className="admin-table-title" style={{ marginBottom: '0.25rem' }}>Create Announcement</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>Broadcast messages to users and admins</p>
                        </div>
                    </div>
                )}
                <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="form-group-premium">
                        <label><div className="label-icon"><Type size={14} /></div> Announcement Title</label>
                        <input
                            type="text"
                            value={newAnnouncement.title}
                            onChange={e => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                            required
                            className="premium-input"
                            placeholder="e.g. New Feature Launch"
                        />
                    </div>
                    <div className="form-group-premium">
                        <label><div className="label-icon"><MessageSquare size={14} /></div> Message Content</label>
                        <textarea
                            value={newAnnouncement.content}
                            onChange={e => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                            required
                            className="premium-textarea"
                            rows={4}
                            placeholder="Write your announcement message here..."
                        />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div className="form-group-premium">
                            <label>Announcement Type</label>
                            <select
                                value={newAnnouncement.type}
                                onChange={e => setNewAnnouncement({ ...newAnnouncement, type: e.target.value as AnnouncementType })}
                                className="premium-input"
                                style={{ cursor: 'pointer' }}
                            >
                                {Object.values(AnnouncementType).map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group-premium">
                            <label><div className="label-icon"><Users size={14} /></div> Target Audience</label>
                            <select
                                value={newAnnouncement.targetPage}
                                onChange={e => setNewAnnouncement({ ...newAnnouncement, targetPage: e.target.value as TargetPage })}
                                className="premium-input"
                                style={{ cursor: 'pointer' }}
                            >
                                {Object.values(TargetPage).map(page => (
                                    <option key={page} value={page}>{page.replace('_', ' ')}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <button type="submit" className="admin-btn-generate full-width" style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <Send size={18} />
                        Post Announcement
                    </button>
                </form>
            </section>

            <section className="admin-categories-list-section" style={{ marginTop: 0 }}>
                <div className="admin-table-header-box" style={{ borderRadius: '24px 24px 0 0', borderBottom: 'none', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', padding: '2rem 2.5rem', minHeight: '80px' }}>
                    {!hideTitle && <h3 className="admin-table-title">Active Announcements</h3>}
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, marginLeft: 'auto' }}>
                        {announcements.length} {announcements.length === 1 ? 'announcement' : 'announcements'}
                    </span>
                </div>
                <div style={{
                    display: 'flex', flexDirection: 'column', gap: '1.25rem',
                    padding: '1.5rem', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '0 0 24px 24px', minHeight: '200px',
                    alignItems: 'stretch'
                }}>
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem' }}>
                            <div className="spinner-mini"></div>
                        </div>
                    ) : announcements.length > 0 ? (
                        announcements.map(ann => {
                            const badgeColor = getTypeBadgeColor(ann.type);
                            return (
                                <div key={ann._id} style={{
                                    background: 'var(--card-bg)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '20px',
                                    padding: '1.5rem',
                                    transition: 'all 0.3s',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                                }}
                                    className="announcement-card-hover"
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                                                <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{ann.title}</h4>
                                                <span style={{
                                                    fontSize: '0.75rem',
                                                    fontWeight: 700,
                                                    padding: '0.35rem 0.75rem',
                                                    borderRadius: '12px',
                                                    background: badgeColor.bg,
                                                    color: badgeColor.color,
                                                    border: `1px solid ${badgeColor.border}`,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.03em'
                                                }}>
                                                    {ann.type || 'INFO'}
                                                </span>
                                                <span style={{
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    padding: '0.35rem 0.75rem',
                                                    borderRadius: '12px',
                                                    background: 'rgba(0, 0, 0, 0.04)',
                                                    color: 'var(--text-secondary)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.35rem'
                                                }}>
                                                    <Users size={12} />
                                                    {ann.targetPage?.replace('_', ' ') || 'ALL'}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 0.75rem 0' }}>{ann.content}</p>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                <Calendar size={14} />
                                                <span>Posted on {new Date(ann.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => confirmDelete(ann._id)}
                                            style={{
                                                background: 'rgba(239, 68, 68, 0.08)',
                                                color: '#ef4444',
                                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                                padding: '0.5rem 1rem',
                                                borderRadius: '12px',
                                                cursor: 'pointer',
                                                fontWeight: 700,
                                                fontSize: '0.85rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                transition: 'all 0.2s'
                                            }}
                                            className="delete-announcement-btn"
                                        >
                                            <Trash2 size={16} />
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                            <Megaphone size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                            <p style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>No announcements yet</p>
                            <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>Create your first announcement to broadcast messages to users</p>
                        </div>
                    )}
                </div>
            </section>

            <ConfirmationModal
                isOpen={modalOpen}
                title="Delete Announcement"
                message="Are you sure you want to delete this announcement? This action cannot be undone."
                onConfirm={handleDelete}
                onCancel={() => setModalOpen(false)}
                confirmText="Delete"
                type="danger"
            />
        </div >
    );
};

export default Announcements;
