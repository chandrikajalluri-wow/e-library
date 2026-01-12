import React from 'react';
import { Outlet } from 'react-router-dom';
import UserNavbar from './UserNavbar';
import '../styles/Home.css';

const UserLayout: React.FC = () => {
    return (
        <div className="home-page saas-theme">
            <UserNavbar />
            <main style={{ paddingTop: '100px', minHeight: '100vh', backgroundColor: 'var(--bg-color)', transition: 'background-color 0.3s ease' }}>
                <div className="saas-container">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default UserLayout;
