/**
 * StudentPortal — Student-facing dashboard.
 * Tabs: Attendance (check-in/out), Logs, Notices, LMS, Results.
 * Uses face recognition + geolocation for attendance marking.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getStudentPortalData, markStudentAttendance, registerFaceData } from '../../services/api';
import { showToast } from '../../components/ui/Toast';
import { setLoading } from '../../components/ui/LoadingBar';
import PortalLayout from '../../components/layout/PortalLayout';
import { useGeolocation } from '../../hooks/useGeolocation';

const TABS = [
    { id: 'attendance', label: 'Attendance', emoji: '📍' },
    { id: 'logs', label: 'Logs', emoji: '📋' },
    { id: 'notices', label: 'Notices', emoji: '📢' },
    { id: 'lms', label: 'LMS', emoji: '📚' },
    { id: 'results', label: 'Results', emoji: '🏆' },
];

export default function StudentPortal() {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('attendance');
    const [data, setData] = useState(null);
    const geo = useGeolocation();

    // Load student data on mount
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const result = await getStudentPortalData(user?.studentId || user?.userId);
        if (result && !result.error) setData(result);
        setLoading(false);
    };

    const profile = data?.profile || {};
    const att = data?.attendance || {};

    // Determine attendance button state
    const getAttStatus = () => {
        if (att.todayStatus === 'Check-In') return { class: 'status-checkin', label: '✓ Checked In', showOut: true };
        if (att.todayStatus === 'Check-Out') return { class: 'status-checkout', label: '✗ Checked Out', showOut: false };
        return { class: 'status-none', label: '⏳ Not Marked', showOut: false };
    };
    const attStatus = getAttStatus();

    // Handle attendance marking (simplified — face recognition requires HTTPS)
    const handleAttendance = async (type) => {
        if (!profile.hasFace) {
            alert('You must register your face ID first.');
            return;
        }
        if (!geo.lat || !geo.lng) {
            alert('GPS location not available.');
            return;
        }
        showToast(`Processing ${type}...`);
        // NOTE: Face descriptor would come from face-api.js camera scan
        // For now, we pass an empty array — full face flow requires HTTPS
        const result = await markStudentAttendance(user?.studentId || user?.userId, type, geo.lat, geo.lng, []);
        if (result?.success) {
            showToast(`${type} Successful!`);
            loadData();
        } else {
            alert(result?.error || 'Failed');
        }
    };

    // Face registration placeholder
    const handleFaceReg = () => {
        alert('Face registration requires HTTPS and camera access. This feature works on deployed environments.');
    };

    return (
        <PortalLayout
            name={profile.name}
            id={profile.id}
            role={profile.batch || 'Student'}
            photo={profile.photo}
            tabs={TABS}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            hasFace={profile.hasFace}
            onFaceReg={handleFaceReg}
            onLogout={logout}
        >
            {/* === Attendance Tab === */}
            {activeTab === 'attendance' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Mark Attendance Card */}
                    <div className="card text-center">
                        <h3 className="font-bold text-lg mb-4">Mark Attendance</h3>
                        <div className="location-info">
                            {geo.loading ? '📡 Getting location...' :
                                geo.error ? `❌ ${geo.error}` :
                                    geo.inRange ? `✅ In range (${geo.distance}m)` : `❌ Too far (${geo.distance}m)`
                            }
                        </div>
                        <div className="mb-4">
                            <div className={`status-indicator ${attStatus.class}`}>
                                <span>{attStatus.label}</span>
                            </div>
                        </div>
                        {att.lastCheckInTime && (
                            <p className="text-xs text-gray-500 mb-4">
                                Last: {new Date(att.lastCheckInTime).toLocaleTimeString()}
                            </p>
                        )}
                        <div className="flex gap-2 justify-center">
                            {!attStatus.showOut && (
                                <button className="btn btn-success w-full" onClick={() => handleAttendance('Check-In')}>
                                    Check-In
                                </button>
                            )}
                            {attStatus.showOut && (
                                <button className="btn btn-danger w-full" onClick={() => handleAttendance('Check-Out')}>
                                    Check-Out
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Overview Card */}
                    <div className="card">
                        <h3 className="font-bold text-lg mb-4">Overview</h3>
                        <div className="flex justify-between mb-2">
                            <span className="text-gray-500">Attendance Rate</span>
                            <span className="font-bold text-blue-600">{att.perc || 0}%</span>
                        </div>
                        <div className="progress-bar mb-4">
                            <div className="progress-fill" style={{ width: `${att.perc || 0}%` }} />
                        </div>
                        <div className="flex justify-between border-t pt-2">
                            <span className="text-gray-500">Present Days</span>
                            <span className="font-bold">{att.pres || 0}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Total Days</span>
                            <span className="font-bold">{att.total || 0}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* === Logs Tab === */}
            {activeTab === 'logs' && (
                <div className="card">
                    <h3 className="font-bold mb-4">Recent Logs</h3>
                    {att.logs && att.logs.length > 0 ? (
                        att.logs.map((l, i) => (
                            <div key={i} className="log-item">
                                <div className="text-xs text-gray-500">{new Date(l.time).toLocaleString()}</div>
                                <div className="font-bold text-gray-800">{l.status}</div>
                                <div className="text-xs">📍 {l.distance}</div>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-400 text-sm">No logs yet</p>
                    )}
                </div>
            )}

            {/* === Notices Tab === */}
            {activeTab === 'notices' && (
                <div className="card">
                    <h3 className="font-bold mb-4">Latest Notices</h3>
                    {data?.notices && data.notices.length > 0 ? (
                        data.notices.map((n, i) => (
                            <div key={i} className="p-3 mb-2 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                                <div className="font-bold text-gray-800 text-sm flex justify-between">
                                    <span>{n.title}</span>
                                    <span className="text-xs text-gray-500">{n.date}</span>
                                </div>
                                <p className="text-xs text-gray-600 mt-1">{n.msg}</p>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-400 text-sm">No new notices.</p>
                    )}
                </div>
            )}

            {/* === LMS Tab === */}
            {activeTab === 'lms' && (
                <div className="card">
                    <h3 className="font-bold mb-4">Learning Resources</h3>
                    {data?.lms && data.lms.length > 0 ? (
                        data.lms.map((l, i) => (
                            <div key={i} className="p-4 bg-white rounded border border-gray-100 shadow-sm mb-2">
                                <div className="font-bold text-blue-600">
                                    <a href={l.link} target="_blank" rel="noopener noreferrer">{l.title}</a>
                                </div>
                                <div className="text-xs text-gray-500">{l.type} {l.desc ? `— ${l.desc}` : ''}</div>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-400">No Content</p>
                    )}
                </div>
            )}

            {/* === Results Tab === */}
            {activeTab === 'results' && (
                <div className="card">
                    <h3 className="font-bold mb-4">Exam Results</h3>
                    {data?.results && data.results.length > 0 ? (
                        data.results.map((r, i) => (
                            <div key={i} className="flex justify-between p-3 bg-white border-b mb-2">
                                <span>{r.exam}</span>
                                <span className={`font-bold ${r.grade === 'Fail' ? 'text-red-500' : 'text-green-500'}`}>
                                    {r.marks}/{r.total}
                                </span>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-400">No Results</p>
                    )}
                </div>
            )}
        </PortalLayout>
    );
}
