import React, { useEffect, useState } from 'react';
import { getContactQueries, updateContactQueryStatus } from '../../services/superAdminService';
import { CheckCircle, Clock, Mail, MessageSquare } from 'lucide-react';

interface ContactQuery {
    _id: string;
    name: string;
    email: string;
    message: string;
    status: 'OPEN' | 'RESOLVED';
    createdAt: string;
}

interface ContactQueriesProps {
    hideTitle?: boolean;
}

const ContactQueries: React.FC<ContactQueriesProps> = ({ hideTitle = false }) => {
    const [queries, setQueries] = useState<ContactQuery[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'RESOLVED'>('OPEN');

    useEffect(() => {
        fetchQueries();
    }, []);

    const fetchQueries = async () => {
        try {
            setLoading(true);
            const data = await getContactQueries();
            setQueries(data);
        } catch (err) {
            console.error('Failed to fetch contact queries', err);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: 'OPEN' | 'RESOLVED') => {
        try {
            const updated = await updateContactQueryStatus(id, newStatus);
            setQueries(prev => prev.map(q => q._id === id ? updated : q));
        } catch (err) {
            console.error('Failed to update status', err);
        }
    };

    const filteredQueries = queries.filter(q => filter === 'ALL' || q.status === filter);

    if (loading) return <div className="admin-loading-container"><div className="spinner"></div><p>Loading queries...</p></div>;

    return (
        <div className="admin-section-container">
            <div className="admin-section-header">
                <div>
                    {!hideTitle && (
                        <>
                            <h3 className="section-title">Contact Queries</h3>
                            <p className="section-subtitle">Manage user support messages</p>
                        </>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {(['OPEN', 'RESOLVED', 'ALL'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`report-filter-btn ${filter === f ? 'active' : 'inactive'}`}
                        >
                            {f.charAt(0) + f.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>
            </div>

            <div className="queries-grid">
                {filteredQueries.length === 0 ? (
                    <div className="admin-empty-state">
                        <MessageSquare className="mx-auto h-12 w-12 text-gray-300 mb-3" size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                        <p>No {filter !== 'ALL' ? filter.toLowerCase() : ''} queries found.</p>
                    </div>
                ) : (
                    filteredQueries.map(query => (
                        <div key={query._id} className="query-card">
                            <div className="query-header">
                                <div className="query-user-info">
                                    <div className="query-avatar">
                                        {query.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 className="query-name">{query.name}</h4>
                                        <div className="query-meta">
                                            <Mail size={14} />
                                            {query.email}
                                            <span style={{ opacity: 0.5 }}>•</span>
                                            <Clock size={14} />
                                            {new Date(query.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                                <div className={`status-badge ${query.status === 'OPEN' ? 'status-pending' : 'status-approved'
                                    }`}>
                                    {query.status}
                                </div>
                            </div>

                            <div className="query-message-box">
                                {query.message}
                            </div>

                            <div className="query-actions">
                                {query.status === 'OPEN' ? (
                                    <button
                                        onClick={() => handleStatusUpdate(query._id, 'RESOLVED')}
                                        className="query-btn-resolve"
                                    >
                                        <CheckCircle size={16} />
                                        Mark as Resolved
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleStatusUpdate(query._id, 'OPEN')}
                                        className="query-btn-reopen"
                                    >
                                        Re-open Query
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ContactQueries;
