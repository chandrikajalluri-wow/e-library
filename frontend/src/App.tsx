import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Signup from './components/SignUp';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import VerifyEmail from './components/VerifyEmail';

import AdminDashboard from './pages/AdminDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import AxiosInterceptor from './components/AxiosInterceptor';

import BookList from './pages/BookList';
import BookDetail from './pages/BookDetail';
import UserDashboard from './pages/UserDashboard';
import UserProfile from './pages/UserProfile';
import WishlistPage from './pages/WishlistPage';
import BookRequestPage from './pages/BookRequestPage';
import Home from './pages/Home';
import About from './pages/About';
import OurMission from './pages/OurMission';
import Contact from './pages/Contact';
import TermsAndConditions from './pages/TermsAndConditions';
import PrivacyPolicy from './pages/PrivacyPolicy';
import MembershipPlans from './pages/MembershipPlans';
import UserSettings from './pages/UserSettings';
import NotificationsPage from './pages/NotificationsPage';

import ProtectedRoute from './components/ProtectedRoute';
import UserLayout from './components/UserLayout';
import ScrollRevealHandler from './components/ScrollRevealHandler';

import { ThemeProvider } from './context/ThemeContext';
import ThemeToggle from './components/ThemeToggle';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <Router>
        <ScrollRevealHandler />
        <AxiosInterceptor />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/mission" element={<OurMission />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/terms" element={<TermsAndConditions />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/memberships" element={<MembershipPlans />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot" element={<ForgotPassword />} />
          <Route path="/reset/:token" element={<ResetPassword />} />
          <Route path="/verify/:token" element={<VerifyEmail />} />

          <Route element={<ProtectedRoute allowedRoles={['user', 'admin', 'super_admin']} />}>
            <Route element={<UserLayout />}>
              {/* User Routes */}
              <Route path="/dashboard" element={<UserDashboard />} />
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/settings" element={<UserSettings />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/wishlist" element={<WishlistPage />} />
              <Route path="/request-book" element={<BookRequestPage />} />
              <Route path="/books" element={<BookList />} />
              <Route path="/books/:id" element={<BookDetail />} />

              {/* Admin Routes */}
              <Route element={<ProtectedRoute allowedRoles={['admin', 'super_admin']} />}>
                <Route path="/admin-dashboard" element={<AdminDashboard />} />
              </Route>

              {/* Super Admin Routes */}
              <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
                <Route path="/super-admin-dashboard" element={<SuperAdminDashboard />} />
              </Route>
            </Route>
          </Route>
        </Routes>
        <ThemeToggle className="theme-toggle-fixed" />
      </Router>
    </ThemeProvider>
  );
};

export default App;
