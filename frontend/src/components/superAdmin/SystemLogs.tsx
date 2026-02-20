import React, { useEffect, useState, useRef } from 'react';
import { getSystemLogs } from '../../services/superAdminService';
import { Activity, Clock, User, Zap, Search, Filter } from 'lucide-react';
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
    const [sortOrder, setSortOrder] = useState('DESC');
    const itemsPerPage = 10;
    const logsTopRef = useRef<HTMLDivElement>(null);

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

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterAction]);

    useEffect(() => {
        if (currentPage > 1) {
            logsTopRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [currentPage]);

    // Sorting and Filtering Logic
    const processedLogs = [...logs]
        .sort((a, b) => {
            const dateA = new Date(a.timestamp).getTime();
            const dateB = new Date(b.timestamp).getTime();
            return sortOrder === 'DESC' ? dateB - dateA : dateA - dateB;
        })
        .filter(log => {
            if (!log.action) return false;
            const action = log.action.toUpperCase();

            const matchesSearch =
                action.includes(searchTerm.toUpperCase()) ||
                (log.user_id?.name || '').toUpperCase().includes(searchTerm.toUpperCase()) ||
                (log.user_id?.email || '').toUpperCase().includes(searchTerm.toUpperCase());

            if (!matchesSearch) return false;

            if (filterAction === 'ALL') return true;

            switch (filterAction) {
                case 'ADMIN':
                    return action.includes('ADMIN') || action.includes('ROLE');
                case 'USER':
                    return action.includes('USER') || action.includes('PROFILE') || action.includes('LOGIN') || action.includes('REGISTER');
                case 'BOOK':
                    return (
                        action.includes('BOOK') ||
                        action.includes('CATEGORY') ||
                        action.includes('REVIEW') ||
                        action.includes('WISHLIST') ||
                        action.includes('READLIST') ||
                        action.includes('EXCHANGE') ||
                        action.includes('REQUEST')
                    );
                case 'ORDER':
                    return action.includes('ORDER');
                case 'MEMBERSHIP':
                    return action.includes('MEMBERSHIP');
                case 'SYSTEM':
                    return (
                        action.includes('CONTACT') ||
                        action.includes('ANNOUNCEMENT') ||
                        action.includes('SYSTEM') ||
                        action.includes('INVITE')
                    );
                default:
                    return true;
            }
        });

    const filteredLogs = processedLogs;

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
        <div className="system-logs-container" ref={logsTopRef}>
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
                <div className="admin-search-box">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search logs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="admin-filter-box">
                    <Filter size={18} className="filter-icon" />
                    <select
                        value={filterAction}
                        onChange={(e) => setFilterAction(e.target.value)}
                    >
                        <option value="ALL">All Actions</option>
                        <option value="ADMIN">Admin Actions</option>
                        <option value="USER">User Activities</option>
                        <option value="BOOK">Book Management</option>
                        <option value="ORDER">Orders</option>
                        <option value="MEMBERSHIP">Memberships</option>
                        <option value="SYSTEM">System/Support</option>
                    </select>
                </div>
                <div className="admin-filter-box">
                    <Clock size={18} className="filter-icon" />
                    <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                    >
                        <option value="DESC">Newest First</option>
                        <option value="ASC">Oldest First</option>
                    </select>
                </div>
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
                            <div className="admin-pagination">
                                <button
                                    className="pagination-btn"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                >
                                    Previous
                                </button>
                                <div className="pagination-info">
                                    <div className="pagination-info-pages">
                                        Page <span>{currentPage}</span> of <span>{totalPages}</span>
                                    </div>
                                </div>
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
