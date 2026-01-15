import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import UserAdminManagement from '../components/superAdmin/UserAdminManagement';
import SystemLogs from '../components/superAdmin/SystemLogs';
import Announcements from '../components/superAdmin/Announcements';
import ContentModeration from '../components/superAdmin/ContentModeration';
import { getSystemMetrics } from '../services/superAdminService';
import ConfirmationModal from '../components/ConfirmationModal';
import '../styles/AdminDashboard.css';

const SuperAdminDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'overview';
    const [metrics, setMetrics] = useState<any>(null);
    const [logoutModal, setLogoutModal] = useState(false);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const data = await getSystemMetrics();
                setMetrics(data);
            } catch (err) {
                console.error(err);
            }
        };
        if (activeTab === 'overview') fetchMetrics();
    }, [activeTab]);

    const handleTabChange = (tab: string) => {
        setSearchParams({ tab });
    };

    const handleLogout = () => {
        setLogoutModal(true);
    };

    const confirmLogout = () => {
        localStorage.clear();
        navigate('/');
    };

    return (
        <div className="admin-layout">
            <main className="admin-main-content">
                <header className="admin-header">
                    <div className="admin-header-flex">
                        <div className="admin-header-titles">
                            <h2 className="admin-header-title">Super Admin</h2>
                            <p className="admin-header-subtitle">System Overview & Control</p>
                        </div>
                        <div className="admin-header-actions">
                            <button onClick={handleLogout} className="admin-notification-toggle" title="Logout">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                            </button>
                        </div>
                    </div>
                </header>

                {/* Custom Navigation for Super Admin */}
                <div className="admin-stats-grid-container" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: '2rem' }}>
                    <button
                        onClick={() => handleTabChange('overview')}
                        className={`card stats-card-content ${activeTab === 'overview' ? 'active-tab-card' : ''}`}
                        style={{ cursor: 'pointer', border: activeTab === 'overview' ? '2px solid var(--primary-color)' : '' }}
                    >
                        <span className="stats-label">Overview</span>
                    </button>
                    <button
                        onClick={() => handleTabChange('users')}
                        className={`card stats-card-content ${activeTab === 'users' ? 'active-tab-card' : ''}`}
                        style={{ cursor: 'pointer', border: activeTab === 'users' ? '2px solid var(--primary-color)' : '' }}
                    >
                        <span className="stats-label">User Mgmt</span>
                    </button>
                    <button
                        onClick={() => handleTabChange('announcements')}
                        className={`card stats-card-content ${activeTab === 'announcements' ? 'active-tab-card' : ''}`}
                        style={{ cursor: 'pointer', border: activeTab === 'announcements' ? '2px solid var(--primary-color)' : '' }}
                    >
                        <span className="stats-label">Announcements</span>
                    </button>
                    <button
                        onClick={() => handleTabChange('moderation')}
                        className={`card stats-card-content ${activeTab === 'moderation' ? 'active-tab-card' : ''}`}
                        style={{ cursor: 'pointer', border: activeTab === 'moderation' ? '2px solid var(--primary-color)' : '' }}
                    >
                        <span className="stats-label">Moderation</span>
                    </button>
                    <button
                        onClick={() => handleTabChange('logs')}
                        className={`card stats-card-content ${activeTab === 'logs' ? 'active-tab-card' : ''}`}
                        style={{ cursor: 'pointer', border: activeTab === 'logs' ? '2px solid var(--primary-color)' : '' }}
                    >
                        <span className="stats-label">System Logs</span>
                    </button>
                </div>

                {activeTab === 'overview' && metrics && (
                    <div className="admin-stats-grid-container">
                        <div className="card stats-card-content">
                            <span className="stats-label">Total Users</span>
                            <span className="stats-value">{metrics.users}</span>
                        </div>
                        <div className="card stats-card-content">
                            <span className="stats-label">Admins</span>
                            <span className="stats-value stats-value-accent">{metrics.admins}</span>
                        </div>
                        <div className="card stats-card-content">
                            <span className="stats-label">System Activities</span>
                            <span className="stats-value stats-value-info">{metrics.totalActivity}</span>
                        </div>
                    </div>
                )}

                {activeTab === 'users' && <UserAdminManagement />}
                {activeTab === 'announcements' && <Announcements />}
                {activeTab === 'moderation' && <ContentModeration />}
                {activeTab === 'logs' && <SystemLogs />}

                <ConfirmationModal
                    isOpen={logoutModal}
                    title="Confirm Logout"
                    message="Are you sure you want to log out?"
                    onConfirm={confirmLogout}
                    onCancel={() => setLogoutModal(false)}
                    confirmText="Logout"
                />

            </main>
        </div>
    );
};

export default SuperAdminDashboard;
