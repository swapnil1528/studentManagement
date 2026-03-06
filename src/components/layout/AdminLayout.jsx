/**
 * AdminLayout — Wraps admin pages with sidebar + main content area.
 * Uses URL-based routing via useLocation for page navigation.
 * Each admin sub-page has its own URL: /admin/attendance, /admin/notices, etc.
 */

import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import Dashboard from '../../pages/admin/Dashboard';
import Inquiries from '../../pages/admin/Inquiries';
import Registrations from '../../pages/admin/Registrations';
import Admissions from '../../pages/admin/Admissions';
import FeeCollection from '../../pages/admin/FeeCollection';
import Receipts from '../../pages/admin/Receipts';
import Attendance from '../../pages/admin/Attendance';
import Notices from '../../pages/admin/Notices';
import HRManagement from '../../pages/admin/HRManagement';
import ExamResults from '../../pages/admin/ExamResults';
import ClassroomAdmin from '../../pages/admin/ClassroomAdmin';

// Map URL paths to components
const PAGE_MAP = {
    'dashboard': Dashboard,
    'attendance': Attendance,
    'notices': Notices,
    'inquiries': Inquiries,
    'registrations': Registrations,
    'admissions': Admissions,
    'fees': FeeCollection,
    'receipts': Receipts,
    'hr': HRManagement,
    'exams': ExamResults,
    'classroom': ClassroomAdmin,
};

// Map old tab IDs to new URL slugs (for Sidebar compatibility)
export const TAB_TO_SLUG = {
    dash: 'dashboard',
    att: 'attendance',
    notices: 'notices',
    inq: 'inquiries',
    reg: 'registrations',
    adm: 'admissions',
    fee: 'fees',
    rec: 'receipts',
    hr: 'hr',
    exam: 'exams',
    classroom: 'classroom',
};

export const SLUG_TO_TAB = Object.fromEntries(
    Object.entries(TAB_TO_SLUG).map(([k, v]) => [v, k])
);

export default function AdminLayout({ adminData, onReload }) {
    const location = useLocation();
    const { user } = useAuth();

    // Extract page slug from URL: /admin/attendance → "attendance"
    const pathParts = location.pathname.split('/').filter(Boolean);
    const currentSlug = pathParts.length > 1 ? pathParts[1] : 'dashboard';

    // Get the active component based on URL
    const ActiveComponent = PAGE_MAP[currentSlug] || Dashboard;

    // Current "tab" ID for sidebar highlight
    const activeTab = SLUG_TO_TAB[currentSlug] || 'dash';

    // Safety check
    const safeData = adminData || {
        inquiries: [], registrations: [], admissions: [], fees: [], franchises: [],
        activeStudents: [], employees: [], leaves: [], payroll: [],
        dropdowns: { branches: [], courses: [], villages: [], employees: [], education: [] },
        stats: { todayPresent: 0, todayAbsent: 0 },
        _rawAttendance: [],
    };

    return (
        <div>
            <Sidebar activeTab={activeTab} />
            <main className="main-content">
                <ActiveComponent adminData={safeData} user={user} onReload={onReload} />
            </main>
        </div>
    );
}
