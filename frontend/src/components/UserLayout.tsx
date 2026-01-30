import React from 'react';
import { Outlet } from 'react-router-dom';
import UserNavbar from './UserNavbar';
import Footer from './Footer';

import { RoleName } from '../types/enums';
import '../styles/Home.css';

const UserLayout: React.FC = () => {

    // Theme sync logic removed to prevent overriding local preference
    // The ThemeContext now handles persistence reliably via localStorage

    return (
        <div className="user-layout-container saas-theme" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <UserNavbar />
            <main style={{ flex: 1, backgroundColor: 'var(--bg-color)', transition: 'background-color 0.3s ease' }}>
                <div className="saas-container">
                    <Outlet />
                </div>
            </main>
            {localStorage.getItem('role') !== RoleName.ADMIN && localStorage.getItem('role') !== RoleName.SUPER_ADMIN && <Footer />}
        </div>
    );
};

export default UserLayout;
