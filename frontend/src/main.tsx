import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ToastContainer } from 'react-toastify';
import './index.css';
import './App.css';
import 'react-toastify/dist/ReactToastify.css';
import { BorrowCartProvider } from './context/BorrowCartContext';
import { GoogleOAuthProvider } from '@react-oauth/google';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={clientId}>
      <BorrowCartProvider>
        <App />
        <ToastContainer position="top-right" autoClose={3000} />
      </BorrowCartProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);


