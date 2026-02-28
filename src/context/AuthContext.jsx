/**
 * ============================================
 * Authentication Context
 * ============================================
 * Provides global auth state to the entire app via React Context.
 * Handles login, logout, session persistence (localStorage),
 * and role-based access control.
 *
 * Usage in any component:
 *   const { user, login, logout, isAuthenticated } = useAuth();
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { loginUser } from '../services/api';

// Storage key for persisted session
const STORAGE_KEY = 'erp_session';

// Create the context
const AuthContext = createContext(null);

/**
 * AuthProvider wraps the app and provides auth state + methods.
 */
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true); // true while restoring session

    // ─── Restore session on mount ────────────────────────────
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                setUser(JSON.parse(stored));
            }
        } catch (e) {
            console.error('[Auth] Failed to restore session:', e);
            localStorage.removeItem(STORAGE_KEY);
        } finally {
            setLoading(false);
        }
    }, []);

    // ─── Login ───────────────────────────────────────────────
    /**
     * Authenticate with the backend and store the session.
     * @param {string} username
     * @param {string} password
     * @returns {{ success: boolean, error?: string }}
     */
    const login = async (username, password) => {
        const result = await loginUser(username, password);
        console.log('[Auth] Login response:', result);

        if (result && result.success) {
            // Handle different field name conventions from backend
            const userData = {
                username: result.username || result.user || username,
                role: result.role || 'admin',
                branch: result.branch || 'All',
                userId: result.userId || result.id || '',
                studentId: result.studentId || result.studId || '',
            };
            console.log('[Auth] Stored user:', userData);
            setUser(userData);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
            return { success: true };
        }
        return { success: false, error: result?.error || 'Invalid credentials' };
    };

    // ─── Logout ──────────────────────────────────────────────
    const logout = () => {
        setUser(null);
        localStorage.removeItem(STORAGE_KEY);
    };

    // ─── Context value ──────────────────────────────────────
    const value = {
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isStudent: user?.role === 'student',
        isEmployee: user?.role === 'employee',
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

/**
 * Custom hook to consume auth context.
 * Must be used inside <AuthProvider>.
 */
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
