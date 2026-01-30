import React, { useEffect, useState } from 'react';
import { getSystemLogs } from '../../services/superAdminService';

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

    return (
        <div className="card admin-table-section">
            <div className="admin-table-header-box">
                {!hideTitle && <h3 className="admin-table-title">Admin Activity Logs</h3>}
                <span className="page-info">Showing last {logs.length} entries</span>
            </div>
            <div className="admin-table-wrapper">
                {loading ? (
                    <div className="admin-loading-container"><div className="spinner"></div></div>
                ) : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>User</th>
                                <th>Action</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map(log => (
                                <tr key={log._id}>
                                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        {new Date(log.timestamp).toLocaleString()}
                                    </td>
                                    <td>
                                        <div className="user-info-box">
                                            <span className="user-main-name">{log.user_id?.name || 'System'}</span>
                                            <span className="user-sub-email">{log.user_id?.email}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="status-badge" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary-color)' }}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td style={{ maxWidth: '400px', lineHeight: '1.4' }}>{log.description}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default SystemLogs;
