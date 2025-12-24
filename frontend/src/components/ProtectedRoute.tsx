import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

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

  if (loading) return <div>Loading...</div>;

  if (!token) return <Navigate to="/" replace />;

  if (role && !allowedRoles.includes(role)) {
    return <Navigate to="/books" replace />; // Redirect unauthorized users to catalog
  }

  return <Outlet />;
};

export default ProtectedRoute;
