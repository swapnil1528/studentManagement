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

    // ─── Auto-logout after 10 min inactivity ─────────────────
    useEffect(() => {
        if (!user) return; // Only track when authenticated

        const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes
        let timer = null;

        const resetTimer = () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                console.log('[Auth] Auto-logout: 10 min inactivity');
                setUser(null);
                localStorage.removeItem(STORAGE_KEY);
                // Clear any cached admin data
                try { localStorage.removeItem('adminDataCache'); } catch (e) { }
                window.location.href = '/login';
            }, INACTIVITY_TIMEOUT);
        };

        // Events that indicate user activity
        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
        events.forEach(evt => window.addEventListener(evt, resetTimer, { passive: true }));

        // Start the timer
        resetTimer();

        return () => {
            if (timer) clearTimeout(timer);
            events.forEach(evt => window.removeEventListener(evt, resetTimer));
        };
    }, [user]);

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
            // Normalize role to lowercase (sheet may have 'Admin', 'Student', etc.)
            const rawRole = (result.role || 'admin').toLowerCase();
            const resolvedStudentId = result.studentId || result.studId || result.userId || result.id || (rawRole === 'student' ? (result.username || username || 'ST-2026-1001') : '');
            const userData = {
                username: result.username || result.user || username,
                role: rawRole,
                branch: result.branch || 'All',
                userId: result.userId || result.id || resolvedStudentId,
                studentId: resolvedStudentId,
                name: result.name || '',
                photo: result.photo || '',
                batch: result.batch || ''
            };
            console.log('[Auth] Stored user:', userData);
            setUser(userData);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
            // Reset fee reminder session flag on fresh login so student sees the reminder popup
            try {
                sessionStorage.removeItem(`fee_reminder_closed_${resolvedStudentId}`);
                sessionStorage.removeItem(`fee_reminder_closed_${userData.userId}`);
                sessionStorage.removeItem('fee_reminder_closed_student');
            } catch (e) {}
            return { success: true };
        }
        return { success: false, error: result?.error || 'Invalid credentials' };
    };

    // ─── Logout ──────────────────────────────────────────────
    const logout = () => {
        try {
            sessionStorage.clear();
        } catch (e) {}
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
        isTeacher: user?.role === 'teacher',
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
