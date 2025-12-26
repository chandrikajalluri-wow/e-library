import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/authService';
import Loader from './Loader';
import { toast } from 'react-toastify';
import '../styles/Auth.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const { token, role } = await login(email, password);
      localStorage.setItem('token', token);
      localStorage.setItem('role', role);
      setError('');

      toast.success(`Welcome, ${email}!`);

      // Role-based redirect
      if (role === 'admin') {
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
    <div className="auth-container">
      <h2>Login</h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && <p className="error-text">{error}</p>}

      <button onClick={handleLogin} disabled={isLoading}>
        {isLoading ? <Loader small /> : 'Login'}
      </button>

      <div className="auth-links">
        <button onClick={() => navigate('/signup')}>Go to Signup</button>
        <button onClick={() => navigate('/forgot')}>Forgot Password?</button>
      </div>
    </div>
  );
};

export default Login;
