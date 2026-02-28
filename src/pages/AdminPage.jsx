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

    // Load all admin data on mount
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const result = await fetchAdminData(user?.branch || 'All');
        if (result && !result.error) {
            setAdminData(result);
        }
        setLoading(false);
    };

    return <AdminLayout adminData={adminData} onReload={loadData} />;
}
