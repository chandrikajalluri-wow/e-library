import React from 'react';
import { Outlet } from 'react-router-dom';
import UserNavbar from './UserNavbar';
import Footer from './Footer';
import { useTheme } from '../context/ThemeContext';
import { getProfile } from '../services/userService';
import { RoleName } from '../types/enums';
import '../styles/Home.css';

const UserLayout: React.FC = () => {
    const { theme, setTheme } = useTheme();

    React.useEffect(() => {
        const syncTheme = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const profile = await getProfile();
                    if (profile.theme && profile.theme !== theme) {
                        setTheme(profile.theme);
                    }
                } catch (err) {
                    console.error('Failed to sync theme in layout:', err);
                }
            }
        };
        syncTheme();
    }, []);

    return (
        <div className="home-page saas-theme" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <UserNavbar />
            <main style={{ paddingTop: '100px', flex: 1, backgroundColor: 'var(--bg-color)', transition: 'background-color 0.3s ease' }}>
                <div className="saas-container">
                    <Outlet />
                </div>
            </main>
            {localStorage.getItem('role') !== RoleName.ADMIN && localStorage.getItem('role') !== RoleName.SUPER_ADMIN && <Footer />}
        </div>
    );
};

export default UserLayout;
