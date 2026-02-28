/**
 * PortalLayout — Wrapper for Student & Employee portal pages.
 * Provides a consistent header, tab navigation, and content area.
 *
 * Props:
 *   name     - User's display name
 *   id       - User ID
 *   role     - Role badge text (e.g. batch or role name)
 *   photo    - Optional photo URL (for students)
 *   tabs     - Array of { id, label, emoji }
 *   activeTab - Currently active tab id
 *   onTabChange - (tabId) => void
 *   hasFace  - Whether face is registered
 *   onFaceReg - Callback to open face registration
 *   onLogout - Logout callback
 *   children - Tab content
 */

export default function PortalLayout({
    name, id, role, photo, tabs, activeTab, onTabChange,
    hasFace, onFaceReg, onLogout, children
}) {
    return (
        <div className="bg-gray-50 min-h-screen">
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
                        <h1 className="text-2xl font-bold text-gray-800">{name || 'Loading...'}</h1>
                        <p className="text-gray-500">{id || '---'}</p>
                        <div className="flex gap-2 items-center mt-2">
                            <span className="badge b-blue">{role || '---'}</span>

                            {/* Face ID status */}
                            {hasFace ? (
                                <span className="px-2 py-1 text-xs bg-green-100 text-green-600 rounded font-bold border border-green-200">
                                    ✅ Face ID Active
                                </span>
                            ) : (
                                <button
                                    className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded font-bold border border-red-200 hover:bg-red-200"
                                    onClick={onFaceReg}
                                >
                                    ⚠️ Register Face ID
                                </button>
                            )}
                        </div>
                    </div>
                    <button className="btn btn-danger" onClick={onLogout} style={{ width: 'auto' }}>
                        Logout
                    </button>
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
