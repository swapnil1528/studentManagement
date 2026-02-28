/**
 * AdminLayout — Wraps admin pages with sidebar + main content area.
 * Manages the active tab state and renders the corresponding admin page.
 */

import { useState } from 'react';
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
import LMSUpload from '../../pages/admin/LMSUpload';
import ExamResults from '../../pages/admin/ExamResults';

// Map tab IDs to components
const TAB_COMPONENTS = {
    dash: Dashboard,
    att: Attendance,
    notices: Notices,
    inq: Inquiries,
    reg: Registrations,
    adm: Admissions,
    fee: FeeCollection,
    rec: Receipts,
    hr: HRManagement,
    lms: LMSUpload,
    exam: ExamResults,
};

export default function AdminLayout({ adminData, onReload }) {
    const [activeTab, setActiveTab] = useState('dash');

    // Get the active component, fallback to Dashboard
    const ActiveComponent = TAB_COMPONENTS[activeTab] || Dashboard;

    // Safety check — render empty state if adminData is somehow null
    const safeData = adminData || {
        inquiries: [], registrations: [], admissions: [], fees: [],
        activeStudents: [], employees: [], leaves: [], payroll: [],
        dropdowns: { branches: [], courses: [], villages: [], employees: [], education: [] },
        stats: { todayPresent: 0, todayAbsent: 0 },
    };

    return (
        <div>
            <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
            <main className="main-content">
                <ActiveComponent adminData={safeData} onReload={onReload} />
            </main>
        </div>
    );
}
