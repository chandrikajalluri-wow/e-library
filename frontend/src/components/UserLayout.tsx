import React from 'react';
import { Outlet } from 'react-router-dom';
import UserSidebar from './UserSidebar';
import '../styles/AdminDashboard.css'; // Reusing layout styles for consistency

const UserLayout: React.FC = () => {
    return (
        <div className="admin-layout"> {/* Reusing the flex layout */}
            <UserSidebar />
            <main className="admin-main-content">
                <Outlet />
            </main>
        </div>
    );
};

export default UserLayout;
