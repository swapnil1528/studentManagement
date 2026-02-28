/**
 * PortalLayout — Premium wrapper for Student & Employee portals.
 * Glassmorphism header with gradient accent, tab nav, dark mode toggle.
 */

import { useTheme } from '../../context/ThemeContext';

export default function PortalLayout({
    name, id, role, photo, tabs, activeTab, onTabChange,
    hasFace, onFaceReg, onLogout, children
}) {
    const { isDark, toggleTheme } = useTheme();

    return (
        <div className="min-h-screen"
            style={{
                background: isDark
                    ? 'linear-gradient(135deg, #0f172a, #1e1b4b, #0f172a)'
                    : 'linear-gradient(135deg, #f0f4ff, #e8eeff, #f5f0ff)',
            }}
        >
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
                        <h1 className="text-2xl font-bold" style={{ color: isDark ? '#e0e7ff' : '#1e293b' }}>
                            {name || 'Loading...'}
                        </h1>
                        <p style={{ color: isDark ? '#94a3b8' : '#64748b' }}>{id || '---'}</p>
                        <div className="flex gap-2 items-center mt-2">
                            <span className="badge b-blue">{role || '---'}</span>
                        </div>
                    </div>
                    <div className="flex gap-2 items-center">
                        <button
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all"
                            style={{
                                background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(99,102,241,0.08)',
                                color: isDark ? '#fbbf24' : '#6366f1',
                            }}
                            onClick={toggleTheme}
                            title={isDark ? 'Light Mode' : 'Dark Mode'}
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
