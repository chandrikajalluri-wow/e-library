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



    return (
        <div className="admin-categories-layout">
            <section className="card admin-form-section mb-4 p-6">
                {!hideTitle && (
                    <div className="flex-center-row gap-3 mb-4">
                        <div className="icon-box-premium">
                            <Megaphone size={24} />
                        </div>
                        <div>
                            <h3 className="admin-table-title mb-2">Create Announcement</h3>
                            <p className="text-sm m-0" style={{ color: 'var(--text-secondary)' }}>Broadcast messages to users and admins</p>
                        </div>
                    </div>
                )}
                <form onSubmit={handleCreate} className="flex-column gap-4">
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
                                className="premium-input pointer"
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
                                className="premium-input pointer"
                            >
                                {Object.values(TargetPage).map(page => (
                                    <option key={page} value={page}>{page.replace('_', ' ')}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <button type="submit" className="admin-btn-generate full-width mt-2 flex-center gap-2">
                        <Send size={18} />
                        Post Announcement
                    </button>
                </form>
            </section>

            <section className="admin-categories-list-section mt-0">
                <div className="admin-table-header-box flex-between p-6" style={{ borderRadius: '24px 24px 0 0', borderBottom: 'none', minHeight: '80px' }}>
                    {!hideTitle && <h3 className="admin-table-title">Active Announcements</h3>}
                    <span className="text-sm font-semibold ml-auto" style={{ color: 'var(--text-secondary)' }}>
                        {announcements.length} {announcements.length === 1 ? 'announcement' : 'announcements'}
                    </span>
                </div>
                <div className="flex-column gap-4 p-6" style={{
                    borderRadius: '0 0 24px 24px', minHeight: '200px',
                    alignItems: 'stretch'
                }}>
                    {loading ? (
                        <div className="flex-center p-6" style={{ padding: '3rem' }}>
                            <div className="spinner-mini"></div>
                        </div>
                    ) : announcements.length > 0 ? (
                        announcements.map(ann => {
                            return (
                                <div key={ann._id} className="announcement-card-v2">
                                    <div className="flex-between mb-4" style={{ alignItems: 'flex-start' }}>
                                        <div style={{ flex: 1 }}>
                                            <div className="flex-center-row gap-3 mb-3 flex-wrap">
                                                <h4 className="m-0" style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>{ann.title}</h4>
                                                <span className={`badge-announcement badge-announcement-${ann.type?.toLowerCase() || 'info'}`}>
                                                    {ann.type || 'INFO'}
                                                </span>
                                                <span className="badge-audience">
                                                    <Users size={12} />
                                                    {ann.targetPage?.replace('_', ' ') || 'ALL'}
                                                </span>
                                            </div>
                                            <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 0.75rem 0' }}>{ann.content}</p>
                                            <div className="flex-center-row gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                                <Calendar size={14} />
                                                <span>Posted on {new Date(ann.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => confirmDelete(ann._id)}
                                            className="btn-delete-announcement"
                                        >
                                            <Trash2 size={16} />
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex-column flex-center p-6" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                            <Megaphone size={48} className="mb-4" style={{ opacity: 0.3 }} />
                            <p className="font-semibold mb-2" style={{ fontSize: '1rem' }}>No announcements yet</p>
                            <p className="text-sm m-0" style={{ opacity: 0.8 }}>Create your first announcement to broadcast messages to users</p>
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
