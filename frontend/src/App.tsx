import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Signup from './components/SignUp';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import VerifyEmail from './components/VerifyEmail';

import AdminDashboard from './pages/AdminDashboard';

import BookList from './pages/BookList';
import BookDetail from './pages/BookDetail';
import UserDashboard from './pages/UserDashboard';
import UserProfile from './pages/UserProfile';
import WishlistPage from './pages/WishlistPage';
import BookRequestPage from './pages/BookRequestPage';
import Home from './pages/Home';
import Contact from './pages/Contact';

import ProtectedRoute from './components/ProtectedRoute';
import UserLayout from './components/UserLayout';

import { ThemeProvider } from './context/ThemeContext';
import ThemeToggle from './components/ThemeToggle';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot" element={<ForgotPassword />} />
          <Route path="/reset/:token" element={<ResetPassword />} />
          <Route path="/verify/:token" element={<VerifyEmail />} />

          {/* Protected User Routes with Sidebar Layout */}
          <Route element={<ProtectedRoute allowedRoles={['user', 'admin']} />}>
            <Route element={<UserLayout />}>
              <Route path="/dashboard" element={<UserDashboard />} />
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/wishlist" element={<WishlistPage />} />
              <Route path="/request-book" element={<BookRequestPage />} />
            </Route>
            <Route path="/books" element={<BookList />} />
            <Route path="/books/:id" element={<BookDetail />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
          </Route>
        </Routes>
        <ThemeToggle />
      </Router>
    </ThemeProvider>
  );
};

export default App;
