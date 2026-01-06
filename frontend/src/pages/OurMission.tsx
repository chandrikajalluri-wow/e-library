import React from 'react';
import UserNavbar from '../components/UserNavbar';
import Footer from '../components/Footer';

import '../styles/StaticPages.css';

const OurMission: React.FC = () => {
    return (
        <div className="static-page-container">
            <UserNavbar />
            <div className="static-content-wrapper mission-content-wrapper">
                <h1 className="static-title-h1 mission-title">Our Mission</h1>

                <div style={{ marginBottom: '3rem' }}>
                    <p className="static-text-p">
                        To empower our community to explore, discover, and learn by providing seamless access to a wealth of knowledge and reading materials.
                    </p>
                </div>

                <div className="mission-grid">
                    <div className="mission-card">
                        <h3 className="mission-card-title">Accessibility</h3>
                        <p className="mission-card-text">We believe that knowledge should be free and accessible to everyone. Our platform removes barriers to reading.</p>
                    </div>
                    <div className="mission-card">
                        <h3 className="mission-card-title">Innovation</h3>
                        <p className="mission-card-text">We continuously improve our digital library experience with modern technology and user-centric design.</p>
                    </div>
                    <div className="mission-card">
                        <h3 className="mission-card-title">Community</h3>
                        <p className="mission-card-text">We foster a community of readers and learners, encouraging curiosity and lifelong education.</p>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default OurMission;
