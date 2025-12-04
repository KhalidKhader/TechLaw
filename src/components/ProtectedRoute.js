import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingPage from '../pages/LoadingPage';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { isAuthenticated, loading, userRole, userStatus } = useAuth();

  if (loading) {
    return <LoadingPage />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (userStatus !== 'approved') {
    return <Navigate to="/login-pending" replace />;
  }

  if (requiredRole && userRole !== requiredRole) {
    const adminRoles = ['admin', 'superAdmin'];
    const userRoles = ['user', 'admin', 'superAdmin'];

    if (requiredRole === 'admin' && !adminRoles.includes(userRole)) {
      return <Navigate to="/dashboard" replace />;
    }

    if (requiredRole === 'user' && !userRoles.includes(userRole)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
