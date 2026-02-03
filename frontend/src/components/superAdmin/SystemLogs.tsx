import React, { useEffect, useState } from 'react';
import { getSystemLogs } from '../../services/superAdminService';
import { Activity, Clock, User, Zap } from 'lucide-react';

interface SystemLogsProps {
    hideTitle?: boolean;
}

const SystemLogs: React.FC<SystemLogsProps> = ({ hideTitle = false }) => {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            try {
                const data = await getSystemLogs();
                setLogs(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, []);

    const getActionBadgeColor = (action: string) => {
        const actionLower = action?.toLowerCase() || '';
        if (actionLower.includes('create') || actionLower.includes('add')) {
            return { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: 'rgba(16, 185, 129, 0.2)' };
        }
        if (actionLower.includes('delete') || actionLower.includes('remove')) {
            return { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.2)' };
        }
        if (actionLower.includes('update') || actionLower.includes('edit')) {
            return { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.2)' };
        }
        return { bg: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', border: 'rgba(99, 102, 241, 0.2)' };
    };

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        let relative = '';
        if (diffMins < 1) relative = 'Just now';
        else if (diffMins < 60) relative = `${diffMins}m ago`;
        else if (diffHours < 24) relative = `${diffHours}h ago`;
        else if (diffDays < 7) relative = `${diffDays}d ago`;
        else relative = date.toLocaleDateString();

        return {
            relative,
            full: date.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
        };
    };

    return (
        <div className="card admin-table-section">
            <div className="admin-table-header-box" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                {!hideTitle && (
                    <>
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
                            <Activity size={24} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <h3 className="admin-table-title" style={{ marginBottom: '0.25rem' }}>Admin Activity Logs</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                                Track all administrative actions and system events
                            </p>
                        </div>
                    </>
                )}
                <span style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    padding: '0.5rem 1rem',
                    background: 'rgba(99, 102, 241, 0.08)',
                    borderRadius: '12px',
                    border: '1px solid rgba(99, 102, 241, 0.15)',
                    marginLeft: 'auto'
                }}>
                    {logs.length} {logs.length === 1 ? 'entry' : 'entries'}
                </span>
            </div>
            <div className="admin-table-wrapper">
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem' }}>
                        <div className="spinner"></div>
                    </div>
                ) : logs.length > 0 ? (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th style={{ width: '200px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Clock size={16} />
                                        <span>Timestamp</span>
                                    </div>
                                </th>
                                <th>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <User size={16} />
                                        <span>User</span>
                                    </div>
                                </th>
                                <th style={{ width: '180px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Zap size={16} />
                                        <span>Action</span>
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map(log => {
                                const time = formatTimestamp(log.timestamp);
                                const badgeColor = getActionBadgeColor(log.action);
                                return (
                                    <tr key={log._id}>
                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                    {time.relative}
                                                </span>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                    {time.full}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="user-info-box">
                                                <span className="user-main-name">{log.user_id?.name || 'System'}</span>
                                                <span className="user-sub-email">{log.user_id?.email || 'Automated'}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                fontSize: '0.8rem',
                                                fontWeight: 700,
                                                padding: '0.4rem 0.85rem',
                                                borderRadius: '12px',
                                                background: badgeColor.bg,
                                                color: badgeColor.color,
                                                border: `1px solid ${badgeColor.border}`,
                                                textTransform: 'capitalize'
                                            }}>
                                                {log.action}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                ) : (
                    <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
                        <Activity size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                        <p style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>No activity logs yet</p>
                        <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>Admin actions will appear here once they start occurring</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SystemLogs;
