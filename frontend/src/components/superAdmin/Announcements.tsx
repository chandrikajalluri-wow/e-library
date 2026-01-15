import React, { useEffect, useState } from 'react';
import { getAnnouncements, createAnnouncement, deleteAnnouncement } from '../../services/superAdminService';
import { toast } from 'react-toastify';
import ConfirmationModal from '../ConfirmationModal';

const Announcements: React.FC = () => {
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '' });
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
            await createAnnouncement(newAnnouncement.title, newAnnouncement.content);
            toast.success('Announcement created');
            setNewAnnouncement({ title: '', content: '' });
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
                <h3 className="admin-table-title" style={{ marginBottom: '2rem' }}>Create Announcement</h3>
                <form onSubmit={handleCreate}>
                    <div className="form-group">
                        <label>Title</label>
                        <input
                            type="text"
                            value={newAnnouncement.title}
                            onChange={e => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                            required
                            className="admin-search-input"
                            style={{ width: '100%' }}
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
                    <button type="submit" className="admin-btn-edit" style={{ marginTop: '1rem' }}>Post Announcement</button>
                </form>
            </section>

            <section className="admin-categories-list-section">
                <div className="admin-table-header-box" style={{ borderRadius: '24px 24px 0 0', borderBottom: 'none' }}>
                    <h3 className="admin-table-title">Active Announcements</h3>
                </div>
                <div className="admin-categories-grid" style={{
                    display: 'flex', flexDirection: 'column', gap: '1rem',
                    padding: '1.5rem', background: 'rgba(99, 102, 241, 0.02)', border: '1px solid var(--border-color)', borderRadius: '0 0 24px 24px'
                }}>
                    {loading ? <div className="spinner-mini"></div> : announcements.map(ann => (
                        <div key={ann._id} className="admin-category-card">
                            <div className="category-header">
                                <span className="category-name" style={{ fontSize: '1.1rem' }}>{ann.title}</span>
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
        </div>
    );
};

export default Announcements;
