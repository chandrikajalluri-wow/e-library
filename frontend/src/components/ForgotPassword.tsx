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
    <div className="auth-container">
      <h2>Forgot Password</h2>
      <input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button onClick={handleForgot}>Send Reset Link</button>
    </div>
  );
};

export default ForgotPassword;
