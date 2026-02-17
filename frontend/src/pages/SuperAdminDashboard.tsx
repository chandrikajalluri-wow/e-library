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
        <div className="admin-layout">
            <main className="admin-main-content">
                {/* Dashboard Title */}
                <header className="admin-header">
                    <div className="admin-header-titles">
                        <h1 className="admin-header-title">
                            {activeTab === 'metrics' && 'Super Admin Dashboard'}
                            {activeTab === 'users' && 'User & Admin Management'}
                            {activeTab === 'books' && 'Library Collection'}
                            {activeTab === 'categories' && 'Library Categories'}
                            {activeTab === 'announcements' && 'System Announcements'}
                            {activeTab === 'queries' && 'User Queries'}
                            {activeTab === 'reported-reviews' && 'Review Reports'}
                            {activeTab === 'logs' && 'System Activity Logs'}
                        </h1>
                        <p className="admin-header-subtitle">Welcome back, Super Administrator</p>
                    </div>
                </header>

                {activeTab === 'metrics' && metrics && (
                    <>
                        <div className="admin-stats-grid-container" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '1.5rem' }}>
                            <div className="card stats-card-content">
                                <span className="stats-label">Total Books</span>
                                <span className="stats-value stats-value-info">{metrics.totalBooks}</span>
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
                        </div>

                        {/* New Advanced Metrics Row */}
                        <div className="admin-stats-grid-container" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                            <div className="card stats-card-content">
                                <span className="stats-label">Avg. Fulfillment Time</span>
                                <span className="stats-value stats-value-info">
                                    {metrics.avgFulfillmentTime > 24
                                        ? `${(metrics.avgFulfillmentTime / 24).toFixed(1)} Days`
                                        : `${metrics.avgFulfillmentTime} Hours`}
                                </span>
                            </div>
                            <div className="card stats-card-content">
                                <span className="stats-label">Average Order Value</span>
                                <span className="stats-value stats-value-accent">₹{metrics.averageOrderValue?.toLocaleString()}</span>
                            </div>
                            <div className="card stats-card-content">
                                <span className="stats-label">Cancellation Rate</span>
                                <span className="stats-value stats-value-danger" style={{ color: metrics.cancellationRate > 10 ? '#ef4444' : 'inherit' }}>
                                    {metrics.cancellationRate}%
                                </span>
                            </div>
                            <div className="card stats-card-content">
                                <span className="stats-label">Realized Orders</span>
                                <span className="stats-value stats-value-info">{metrics.realizedOrderCount}</span>
                            </div>
                        </div>
                        <AnalyticsDashboard data={metrics} />
                    </>
                )}

                {activeTab === 'users' && <UserAdminManagement hideTitle={true} />}
                {(activeTab === 'books' || activeTab === 'categories') && <AdminDashboard hideHeader={true} />}
                {activeTab === 'announcements' && <Announcements />}
                {activeTab === 'queries' && <ContactQueries />}
                {activeTab === 'reported-reviews' && <ReportedReviews />}
                {activeTab === 'logs' && <SystemLogs />}
            </main>
        </div>
    );
};

export default SuperAdminDashboard;
