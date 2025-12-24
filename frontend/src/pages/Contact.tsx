import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import '../styles/Contact.css';

const Contact: React.FC = () => {
    const [formData, setFormData] = useState({ name: '', email: '', message: '' });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Contact form submitted:', formData);
        toast.success('Message sent! We will get back to you soon.');
        setFormData({ name: '', email: '', message: '' });
    };

    return (
        <div className="contact-page">
            {/* Mini Nav */}
            <nav className="contact-nav">
                <Link to="/" className="contact-logo-link">
                    <div className="contact-logo-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v15.661a2.5 2.5 0 0 1-2.261 2.482L5 20.5a2.5 2.5 0 0 1-1-5z"></path></svg>
                    </div>
                    <span className="contact-logo-text">E-Library</span>
                </Link>
                <Link to="/login" className="contact-login-link">Login</Link>
            </nav>

            <div className="contact-content">
                {/* Info */}
                <div>
                    <h2 className="contact-heading">Get in Touch</h2>
                    <p className="contact-description">
                        Have questions about our collection or need support with your account? Our team is here to help you navigate your reading journey.
                    </p>

                    <div className="contact-info-list">
                        <div className="contact-info-item">
                            <div className="contact-info-icon">📍</div>
                            <div>
                                <div className="contact-info-title">Global Headquarters</div>
                                <div className="contact-info-subtitle">Doopnahalli, Bangalore</div>
                            </div>
                        </div>
                        <div className="contact-info-item">
                            <div className="contact-info-icon">📧</div>
                            <div>
                                <div className="contact-info-title">Email Us</div>
                                <div className="contact-info-subtitle">chandrika6300@gmail.com</div>
                            </div>
                        </div>
                        <div className="contact-info-item">
                            <div className="contact-info-icon">📞</div>
                            <div>
                                <div className="contact-info-title">Call Support</div>
                                <div className="contact-info-subtitle">+91 6300137288</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <div className="card contact-form-card">
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="contact-label">Full Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Enter your name"
                                required
                                className="contact-input"
                            />
                        </div>
                        <div className="form-group">
                            <label className="contact-label">Email Address</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="example@email.com"
                                required
                                className="contact-input"
                            />
                        </div>
                        <div className="form-group">
                            <label className="contact-label">Message</label>
                            <textarea
                                value={formData.message}
                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                placeholder="How can we help you?"
                                required
                                className="contact-textarea"
                            ></textarea>
                        </div>
                        <button type="submit" className="btn-primary contact-submit-btn">
                            Send Message
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Contact;
