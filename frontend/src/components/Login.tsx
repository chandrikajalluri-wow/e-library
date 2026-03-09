import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, googleLogin } from '../services/authService';
import Loader from './Loader';
import { toast } from 'react-toastify';
import { Eye, EyeOff } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { RoleName } from '../types/enums';
import { GoogleLogin } from '@react-oauth/google';
import '../styles/Auth.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { setTheme } = useTheme();
  const { login: authLogin } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const data = await login(email, password);
      authLogin({ user: data.user || data, token: data.token, role: data.role });

      if (data.theme && !localStorage.getItem('theme')) {
        setTheme(data.theme);
        localStorage.setItem('theme', data.theme);
      }

      setError('');
      toast.success(`Welcome, ${email}!`);

      if (data.role === RoleName.SUPER_ADMIN) {
        navigate('/super-admin-dashboard');
      } else if (data.role === RoleName.ADMIN) {
        navigate('/admin-dashboard');
      } else {
        navigate('/books');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Login failed, please try again';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setIsLoading(true);
    try {
      const data = await googleLogin(credentialResponse.credential);
      authLogin({ user: data.user || data, token: data.token, role: data.role });

      if (data.theme && !localStorage.getItem('theme')) {
        setTheme(data.theme);
        localStorage.setItem('theme', data.theme);
      }

      toast.success('Welcome back!');

      if (data.role === RoleName.SUPER_ADMIN) {
        navigate('/super-admin-dashboard');
      } else if (data.role === RoleName.ADMIN) {
        navigate('/admin-dashboard');
      } else {
        navigate('/books');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Google Login failed';
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

        <div className="auth-separator">OR</div>

        <div className="auth-social-login">
          {import.meta.env.VITE_GOOGLE_CLIENT_ID && !import.meta.env.VITE_GOOGLE_CLIENT_ID.includes('your_google_client_id_here') ? (
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => {
                console.error('Google GSI Error: This is likely due to an unauthorized origin or blocked third-party cookies.');
                toast.error('Google Sign In failed. Please ensure third-party cookies are enabled or check your configuration.');
              }}
              useOneTap
              theme="outline"
              shape="pill"
              text="signin_with"
              width="100%"
            />
          ) : (
            <button className="auth-social-btn-disabled" disabled title="Google Login not configured">
              <span>Sign in with Google (Not Configured)</span>
            </button>
          )}
        </div>

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
