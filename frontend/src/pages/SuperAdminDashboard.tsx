import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import UserAdminManagement from '../components/superAdmin/UserAdminManagement';
import SystemLogs from '../components/superAdmin/SystemLogs';
import Announcements from '../components/superAdmin/Announcements';
import ContactQueries from '../components/superAdmin/ContactQueries';
import ReportedReviews from '../components/superAdmin/ReportedReviews';
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
                        <h2 className="admin-header-title">
                            {activeTab === 'metrics' && 'Super Admin Dashboard'}
                            {activeTab === 'users' && 'User & Admin Management'}
                            {activeTab === 'books' && 'Library Collection'}
                            {activeTab === 'categories' && 'Library Categories'}
                            {activeTab === 'announcements' && 'System Announcements'}
                            {activeTab === 'queries' && 'User Queries'}
                            {activeTab === 'reported-reviews' && 'Review Reports'}
                            {activeTab === 'logs' && 'System Activity Logs'}
                        </h2>
                        <p className="admin-header-subtitle">Welcome back, Super Administrator</p>
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

                {activeTab === 'users' && <UserAdminManagement hideTitle={true} />}
                {(activeTab === 'books' || activeTab === 'categories') && <AdminDashboard hideHeader={true} />}
                {activeTab === 'announcements' && <Announcements hideTitle={true} />}
                {activeTab === 'queries' && <ContactQueries hideTitle={true} />}
                {activeTab === 'reported-reviews' && <ReportedReviews hideTitle={true} />}
                {activeTab === 'logs' && <SystemLogs hideTitle={true} />}
            </main>
        </div>
    );
};

export default SuperAdminDashboard;
