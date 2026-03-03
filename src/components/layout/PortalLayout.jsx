/**
 * PortalLayout — Gen Z redesign.
 * Compact top header + bottom navigation bar (fixed).
 * Mobile-first, lightweight, vibrant.
 */

import { useTheme } from '../../context/ThemeContext';

export default function PortalLayout({
    name, id, role, photo, tabs, activeTab, onTabChange,
    hasFace, onFaceReg, onLogout, children
}) {
    const { isDark, toggleTheme } = useTheme();

    return (
        <div
            style={{
                minHeight: '100vh',
                background: isDark
                    ? 'linear-gradient(135deg, #0e0c1a 0%, #1a1630 50%, #0e0c1a 100%)'
                    : 'linear-gradient(135deg, #f8f7ff 0%, #f0ecff 50%, #f5f9ff 100%)',
                fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
            }}
        >
            <div className="sp-container">
                {/* ─── Compact Header ─── */}
                <div
                    className="sp-header"
                    style={isDark ? {
                        background: 'rgba(26, 22, 48, 0.95)',
                        borderColor: 'rgba(139, 92, 246, 0.2)',
                        boxShadow: '0 2px 16px rgba(0,0,0,0.3)',
                    } : {}}
                >
                    {/* Avatar */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                        <img
                            src={photo && photo.length > 10 ? photo : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || 'student')}&backgroundColor=b6e3f4,c0aede,d1d4f9`}
                            alt="Profile"
                            style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover' }}
                            onError={e => { e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'S')}&backgroundColor=7c3aed&fontFamily=Georgia&fontSize=40`; }}
                        />
                        <span style={{
                            position: 'absolute', bottom: 0, right: 0,
                            width: 13, height: 13, background: '#10b981',
                            borderRadius: '50%', border: '2px solid white',
                        }} />
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <h1 style={{
                                fontSize: 17, fontWeight: 800, margin: 0,
                                color: isDark ? '#ede9fe' : '#1a1035',
                                letterSpacing: '-0.3px', whiteSpace: 'nowrap',
                            }}>
                                {name || 'Student'}
                            </h1>
                            <span style={{
                                fontSize: 10, fontWeight: 700, padding: '3px 8px',
                                borderRadius: 20,
                                background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(6,182,212,0.12))',
                                color: '#7c3aed',
                            }}>
                                {role || 'Student'}
                            </span>
                        </div>
                        <p style={{
                            margin: '2px 0 0', fontSize: 12,
                            color: isDark ? '#94a3b8' : '#6b7280', fontWeight: 500,
                        }}>
                            #{id || '---'}
                        </p>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                        <button
                            onClick={toggleTheme}
                            title={isDark ? 'Light Mode' : 'Dark Mode'}
                            style={{
                                width: 36, height: 36, borderRadius: 10, border: 'none',
                                background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(124,58,237,0.08)',
                                color: isDark ? '#fbbf24' : '#7c3aed',
                                fontSize: 15, cursor: 'pointer', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <i className={isDark ? 'fas fa-sun' : 'fas fa-moon'} />
                        </button>
                        <button
                            onClick={onLogout}
                            style={{
                                padding: '8px 14px', borderRadius: 10, border: 'none',
                                background: 'linear-gradient(135deg, #f43f5e, #fb7185)',
                                color: 'white', fontSize: 12, fontWeight: 700,
                                cursor: 'pointer', letterSpacing: '0.2px',
                                boxShadow: '0 4px 12px rgba(244,63,94,0.25)',
                                fontFamily: 'inherit',
                            }}
                        >
                            Sign Out
                        </button>
                    </div>
                </div>

                {/* ─── Tab Content ─── */}
                {children}
            </div>

            {/* ─── Bottom Navigation Bar ─── */}
            <nav
                className="sp-bottom-nav"
                style={isDark ? {
                    background: 'rgba(14, 12, 26, 0.95)',
                    borderTopColor: 'rgba(139, 92, 246, 0.2)',
                } : {}}
            >
                <div className="sp-nav-inner">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            className={`sp-nav-item ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => onTabChange(tab.id)}
                            style={isDark && activeTab === tab.id ? {
                                background: 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(6,182,212,0.15))',
                            } : {}}
                        >
                            <span className="nav-icon">{tab.emoji}</span>
                            <span
                                className="nav-label"
                                style={isDark && activeTab !== tab.id ? { color: '#4b5563' } : {}}
                            >
                                {tab.label}
                            </span>
                        </button>
                    ))}
                </div>
            </nav>
        </div>
    );
}
