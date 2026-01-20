import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/authService';
import Loader from './Loader';
import { toast } from 'react-toastify';
import { Eye, EyeOff } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { RoleName } from '../types/enums';
import '../styles/Auth.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { setTheme } = useTheme();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const { token, role, userId, theme } = await login(email, password);
      localStorage.setItem('token', token);
      localStorage.setItem('role', role);
      localStorage.setItem('userId', userId);

      if (theme) {
        setTheme(theme);
        localStorage.setItem('theme', theme);
      }

      setError('');

      toast.success(`Welcome, ${email}!`);

      // Role-based redirect
      if (role === RoleName.SUPER_ADMIN) {
        navigate('/super-admin-dashboard');
      } else if (role === RoleName.ADMIN) {
        navigate('/admin-dashboard'); //  admins go here
      } else {
        navigate('/books'); //  normal users go here
      }
    } catch (err: unknown) {
      const msg =
        (err as any)?.response?.data?.error || 'Login failed, please try again';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
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
          <h2>Welcome Back</h2>
          <p className="auth-subtitle">Log in to your Bookstack library</p>
        </div>

        {error && <p className="error-text">{error}</p>}

        <div className="auth-form-group">
          <label>Email Address</label>
          <input
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="auth-form-group">
          <label>Password</label>
          <div className="password-input-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <button className="auth-submit-btn" onClick={handleLogin} disabled={isLoading}>
          {isLoading ? <Loader small /> : 'Sign In'}
        </button>

        <div className="auth-footer">
          <p>Don't have an account?
            <button className="auth-link-btn" onClick={() => navigate('/signup')}>Create Account</button>
          </p>
          <div className="auth-secondary-links">
            <button className="auth-link-btn" onClick={() => navigate('/forgot')}>Forgot Password?</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
