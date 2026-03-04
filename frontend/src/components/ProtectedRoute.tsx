import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { RoleName } from '../types/enums';

interface Props {
  allowedRoles: string[];
}

const ProtectedRoute: React.FC<Props> = ({ allowedRoles }) => {
  const userId = localStorage.getItem('userId');
  const role = localStorage.getItem('role');

  if (!userId) return <Navigate to="/" replace />;

  if (role && !allowedRoles.includes(role)) {
    // Role-aware redirection
    if (role === RoleName.SUPER_ADMIN) return <Navigate to="/super-admin-dashboard" replace />;
    if (role === RoleName.ADMIN) return <Navigate to="/admin-dashboard" replace />;
    return <Navigate to="/books" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
