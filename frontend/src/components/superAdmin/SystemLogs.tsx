import React, { useEffect, useState } from 'react';
import { getSystemLogs } from '../../services/superAdminService';
import { Activity, Clock, User, Zap } from 'lucide-react';
import '../../styles/SuperAdminLogs.css';

interface SystemLogsProps {
    hideTitle?: boolean;
}

const SystemLogs: React.FC<SystemLogsProps> = ({ hideTitle = false }) => {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [filterAction, setFilterAction] = useState('ALL');
    const itemsPerPage = 10;

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

    useEffect(() => {
        fetchLogs();
    }, []);

    // Filter Logic
    const filteredLogs = logs.filter(log => {
        const matchesSearch =
            log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.user_id?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.user_id?.email || '').toLowerCase().includes(searchTerm.toLowerCase());

        const matchesFilter = filterAction === 'ALL' ? true :
            filterAction === 'CREATE' ? (log.action.toLowerCase().includes('create') || log.action.toLowerCase().includes('add') || log.action.toLowerCase().includes('accepted')) :
                filterAction === 'UPDATE' ? (log.action.toLowerCase().includes('update') || log.action.toLowerCase().includes('edit')) :
                    filterAction === 'DELETE' ? (log.action.toLowerCase().includes('delete') || log.action.toLowerCase().includes('remove') || log.action.toLowerCase().includes('ban')) :
                        true;

        return matchesSearch && matchesFilter;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    const paginatedLogs = filteredLogs.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const getBadgeClass = (action: string) => {
        const actionLower = action?.toLowerCase() || '';
        if (actionLower.includes('create') || actionLower.includes('add') || actionLower.includes('accepted')) {
            return 'badge-purple';
        }
        if (actionLower.includes('delete') || actionLower.includes('remove') || actionLower.includes('ban')) {
            return 'badge-red';
        }
        if (actionLower.includes('update') || actionLower.includes('edit')) {
            return 'badge-orange';
        }
        if (actionLower.includes('sent') || actionLower.includes('login')) {
            return 'badge-blue';
        }
        return 'badge-green'; // Default
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
        else relative = `${diffDays}d ago`;

        return {
            relative,
            full: date.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
        };
    };

    return (
        <div className="system-logs-container">
            <div className="system-logs-header">
                {!hideTitle ? (
                    <div className="system-logs-title-group">
                        <div className="system-logs-icon-wrapper">
                            <Activity size={24} />
                        </div>
                        <div className="system-logs-text">
                            <h3>Admin Activity Logs</h3>
                            <p>Track all administrative actions and system events</p>
                        </div>
                    </div>
                ) : (
                    <div></div>
                )}
                <div className="system-logs-actions">
                    <button onClick={fetchLogs} className="logs-refresh-btn" title="Refresh Logs">
                        <Activity size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <div className="system-logs-count">
                        {filteredLogs.length} entries
                    </div>
                </div>
            </div>

            <div className="system-logs-toolbar">
                <input
                    type="text"
                    placeholder="Search logs..."
                    className="logs-search-input"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select
                    className="logs-filter-select"
                    value={filterAction}
                    onChange={(e) => setFilterAction(e.target.value)}
                >
                    <option value="ALL">All Actions</option>
                    <option value="CREATE">Create / Add</option>
                    <option value="UPDATE">Update / Edit</option>
                    <option value="DELETE">Delete / Remove</option>
                </select>
            </div>

            <div className="logs-table-wrapper">
                {loading && logs.length === 0 ? (
                    <div className="logs-loading">
                        <div className="spinner"></div>
                    </div>
                ) : filteredLogs.length > 0 ? (
                    <>
                        <table className="logs-table">
                            <thead>
                                <tr>
                                    <th>
                                        <div><Clock size={14} /> TIMESTAMP</div>
                                    </th>
                                    <th>
                                        <div><User size={14} /> USER</div>
                                    </th>
                                    <th>
                                        <div><Zap size={14} /> ACTION</div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedLogs.map(log => {
                                    const time = formatTimestamp(log.timestamp);
                                    const badgeClass = getBadgeClass(log.action);
                                    return (
                                        <tr key={log._id}>
                                            <td>
                                                <div className="log-time-wrapper">
                                                    <span className="log-time-relative">{time.relative}</span>
                                                    <span className="log-time-full">{time.full}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="log-user-wrapper">
                                                    <span className="log-user-name">{log.user_id?.name || 'System'}</span>
                                                    <span className="log-user-email">{log.user_id?.email || 'Automated Action'}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`log-action-badge ${badgeClass}`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {totalPages > 1 && (
                            <div className="logs-pagination">
                                <button
                                    className="pagination-btn"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                >
                                    Previous
                                </button>
                                <span className="pagination-info">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button
                                    className="pagination-btn"
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="logs-loading">
                        <p>No activity logs found matching your criteria</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SystemLogs;
