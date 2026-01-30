import React, { useEffect, useState } from 'react';
import { getAnnouncements, createAnnouncement, deleteAnnouncement } from '../../services/superAdminService';
import { toast } from 'react-toastify';
import { AnnouncementType, TargetPage } from '../../types/enums';
import ConfirmationModal from '../ConfirmationModal';

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
            toast.success('Announcement created');
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
            <section className="card admin-form-section">
                {!hideTitle && <h3 className="admin-table-title" style={{ marginBottom: '2rem' }}>Create Announcement</h3>}
                <form onSubmit={handleCreate}>
                    <div className="form-group">
                        <label>Title</label>
                        <input
                            type="text"
                            value={newAnnouncement.title}
                            onChange={e => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                            required
                            className="admin-search-input"
                        />
                    </div>
                    <div className="form-group">
                        <label>Content</label>
                        <textarea
                            value={newAnnouncement.content}
                            onChange={e => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                            required
                            className="admin-textarea"
                            rows={5}
                        />
                    </div>
                    <div className="form-group">
                        <label>Type</label>
                        <select
                            value={newAnnouncement.type}
                            onChange={e => setNewAnnouncement({ ...newAnnouncement, type: e.target.value as AnnouncementType })}
                            className="admin-select"
                        >
                            {Object.values(AnnouncementType).map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Target Page</label>
                        <select
                            value={newAnnouncement.targetPage}
                            onChange={e => setNewAnnouncement({ ...newAnnouncement, targetPage: e.target.value as TargetPage })}
                            className="admin-select"
                        >
                            {Object.values(TargetPage).map(page => (
                                <option key={page} value={page}>{page}</option>
                            ))}
                        </select>
                    </div>
                    <button type="submit" className="admin-btn-edit" style={{ marginTop: '1rem' }}>Post Announcement</button>
                </form>
            </section>

            <section className="admin-categories-list-section">
                <div className="admin-table-header-box" style={{ borderRadius: '24px 24px 0 0', borderBottom: 'none' }}>
                    {!hideTitle && <h3 className="admin-table-title">Active Announcements</h3>}
                </div>
                <div className="admin-categories-grid" style={{
                    display: 'flex', flexDirection: 'column', gap: '1rem',
                    padding: '1.5rem', background: 'rgba(99, 102, 241, 0.02)', border: '1px solid var(--border-color)', borderRadius: '0 0 24px 24px'
                }}>
                    {loading ? <div className="spinner-mini"></div> : announcements.map(ann => (
                        <div key={ann._id} className="admin-category-card">
                            <div className="category-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                    <span className="category-name" style={{ fontSize: '1.1rem' }}>{ann.title}</span>
                                    <span className={`badge badge-${ann.type?.toLowerCase() || 'info'}`} style={{
                                        fontSize: '0.75rem',
                                        padding: '0.2rem 0.5rem',
                                        borderRadius: '12px',
                                        background: 'rgba(99, 102, 241, 0.1)',
                                        color: 'var(--primary-color)'
                                    }}>
                                        {ann.type || 'INFO'}
                                    </span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        Target: {ann.targetPage || 'ALL'}
                                    </span>
                                </div>
                                <button onClick={() => confirmDelete(ann._id)} className="admin-btn-delete" style={{ padding: '0.3rem 0.6rem' }}>Delete</button>
                            </div>
                            <p className="category-desc">{ann.content}</p>
                            <small style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{new Date(ann.createdAt).toLocaleDateString()}</small>
                        </div>
                    ))}
                    {announcements.length === 0 && !loading && <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>No announcements found.</p>}
                </div>
            </section>

            <ConfirmationModal
                isOpen={modalOpen}
                title="Delete Announcement"
                message="Are you sure you want to delete this announcement?"
                onConfirm={handleDelete}
                onCancel={() => setModalOpen(false)}
                confirmText="Delete"
                type="danger"
            />
        </div >
    );
};

export default Announcements;
