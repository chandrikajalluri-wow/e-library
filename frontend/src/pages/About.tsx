import React from 'react';
import UserNavbar from '../components/UserNavbar';
import Footer from '../components/Footer';

const About: React.FC = () => {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)' }}>
            <UserNavbar />
            <div style={{ flex: 1, padding: '3rem', maxWidth: '800px', margin: '0 auto' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '1.5rem', fontWeight: 700 }}>About E-Library</h1>

                <div style={{ background: 'var(--card-bg)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <p style={{ fontSize: '1.1rem', lineHeight: '1.8', marginBottom: '1.5rem' }}>
                        Welcome to the E-Library, a modern digital solution designed to streamline the management and accessibility of books for our community.
                    </p>
                    <p style={{ fontSize: '1.1rem', lineHeight: '1.8', marginBottom: '1.5rem' }}>
                        Our mission is to provide an easy-to-use platform where users can discover new books, manage their reading lists, and easily borrow titles from our extensive collection.
                    </p>
                    <p style={{ fontSize: '1.1rem', lineHeight: '1.8' }}>
                        Whether you are reading for leisure or research, E-Library is here to support your journey with a seamless, intuitive experience.
                    </p>
                </div>

                <div style={{ marginTop: '3rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary-color)', marginBottom: '0.5rem' }}>1000+</div>
                        <div style={{ opacity: 0.8 }}>Books Available</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary-color)', marginBottom: '0.5rem' }}>24/7</div>
                        <div style={{ opacity: 0.8 }}>Digital Access</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary-color)', marginBottom: '0.5rem' }}>Free</div>
                        <div style={{ opacity: 0.8 }}>For All Members</div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default About;
