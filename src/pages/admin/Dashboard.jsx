/**
 * Dashboard — Admin overview page.
 * Shows KPI stat cards, recent activity, and system settings.
 */

import { useState, useEffect } from 'react';
import StatCard from '../../components/ui/StatCard';
import { apiCall } from '../../services/api';
import { showToast } from '../../components/ui/Toast';

export default function Dashboard({ adminData }) {
    const stats = adminData?.stats || {};
    const inquiries = adminData?.inquiries || [];

    // Mobile check-in toggle
    const [mobileCheckIn, setMobileCheckIn] = useState(false);
    // Student Camera toggle
    const [studentCamera, setStudentCamera] = useState(false);

    const [settingsLoading, setSettingsLoading] = useState(true);

    // Load settings on mount
    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setSettingsLoading(true);
        const result = await apiCall('getSettings', {});
        if (result?.success) {
            setMobileCheckIn(result.mobileCheckIn === true || result.mobileCheckIn === 'true');
            setStudentCamera(result.studentCameraCheckIn === true || result.studentCameraCheckIn === 'true');
        }
        setSettingsLoading(false);
    };

    const toggleMobileCheckIn = async () => {
        const newValue = !mobileCheckIn;
        setMobileCheckIn(newValue);
        const result = await apiCall('saveSetting', { key: 'mobileCheckIn', value: newValue ? 'true' : 'false' });
        if (result?.success) {
            showToast(`Mobile check-in ${newValue ? 'enabled' : 'disabled'}`);
        } else {
            setMobileCheckIn(!newValue); // revert
            showToast('Failed to save setting');
        }
    };

    const toggleStudentCamera = async () => {
        const newValue = !studentCamera;
        setStudentCamera(newValue);
        const result = await apiCall('saveSetting', { key: 'studentCameraCheckIn', value: newValue ? 'true' : 'false' });
        if (result?.success) {
            showToast(`Student Camera Check-in ${newValue ? 'Enforced' : 'Disabled'}`);
        } else {
            setStudentCamera(!newValue); // revert
            showToast('Failed to save setting');
        }
    };

    // Recent activity: last 5 inquiries
    const recentInquiries = inquiries.slice(-5).reverse();

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6">Overview</h1>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <StatCard
                    value={stats.todayPresent || 0}
                    label="Present Today"
                    icon="fas fa-user-check"
                    iconColor="text-green-200"
                    borderColor="border-l-4 border-green-500"
                />
                <StatCard
                    value={stats.todayAbsent || 0}
                    label="Absent Today"
                    icon="fas fa-user-times"
                    iconColor="text-red-200"
                    borderColor="border-l-4 border-red-500"
                />
                <StatCard
                    value={inquiries.length}
                    label="Inquiries"
                    icon="fas fa-users"
                    iconColor="text-blue-500"
                />
                <StatCard
                    value={inquiries.filter((x) => x[7] === 'New').length}
                    label="Pending"
                    icon="fas fa-clock"
                    iconColor="text-orange-500"
                />
            </div>

            {/* Settings Card — Mobile Check-in Control */}
            <div className="card mb-6">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                    <i className="fas fa-cog text-gray-400" /> System Settings
                </h3>
                <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.1)' }}>
                    <div>
                        <div className="font-bold text-sm flex items-center gap-2">
                            <i className="fas fa-mobile-alt text-indigo-500"></i>
                            Mobile Check-In / Check-Out
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            {mobileCheckIn
                                ? '✅ Students & Employees can check-in from mobile devices'
                                : '🖥️ Check-in only allowed from desktop/laptop devices'
                            }
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold" style={{ color: mobileCheckIn ? '#059669' : '#9ca3af' }}>
                            {settingsLoading ? '...' : mobileCheckIn ? 'ON' : 'OFF'}
                        </span>
                        <button
                            className={`toggle-switch ${mobileCheckIn ? 'active' : ''}`}
                            onClick={toggleMobileCheckIn}
                            disabled={settingsLoading}
                            title={mobileCheckIn ? 'Disable mobile check-in' : 'Enable mobile check-in'}
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl mt-3" style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.1)' }}>
                    <div>
                        <div className="font-bold text-sm flex items-center gap-2">
                            <i className="fas fa-camera text-indigo-500"></i>
                            Student Camera Enforcement
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            {studentCamera
                                ? '✅ Students MUST capture a live timestamped photo to check-in'
                                : '🖥️ Students can check-in simply by clicking the button'
                            }
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold" style={{ color: studentCamera ? '#059669' : '#9ca3af' }}>
                            {settingsLoading ? '...' : studentCamera ? 'ON' : 'OFF'}
                        </span>
                        <button
                            className={`toggle-switch ${studentCamera ? 'active' : ''}`}
                            onClick={toggleStudentCamera}
                            disabled={settingsLoading}
                            title={studentCamera ? 'Disable student camera' : 'Enable student camera'}
                        />
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="card">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                    <i className="fas fa-history text-gray-400" /> Recent Activity
                </h3>
                <div className="space-y-2">
                    {recentInquiries.length > 0 ? (
                        recentInquiries.map((r, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                    <span className="font-bold text-gray-700">{r[3]}</span>
                                    <span className="text-xs text-gray-400 ml-2">— {r[6]}</span>
                                </div>
                                <span className={`badge ${r[7] === 'Confirmed' ? 'b-green' : 'b-yellow'}`}>
                                    {r[7]}
                                </span>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-gray-400">No recent activity</p>
                    )}
                </div>
            </div>
        </div>
    );
}
