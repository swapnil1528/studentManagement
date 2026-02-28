/**
 * Sidebar — Admin panel left navigation.
 * Renders nav items, dark mode toggle, user info, and logout button.
 */

import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

// Navigation items configuration
const NAV_ITEMS = [
    { id: 'dash', icon: 'fas fa-home', label: 'Dashboard' },
    { id: 'att', icon: 'fas fa-calendar-check', label: 'Attendance' },
    { id: 'notices', icon: 'fas fa-bullhorn', label: 'Notices' },
    { id: 'inq', icon: 'fas fa-user-plus', label: 'Inquiries' },
    { id: 'reg', icon: 'fas fa-id-card', label: 'Registrations' },
    { id: 'adm', icon: 'fas fa-user-graduate', label: 'Admissions' },
    { id: 'fee', icon: 'fas fa-wallet', label: 'Fee Collection' },
    { id: 'rec', icon: 'fas fa-receipt', label: 'Receipts' },
    { id: 'hr', icon: 'fas fa-users-cog', label: 'HR & Payroll', color: 'text-orange-600' },
    { id: 'divider' },
    { id: 'lms', icon: 'fas fa-cloud-upload-alt', label: 'LMS Upload', color: 'text-purple-700' },
    { id: 'exam', icon: 'fas fa-poll-h', label: 'Exam Results', color: 'text-purple-700' },
];

export default function Sidebar({ activeTab, onTabChange }) {
    const { user, logout } = useAuth();
    const { isDark, toggleTheme } = useTheme();

    return (
        <aside className="sidebar">
            {/* Brand */}
            <div className="p-6 border-b border-current/10 text-xl font-bold text-blue-600 flex items-center gap-2">
                <i className="fas fa-layer-group" /> EduManager
            </div>

            {/* User Info */}
            <div className="p-4 border-b border-current/10" style={{ background: isDark ? '#1e293b' : '#f9fafb' }}>
                <p className="text-xs font-bold opacity-50">LOGGED IN AS</p>
                <p className="font-bold text-sm">{user?.username || 'User'}</p>
                <p className="text-xs text-blue-600">{user?.branch || 'Branch'}</p>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-2">
                {NAV_ITEMS.map((item) => {
                    if (item.id === 'divider') {
                        return <div key="divider" className="border-t border-current/10 my-2" />;
                    }
                    return (
                        <div
                            key={item.id}
                            className={`nav-item ${item.color || ''} ${activeTab === item.id ? 'active' : ''}`}
                            onClick={() => onTabChange(item.id)}
                        >
                            <i className={item.icon} /> {item.label}
                        </div>
                    );
                })}
            </div>

            {/* Dark Mode Toggle + Logout */}
            <div className="p-4 border-t border-current/10">
                <button
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg font-semibold text-sm transition-all mb-2"
                    style={{
                        background: isDark ? '#334155' : '#f1f5f9',
                        color: isDark ? '#fbbf24' : '#64748b',
                    }}
                    onClick={toggleTheme}
                >
                    {isDark ? (
                        <><i className="fas fa-sun" /> Light Mode</>
                    ) : (
                        <><i className="fas fa-moon" /> Dark Mode</>
                    )}
                </button>
                <button
                    className="w-full text-red-500 font-bold text-sm hover:bg-red-50 py-2 rounded"
                    onClick={logout}
                >
                    Logout
                </button>
            </div>
        </aside>
    );
}
