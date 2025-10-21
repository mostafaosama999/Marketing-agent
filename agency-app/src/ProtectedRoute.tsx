// src/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { Box, Typography, Alert } from '@mui/material';
import { useAuth } from './contexts/AuthContext';
import { UserRole } from './types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireAuth?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles = ['CEO', 'Manager', 'Writer'], 
  requireAuth = true 
}) => {
  const { user, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  // Redirect to login if not authenticated
  if (requireAuth && !user) {
    return <Navigate to="/login" replace />;
  }

  if (user && userProfile && !allowedRoles.includes(userProfile.role)) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <Typography variant="h6">Access Denied</Typography>
          <Typography>
            You don't have permission to access this page. 
            Required roles: {allowedRoles.join(', ')}. 
            Your role: {userProfile.role}
          </Typography>
        </Alert>
      </Box>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;