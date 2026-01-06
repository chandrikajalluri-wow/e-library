import React from 'react';
import UserNavbar from '../components/UserNavbar';
import Footer from '../components/Footer';

const OurMission: React.FC = () => {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)' }}>
            <UserNavbar />
            <div style={{ flex: 1, padding: '3rem', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem', fontWeight: 700, color: 'var(--primary-color)' }}>Our Mission</h1>

                <div style={{ marginBottom: '3rem' }}>
                    <p style={{ fontSize: '1.25rem', lineHeight: '1.8', marginBottom: '1.5rem' }}>
                        To empower our community to explore, discover, and learn by providing seamless access to a wealth of knowledge and reading materials.
                    </p>
                </div>

                <div style={{ display: 'grid', gap: '2rem', textAlign: 'left' }}>
                    <div style={{ background: 'var(--card-bg)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Accessibility</h3>
                        <p style={{ opacity: 0.8, lineHeight: '1.6' }}>We believe that knowledge should be free and accessible to everyone. Our platform removes barriers to reading.</p>
                    </div>
                    <div style={{ background: 'var(--card-bg)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Innovation</h3>
                        <p style={{ opacity: 0.8, lineHeight: '1.6' }}>We continuously improve our digital library experience with modern technology and user-centric design.</p>
                    </div>
                    <div style={{ background: 'var(--card-bg)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Community</h3>
                        <p style={{ opacity: 0.8, lineHeight: '1.6' }}>We foster a community of readers and learners, encouraging curiosity and lifelong education.</p>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default OurMission;
