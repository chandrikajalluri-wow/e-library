import React, { useState } from 'react';
import { forgotPassword } from '../services/authService';
import '../styles/Auth.css';
import { toast } from 'react-toastify';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');

  const handleForgot = async () => {
    try {
      await forgotPassword(email);
      toast.success('Reset link sent to your email');
    } catch (err: unknown) {
      toast.error('Error sending reset link');
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-bg-glow">
        <div className="auth-glow-1"></div>
        <div className="auth-glow-2"></div>
      </div>

      <div className="auth-container">
        <div className="auth-logo-header">
          <div className="auth-logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v15.661a2.5 2.5 0 0 1-2.261 2.482L5 20.5a2.5 2.5 0 0 1-1-5z"></path>
              <path d="M8 7h8"></path>
              <path d="M8 11h8"></path>
            </svg>
          </div>
          <h2>Reset Password</h2>
          <p className="auth-subtitle">We'll send a recovery link to your email</p>
        </div>

        <div className="auth-form-group">
          <label>Email Address</label>
          <input
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <button className="auth-submit-btn" onClick={handleForgot}>
          Send Reset Link
        </button>

        <div className="auth-footer">
          <p>Remember your password?
            <button className="auth-link-btn" onClick={() => window.history.back()}>Go Back</button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
