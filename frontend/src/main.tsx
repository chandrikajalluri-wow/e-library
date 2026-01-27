import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ToastContainer } from 'react-toastify';
import './index.css';
import './App.css';
import 'react-toastify/dist/ReactToastify.css';
import { BorrowCartProvider } from './context/BorrowCartContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BorrowCartProvider>
      <App />
      <ToastContainer position="top-right" autoClose={3000} />
    </BorrowCartProvider>
  </React.StrictMode>
);


