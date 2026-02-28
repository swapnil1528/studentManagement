/**
 * AdminPage — Wrapper that loads admin data and renders AdminLayout.
 * This is the top-level page component for the admin route.
 * It fetches all data on mount and passes it down to child components.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchAdminData } from '../services/api';
import { setLoading } from '../components/ui/LoadingBar';
import AdminLayout from '../components/layout/AdminLayout';

export default function AdminPage() {
    const { user } = useAuth();
    const [adminData, setAdminData] = useState(null);
    const [dataLoading, setDataLoading] = useState(true);
    const [error, setError] = useState(null);

    // Load all admin data on mount
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setDataLoading(true);
        setError(null);
        setLoading(true);
        try {
            const result = await fetchAdminData(user?.branch || 'All');
            if (result && !result.error) {
                // Normalize the data with safe defaults
                setAdminData({
                    inquiries: result.inquiries || [],
                    registrations: result.registrations || [],
                    admissions: result.admissions || [],
                    fees: result.fees || [],
                    activeStudents: result.activeStudents || [],
                    employees: result.employees || [],
                    leaves: result.leaves || [],
                    payroll: result.payroll || [],
                    dropdowns: result.dropdowns || { branches: [], courses: [], villages: [], employees: [], education: [] },
                    stats: result.stats || { todayPresent: 0, todayAbsent: 0 },
                });
            } else {
                setError(result?.error || 'Failed to load data');
                // Set empty defaults so UI still renders
                setAdminData({
                    inquiries: [], registrations: [], admissions: [], fees: [],
                    activeStudents: [], employees: [], leaves: [], payroll: [],
                    dropdowns: { branches: [], courses: [], villages: [], employees: [], education: [] },
                    stats: { todayPresent: 0, todayAbsent: 0 },
                });
            }
        } catch (err) {
            console.error('[AdminPage] Load error:', err);
            setError('Connection error');
            setAdminData({
                inquiries: [], registrations: [], admissions: [], fees: [],
                activeStudents: [], employees: [], leaves: [], payroll: [],
                dropdowns: { branches: [], courses: [], villages: [], employees: [], education: [] },
                stats: { todayPresent: 0, todayAbsent: 0 },
            });
        } finally {
            setDataLoading(false);
            setLoading(false);
        }
    };

    // Show loading spinner while data is being fetched
    if (dataLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500 font-medium">Loading Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            {error && (
                <div className="fixed top-0 left-0 right-0 z-50 bg-red-50 border-b border-red-200 p-3 text-center text-red-700 text-sm">
                    ⚠️ {error} — <button className="underline font-bold" onClick={loadData}>Retry</button>
                </div>
            )}
            <AdminLayout adminData={adminData} onReload={loadData} />
        </>
    );
}
