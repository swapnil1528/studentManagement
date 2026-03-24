/**
 * ============================================
 * App.jsx — Main Application Router
 * ============================================
 * Sets up React Router with role-based routing.
 * Protected routes redirect unauthenticated users to /login.
 * After login, users are redirected based on their role.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import React from 'react';

// Pages
import LoginPage from './pages/LoginPage';
import AdminPage from './pages/AdminPage';
import StudentPortal from './pages/student/StudentPortal';
import EmployeePortal from './pages/employee/EmployeePortal';

// Global UI
import Toast from './components/ui/Toast';
import LoadingBar from './components/ui/LoadingBar';

/**
 * ErrorBoundary — Catches rendering errors and shows a fallback UI
 * instead of a blank screen.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="card text-center max-w-md">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Something went wrong</h2>
            <p className="text-gray-500 text-sm mb-4">{this.state.error?.message || 'Unknown error'}</p>
            <button
              className="btn"
              onClick={() => { this.setState({ hasError: false }); window.location.href = '/login'; }}
            >
              Go to Login
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * ProtectedRoute — Wraps routes that require authentication.
 * Optionally checks for a specific role.
 */
function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user, loading } = useAuth();

  // Wait for session restore
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated → login
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Wrong role → redirect to correct dashboard
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  if (allowedRoles && !roles.includes(user?.role)) {
    if (user?.role === 'student') return <Navigate to="/student" replace />;
    if (user?.role === 'employee') return <Navigate to="/admin" replace />;
    return <Navigate to="/admin" replace />;
  }

  return children;
}

/**
 * RootRedirect — Redirects "/" to the correct dashboard based on role.
 */
function RootRedirect() {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (user?.role === 'student') return <Navigate to="/student" replace />;
  if (user?.role === 'employee') return <Navigate to="/employee" replace />;
  // admin and teacher both go to /admin
  return <Navigate to="/admin" replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        {/* Global UI components */}
        <LoadingBar />
        <Toast />

        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected — Admin */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['admin', 'employee', 'teacher']}>
                <AdminPage />
              </ProtectedRoute>
            }
          />

          {/* Protected — Student */}
          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRole="student">
                <StudentPortal />
              </ProtectedRoute>
            }
          />

          {/* Protected — Employee */}
          <Route
            path="/employee"
            element={
              <ProtectedRoute allowedRoles={['employee']}>
                <EmployeePortal />
              </ProtectedRoute>
            }
          />

          {/* Root — auto-redirect based on role */}
          <Route path="/" element={<RootRedirect />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
