import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingPage from '../pages/LoadingPage';

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading, userStatus } = useAuth();

  if (loading) {
    return <LoadingPage />;
  }

  if (isAuthenticated) {
    if (userStatus === 'pending') {
      return <Navigate to="/login-pending" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default PublicRoute;
