import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ToastContainer } from 'react-toastify';
import './index.css';
import './App.css';
import 'react-toastify/dist/ReactToastify.css';
import { CartProvider } from './context/CartContext';
import { GoogleOAuthProvider } from '@react-oauth/google';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

if (!clientId || clientId.includes('your_google_client_id_here')) {
  console.error('GOOGLE CLIENT ID is missing. Please set VITE_GOOGLE_CLIENT_ID in your .env file.');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {clientId && !clientId.includes('your_google_client_id_here') ? (
      <GoogleOAuthProvider clientId={clientId}>
        <CartProvider>
          <App />
          <ToastContainer position="top-right" autoClose={3000} />
        </CartProvider>
      </GoogleOAuthProvider>
    ) : (
      <CartProvider>
        <App />
        <ToastContainer position="top-right" autoClose={3000} />
      </CartProvider>
    )}
  </React.StrictMode>
);


