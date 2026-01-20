import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import Loader from './Loader';
import { RoleName } from '../types/enums';

interface Props {
  allowedRoles: string[];
}

const ProtectedRoute: React.FC<Props> = ({ allowedRoles }) => {
  const token = localStorage.getItem('token');
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        // Assuming payload has { id, role }
        setRole(decoded.role);
      } catch (e) {
        console.error('Invalid token');
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, [token]);

  if (loading) return <Loader />;

  if (!token) return <Navigate to="/" replace />;

  if (role && !allowedRoles.includes(role)) {
    // Role-aware redirection
    if (role === RoleName.SUPER_ADMIN) return <Navigate to="/super-admin-dashboard" replace />;
    if (role === RoleName.ADMIN) return <Navigate to="/admin-dashboard" replace />;
    return <Navigate to="/books" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
