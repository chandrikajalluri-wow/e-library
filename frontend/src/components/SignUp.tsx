import React, { useState } from 'react';
import Loader from './Loader';
import { signup, googleLogin } from '../services/authService';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Eye, EyeOff } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import '../styles/Auth.css';

const Signup: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async () => {
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Invalid email format');
      return;
    }

    const passwordRegex =
      /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      setError(
        'Password must be at least 8 characters long and contain at least one uppercase letter, one number, and one special character'
      );
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await signup(name, email, password);
      setError('');
      toast.success(
        'Signup successful! Please check your email to verify your account.'
      );
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: unknown) {
      const msg =
        (err as any)?.response?.data?.error ||
        'Signup failed, please try again';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setIsLoading(true);
    try {
      const { token, role, userId } = await googleLogin(credentialResponse.credential);
      localStorage.setItem('token', token);
      localStorage.setItem('role', role);
      localStorage.setItem('userId', userId);

      toast.success('Welcome! Logged in with Google');
      window.location.href = '/books';
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.error || 'Google Login failed';
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
          <h2>Sign Up</h2>
          <p className="auth-subtitle">Join the Bookstack community</p>
        </div>

        {error && <p className="error-text">{error}</p>}

        <div className="auth-form-group">
          <label>Full Name</label>
          <input
            type="text"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
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

        <div className="auth-form-group">
          <label>Confirm Password</label>
          <div className="password-input-wrapper">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <button className="auth-submit-btn" onClick={handleSignup} disabled={isLoading}>
          {isLoading ? <Loader small /> : 'Sign Up'}
        </button>

        <div className="auth-separator">OR</div>

        <div className="auth-social-login">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => {
              console.error('Google GSI Error: This is likely due to an unauthorized origin or blocked third-party cookies.');
              toast.error('Google Sign In failed. Please ensure third-party cookies are enabled or check your configuration.');
            }}
            useOneTap
            theme="outline"
            shape="pill"
            text="signup_with"
            width="100%"
          />
        </div>

        <div className="auth-footer">
          <p>Already have an account?
            <button className="auth-link-btn" onClick={() => navigate('/login')}>Sign In</button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
