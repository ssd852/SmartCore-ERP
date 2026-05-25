import React from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const WHITELISTED_EMAILS = [
  'mohammadnaseraldeen26@gmail.com',
  'mohammadnaseraldeen25@gmail.com'
];

export default function SuperAdminGuard({ children }) {
  const { authUser } = useApp();

  const isSuperAdmin = authUser?.email && WHITELISTED_EMAILS.includes(authUser.email.toLowerCase());

  if (!isSuperAdmin) {
    // Redirect non-whitelisted users safely back to the core Dashboard
    return <Navigate to="/" replace />;
  }

  return children;
}
