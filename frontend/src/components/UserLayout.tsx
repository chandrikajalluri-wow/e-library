import React from 'react';
import { Outlet } from 'react-router-dom';
import UserSidebar from './UserSidebar';
import '../styles/AdminDashboard.css';

const UserLayout: React.FC = () => {
    return (
        <div className="admin-layout">
            <UserSidebar />
            <main className="admin-main-content">
                <Outlet />
            </main>
        </div>
    );
};

export default UserLayout;
