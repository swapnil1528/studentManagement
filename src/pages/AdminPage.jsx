/**
 * AdminPage — Wrapper that loads admin data and renders AdminLayout.
 * Uses localStorage cache so the dashboard appears instantly.
 * Fetches fresh data in the background and updates silently.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchAdminData } from '../services/api';
import { setLoading } from '../components/ui/LoadingBar';
import AdminLayout from '../components/layout/AdminLayout';

const CACHE_KEY = 'erp_admin_cache';
const CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes

// Empty defaults for safe rendering
const EMPTY_DATA = {
    inquiries: [], registrations: [], admissions: [], fees: [],
    activeStudents: [], employees: [], leaves: [], payroll: [],
    dropdowns: { branches: [], courses: [], villages: [], employees: [], education: [] },
    stats: { todayPresent: 0, todayAbsent: 0 },
    _rawAttendance: [],
};

/** Read cached admin data from localStorage */
function getCachedData() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const { data, timestamp } = JSON.parse(raw);
        // Return cached data if within expiry
        if (Date.now() - timestamp < CACHE_EXPIRY) return data;
    } catch { /* ignore parse errors */ }
    return null;
}

/** Save admin data to localStorage */
function setCachedData(data) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
    } catch { /* localStorage might be full, ignore */ }
}

export default function AdminPage() {
    const { user } = useAuth();
    const cached = getCachedData();

    // If we have cached data, show it instantly (no loading screen)
    const [adminData, setAdminData] = useState(cached || null);
    const [firstLoad, setFirstLoad] = useState(!cached); // only show spinner if no cache
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    // Normalize and store data
    const processData = useCallback((result) => {
        return {
            inquiries: result.inquiries || [],
            registrations: result.registrations || [],
            admissions: result.admissions || [],
            fees: result.fees || [],
            activeStudents: result.activeStudents || [],
            employees: result.employees || [],
            leaves: result.leaves || [],
            payroll: result.payroll || [],
            dropdowns: result.dropdowns || EMPTY_DATA.dropdowns,
            stats: result.stats || EMPTY_DATA.stats,
            _rawAttendance: result._rawAttendance || [],
        };
    }, []);

    // Load data from API
    const loadData = useCallback(async (showRefreshIndicator = false) => {
        if (showRefreshIndicator) setRefreshing(true);
        setError(null);
        setLoading(true);
        try {
            const result = await fetchAdminData(user?.branch || 'All');
            if (result && !result.error) {
                const normalized = processData(result);
                setAdminData(normalized);
                setCachedData(normalized);
            } else {
                setError(result?.error || 'Failed to load data');
                if (!adminData) setAdminData(EMPTY_DATA);
            }
        } catch (err) {
            console.error('[AdminPage] Load error:', err);
            setError('Connection error');
            if (!adminData) setAdminData(EMPTY_DATA);
        } finally {
            setFirstLoad(false);
            setRefreshing(false);
            setLoading(false);
        }
    }, [user, processData, adminData]);

    // Fetch fresh data on mount (in background if cached)
    useEffect(() => {
        loadData(false);
    }, []);

    // Show loading spinner ONLY on first visit with no cache
    if (firstLoad && !adminData) {
        return (
            <div className="flex items-center justify-center h-screen"
                style={{ background: 'linear-gradient(135deg, #f0f4ff, #e8eeff, #f5f0ff)' }}
            >
                <div className="text-center">
                    <div className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4"
                        style={{ borderColor: '#c7d2fe', borderTopColor: '#6366f1' }}
                    />
                    <p className="font-medium" style={{ color: '#6366f1' }}>Loading Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Error banner */}
            {error && (
                <div className="fixed top-0 left-0 right-0 z-50 bg-red-50 border-b border-red-200 p-3 text-center text-red-700 text-sm">
                    ⚠️ {error} — <button className="underline font-bold" onClick={() => loadData(true)}>Retry</button>
                </div>
            )}
            {/* Refresh indicator */}
            {refreshing && (
                <div className="fixed top-0 right-4 z-50 px-3 py-1 rounded-b-lg text-xs font-semibold"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white' }}
                >
                    🔄 Refreshing...
                </div>
            )}
            <AdminLayout adminData={adminData || EMPTY_DATA} onReload={() => loadData(true)} />
        </>
    );
}
