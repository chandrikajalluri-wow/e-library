import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { RoleName } from '../types/enums';
import { useAuth } from '../context/AuthContext';

interface Props {
  allowedRoles: string[];
}

const ProtectedRoute: React.FC<Props> = ({ allowedRoles }) => {
  const { token, role, isLoading } = useAuth();

  if (isLoading) return <div className="loading-fallback">Verifying authentication...</div>;

  if (!token) return <Navigate to="/login" replace />;

  if (role && !allowedRoles.includes(role)) {
    // Role-aware redirection
    if (role === RoleName.SUPER_ADMIN) return <Navigate to="/super-admin-dashboard" replace />;
    if (role === RoleName.ADMIN) return <Navigate to="/admin-dashboard" replace />;
    return <Navigate to="/books" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
