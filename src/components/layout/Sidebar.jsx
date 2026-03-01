/**
 * Sidebar — Admin panel left navigation with gradient dark theme.
 * Uses URL-based navigation (react-router) — each page has its own URL.
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { TAB_TO_SLUG } from './AdminLayout';

const NAV_ITEMS = [
    { id: 'dash', icon: 'fas fa-home', label: 'Dashboard' },
    { id: 'att', icon: 'fas fa-calendar-check', label: 'Attendance' },
    { id: 'notices', icon: 'fas fa-bullhorn', label: 'Notices' },
    { id: 'inq', icon: 'fas fa-user-plus', label: 'Inquiries' },
    { id: 'reg', icon: 'fas fa-id-card', label: 'Registrations' },
    { id: 'adm', icon: 'fas fa-user-graduate', label: 'Admissions' },
    { id: 'fee', icon: 'fas fa-wallet', label: 'Fee Collection' },
    { id: 'rec', icon: 'fas fa-receipt', label: 'Receipts' },
    { id: 'hr', icon: 'fas fa-users-cog', label: 'HR & Payroll' },
    { id: 'divider' },
    { id: 'lms', icon: 'fas fa-cloud-upload-alt', label: 'LMS Upload' },
    { id: 'exam', icon: 'fas fa-poll-h', label: 'Exam Results' },
];

export default function Sidebar({ activeTab }) {
    const { user, logout } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const handleNavClick = (tabId) => {
        const slug = TAB_TO_SLUG[tabId] || 'dashboard';
        navigate(`/admin/${slug}`);
    };

    return (
        <aside className="sidebar">
            {/* Brand */}
            <div className="p-6" style={{ borderBottom: '1px solid rgba(199,210,254,0.1)' }}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg"
                        style={{ background: 'linear-gradient(135deg, #818cf8, #a78bfa)' }}>
                        <i className="fas fa-graduation-cap" />
                    </div>
                    <div>
                        <div className="font-bold text-white text-lg">EduManager</div>
                        <div className="text-xs" style={{ color: 'rgba(199,210,254,0.5)' }}>Institute Portal</div>
                    </div>
                </div>
            </div>

            {/* User Info */}
            <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(199,210,254,0.08)', background: 'rgba(0,0,0,0.1)' }}>
                <p className="text-[10px] font-bold tracking-wider" style={{ color: 'rgba(199,210,254,0.35)' }}>LOGGED IN AS</p>
                <p className="font-bold text-sm text-white mt-1">{user?.username || 'User'}</p>
                <p className="text-xs" style={{ color: '#818cf8' }}>{user?.branch || 'Branch'}</p>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-3 px-2">
                {NAV_ITEMS.map((item) => {
                    if (item.id === 'divider') {
                        return <div key="divider" className="my-3 mx-3" style={{ borderTop: '1px solid rgba(199,210,254,0.08)' }} />;
                    }
                    return (
                        <div
                            key={item.id}
                            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                            onClick={() => handleNavClick(item.id)}
                        >
                            <i className={`${item.icon} w-5 text-center`} /> {item.label}
                        </div>
                    );
                })}
            </div>

            {/* Dark Mode Toggle + Logout */}
            <div className="p-4" style={{ borderTop: '1px solid rgba(199,210,254,0.08)' }}>
                <button
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition-all mb-2"
                    style={{
                        background: 'rgba(255,255,255,0.08)',
                        color: isDark ? '#fbbf24' : '#c7d2fe',
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
                    className="w-full py-2.5 rounded-lg font-bold text-sm transition-all"
                    style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5' }}
                    onClick={logout}
                >
                    <i className="fas fa-sign-out-alt mr-1" /> Logout
                </button>
            </div>
        </aside>
    );
}
