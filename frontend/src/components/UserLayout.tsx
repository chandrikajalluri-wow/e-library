import React from 'react';
import { Outlet } from 'react-router-dom';
import UserNavbar from './UserNavbar';
import Footer from './Footer';
import AdminFooter from './AdminFooter';

import { RoleName } from '../types/enums';
import '../styles/Home.css';

import '../styles/UserLayout.css';

const UserLayout: React.FC = () => {

    // Theme sync logic removed to prevent overriding local preference
    // The ThemeContext now handles persistence reliably via localStorage
    const role = localStorage.getItem('role');

    return (
        <div className="user-layout-container saas-theme">
            <UserNavbar />
            <main className="user-layout-main">
                <div className="saas-container">
                    <Outlet />
                </div>
            </main>
            {role === RoleName.ADMIN || role === RoleName.SUPER_ADMIN ? <AdminFooter /> : <Footer />}
        </div>
    );
};

export default UserLayout;
