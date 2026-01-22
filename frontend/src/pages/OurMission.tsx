import React from 'react';



import '../styles/StaticPages.css';

const OurMission: React.FC = () => {
    return (
        <div className="static-page-container">

            <div className="static-content-wrapper">
                <div className="static-hero saas-reveal">
                    <h1 className="static-title-h1">The Bookstack Mission</h1>
                    <p className="static-subtitle">Democratizing knowledge through technology and community.</p>
                </div>

                <div className="mission-grid">
                    <div className="mission-card saas-reveal">
                        <h3 className="mission-card-title">Accessibility</h3>
                        <p className="mission-card-text">We believe knowledge should be a fundamental right. Our platform eliminates physical and financial barriers to premium reading materials.</p>
                    </div>
                    <div className="mission-card saas-reveal" style={{ transitionDelay: '0.1s' }}>
                        <h3 className="mission-card-title">Innovation</h3>
                        <p className="mission-card-text">We use cutting-edge digital library technology to create an experience that is faster, smarter, and more personalized than ever before.</p>
                    </div>
                    <div className="mission-card saas-reveal" style={{ transitionDelay: '0.2s' }}>
                        <h3 className="mission-card-title">Community</h3>
                        <p className="mission-card-text">Bookstack is more than just a tool; it's a growing ecosystem of lifelong learners committed to mutual discovery and growth.</p>
                    </div>
                    <div className="mission-card saas-reveal" style={{ transitionDelay: '0.3s' }}>
                        <h3 className="mission-card-title">Sustainability</h3>
                        <p className="mission-card-text">By digitizing the library experience, we reduce the environmental footprint of physical book distribution and storage.</p>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default OurMission;
