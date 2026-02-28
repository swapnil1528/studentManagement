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

// Pages
import LoginPage from './pages/LoginPage';
import AdminPage from './pages/AdminPage';
import StudentPortal from './pages/student/StudentPortal';
import EmployeePortal from './pages/employee/EmployeePortal';

// Global UI
import Toast from './components/ui/Toast';
import LoadingBar from './components/ui/LoadingBar';

/**
 * ProtectedRoute — Wraps routes that require authentication.
 * Optionally checks for a specific role.
 */
function ProtectedRoute({ children, allowedRole }) {
  const { isAuthenticated, user, loading } = useAuth();

  // Wait for session restore
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">Loading...</div>;

  // Not authenticated → login
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Wrong role → redirect to correct dashboard
  if (allowedRole && user?.role !== allowedRole) {
    if (user?.role === 'student') return <Navigate to="/student" replace />;
    if (user?.role === 'employee') return <Navigate to="/employee" replace />;
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
  return <Navigate to="/admin" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      {/* Global UI components */}
      <LoadingBar />
      <Toast />

      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected — Admin */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRole="admin">
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
            <ProtectedRoute allowedRole="employee">
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
  );
}
