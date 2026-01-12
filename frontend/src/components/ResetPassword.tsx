import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { resetPassword } from '../services/authService';
import '../styles/Auth.css';
import { toast } from 'react-toastify';

const ResetPassword: React.FC = () => {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleReset = async () => {
    if (!token) {
      toast('Invalid reset link');
      return;
    }

    const passwordRegex =
      /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      toast.error(
        'Password must be at least 8 characters long and contain at least one uppercase letter, one number, and one special character'
      );
      return;
    }

    try {
      await resetPassword(token, password);
      toast('Password reset successful, please login');
      navigate('/');
    } catch (err: unknown) {
      toast('Error resetting password');
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
          <h2>Set New Password</h2>
          <p className="auth-subtitle">Ensure your account stays secure</p>
        </div>

        <div className="auth-form-group">
          <label>New Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button className="auth-submit-btn" onClick={handleReset}>
          Update Password
        </button>

        <div className="auth-footer">
          <p>Suddenly remembered?
            <button className="auth-link-btn" onClick={() => navigate('/login')}>Sign In</button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
