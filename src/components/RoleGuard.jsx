import React from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function RoleGuard({ children, allowedRoles }) {
  const { userRole } = useApp();

  if (!userRole) {
    // If somehow the role isn't loaded yet or there's no user, fallback to Dashboard or Login.
    // Usually SubscriptionGuard handles the basic auth check first.
    return <Navigate to="/" replace />;
  }

  if (!allowedRoles.includes(userRole)) {
    // Role not authorized, safely redirect to core Dashboard
    return <Navigate to="/" replace />;
  }

  return children;
}
