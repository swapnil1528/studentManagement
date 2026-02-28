/**
 * PortalLayout — Wrapper for Student & Employee portal pages.
 * Provides a consistent header, tab navigation, dark mode toggle, and content area.
 */

import { useTheme } from '../../context/ThemeContext';

export default function PortalLayout({
    name, id, role, photo, tabs, activeTab, onTabChange,
    hasFace, onFaceReg, onLogout, children
}) {
    const { isDark, toggleTheme } = useTheme();

    return (
        <div className="min-h-screen" style={{ background: isDark ? '#0f172a' : '#f8fafc' }}>
            <div className="sp-container">
                {/* Header */}
                <div className="sp-header">
                    {photo && (
                        <img
                            src={photo && photo.length > 10 ? photo : 'https://via.placeholder.com/80'}
                            alt="Profile"
                        />
                    )}
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold">{name || 'Loading...'}</h1>
                        <p className="opacity-60">{id || '---'}</p>
                        <div className="flex gap-2 items-center mt-2">
                            <span className="badge b-blue">{role || '---'}</span>
                            {hasFace && (
                                <span className="px-2 py-1 text-xs bg-green-100 text-green-600 rounded font-bold border border-green-200">
                                    ✅ Face ID Active
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2 items-center">
                        {/* Dark Mode Toggle */}
                        <button
                            className="w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all"
                            style={{
                                background: isDark ? '#334155' : '#f1f5f9',
                                color: isDark ? '#fbbf24' : '#64748b',
                            }}
                            onClick={toggleTheme}
                            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        >
                            <i className={isDark ? 'fas fa-sun' : 'fas fa-moon'} />
                        </button>
                        <button className="btn btn-danger" onClick={onLogout} style={{ width: 'auto' }}>
                            Logout
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="sp-tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            className={`sp-tab ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => onTabChange(tab.id)}
                        >
                            {tab.emoji} {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {children}
            </div>
        </div>
    );
}
