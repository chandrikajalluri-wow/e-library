import React from 'react';
import { Outlet } from 'react-router-dom';
import UserNavbar from './UserNavbar';
import Footer from './Footer';
import '../styles/Home.css';

const PublicLayout: React.FC = () => {
    return (
        <div className="public-layout-container saas-theme">
            <UserNavbar />
            <main style={{ minHeight: 'calc(100vh - 300px)' }}>
                <Outlet />
            </main>
            <Footer />
        </div>
    );
};

export default PublicLayout;
