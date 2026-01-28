import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import UserAdminManagement from '../components/superAdmin/UserAdminManagement';
import SystemLogs from '../components/superAdmin/SystemLogs';
import Announcements from '../components/superAdmin/Announcements';
import ContentModeration from '../components/superAdmin/ContentModeration';
import AdminDashboard from './AdminDashboard';
import AnalyticsDashboard from '../components/superAdmin/AnalyticsDashboard';
import { getSystemMetrics } from '../services/superAdminService';
import '../styles/AdminDashboard.css';

const SuperAdminDashboard: React.FC = () => {
    const [searchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'metrics';
    const [metrics, setMetrics] = useState<any>(null);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const data = await getSystemMetrics();
                console.log('Fetched Metrics Data:', data);
                setMetrics(data);
            } catch (err) {
                console.error('Failed to fetch metrics:', err);
            }
        };
        if (activeTab === 'metrics') fetchMetrics();
    }, [activeTab]);

    return (
        <div className="admin-layout" style={{ marginTop: '20px' }}>
            <main className="admin-main-content">
                {/* Dashboard Title */}
                <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 className="admin-header-title">Super Admin Dashboard</h2>
                        <p className="admin-header-subtitle">System Overview & Management</p>
                    </div>
                </div>

                {activeTab === 'metrics' && metrics && (
                    <>
                        <div className="admin-stats-grid-container" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                            <div className="card stats-card-content">
                                <span className="stats-label">Total Users</span>
                                <span className="stats-value">{metrics.users}</span>
                            </div>
                            <div className="card stats-card-content">
                                <span className="stats-label">Admins</span>
                                <span className="stats-value stats-value-accent">{metrics.admins}</span>
                            </div>
                            <div className="card stats-card-content">
                                <span className="stats-label">Total Orders</span>
                                <span className="stats-value stats-value-info">{metrics.totalOrders}</span>
                            </div>
                            <div className="card stats-card-content">
                                <span className="stats-label">Total Revenue</span>
                                <span className="stats-value stats-value-accent">₹{metrics.totalRevenue?.toLocaleString()}</span>
                            </div>
                            <div className="card stats-card-content">
                                <span className="stats-label">System Activities</span>
                                <span className="stats-value stats-value-info">{metrics.totalActivity}</span>
                            </div>
                        </div>
                        <AnalyticsDashboard data={metrics} />
                    </>
                )}

                {activeTab === 'users' && <UserAdminManagement />}
                {(activeTab === 'books' || activeTab === 'categories') && <AdminDashboard />}
                {activeTab === 'announcements' && <Announcements />}
                {activeTab === 'moderation' && <ContentModeration />}
                {activeTab === 'logs' && <SystemLogs />}
            </main>
        </div>
    );
};

export default SuperAdminDashboard;
