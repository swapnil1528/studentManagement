/**
 * EmployeePortal — Employee-facing dashboard.
 * Tabs: Attendance (check-in/out), Logs, Notices, Leave Requests.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getEmployeePortalData, markEmployeeAttendance, saveLeaveRequest } from '../../services/api';
import { showToast } from '../../components/ui/Toast';
import { setLoading } from '../../components/ui/LoadingBar';
import PortalLayout from '../../components/layout/PortalLayout';
import Badge from '../../components/ui/Badge';

const TABS = [
    { id: 'attendance', label: 'Attendance', emoji: '📍' },
    { id: 'logs', label: 'Logs', emoji: '📋' },
    { id: 'notices', label: 'Notices', emoji: '📢' },
    { id: 'leaves', label: 'Leaves', emoji: '✈️' },
];

export default function EmployeePortal() {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('attendance');
    const [data, setData] = useState(null);


    // Leave form state
    const [leaveForm, setLeaveForm] = useState({
        type: 'Sick Leave', reason: '', from: '', to: '',
    });
    const [savingLeave, setSavingLeave] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const result = await getEmployeePortalData(user?.userId);
        if (result && !result.error) setData(result);
        setLoading(false);
    };

    const profile = data?.profile || {};
    const stats = data?.stats || {};

    // Attendance status helpers
    const getAttButtons = () => {
        if (stats.todayStatus === 'Check-In') return { showIn: false, showOut: true, icon: 'fas fa-building text-green-500', iconClass: 'text-5xl mb-4 text-green-500', label: 'Working', lastText: `Checked in at: ${stats.lastCheckTime ? new Date(stats.lastCheckTime).toLocaleTimeString() : ''}` };
        if (stats.todayStatus === 'Check-Out') return { showIn: true, showOut: false, icon: 'fas fa-home text-gray-400', iconClass: 'text-5xl mb-4 text-gray-400', label: 'Checked Out', lastText: 'Shift ended' };
        return { showIn: true, showOut: false, icon: 'fas fa-clock text-gray-300', iconClass: 'text-5xl mb-4 text-gray-300', label: 'Not Marked', lastText: 'Mark your attendance' };
    };
    const attState = getAttButtons();

    // Handle attendance (simple — no face or location check)
    const handleAttendance = async (type) => {
        showToast(`Processing ${type}...`);
        const result = await markEmployeeAttendance(user?.userId, type, 0, 0, []);
        if (result?.success) {
            showToast(`${type} Successful!`);
            loadData();
        } else {
            alert(result?.error || 'Failed');
        }
    };

    // Submit leave request
    const handleLeaveRequest = async () => {
        if (!leaveForm.reason || !leaveForm.from || !leaveForm.to) {
            alert('Please fill all fields');
            return;
        }
        setSavingLeave(true);
        const result = await saveLeaveRequest({
            empId: user?.userId,
            name: profile.name || 'Employee',
            ...leaveForm,
        });
        if (result?.success) {
            showToast('Request Sent');
            setLeaveForm({ type: 'Sick Leave', reason: '', from: '', to: '' });
            loadData();
        }
        setSavingLeave(false);
    };

    // Face detection removed — no registration needed

    return (
        <PortalLayout
            name={profile.name}
            id={profile.id}
            role={profile.role || 'Staff'}
            tabs={TABS}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            hasFace={true}
            onFaceReg={() => { }}
            onLogout={logout}
        >
            {/* === Attendance Tab === */}
            {activeTab === 'attendance' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="card text-center">
                        <h3 className="font-bold text-lg mb-4">Mark Attendance</h3>
                        <div className={attState.iconClass}><i className={attState.icon} /></div>
                        <p className="text-sm text-gray-400 mb-6">{attState.lastText}</p>
                        <div className="grid grid-cols-2 gap-4">
                            {attState.showIn && (
                                <button
                                    className="bg-gradient-to-r from-emerald-500 to-green-600 text-white py-4 rounded-xl shadow-lg font-bold hover:scale-105 transition transform flex flex-col items-center justify-center"
                                    onClick={() => handleAttendance('Check-In')}
                                >
                                    <i className="fas fa-sign-in-alt text-2xl mb-1" /> Check In
                                </button>
                            )}
                            {attState.showOut && (
                                <button
                                    className="bg-gradient-to-r from-red-500 to-pink-600 text-white py-4 rounded-xl shadow-lg font-bold hover:scale-105 transition transform flex flex-col items-center justify-center"
                                    onClick={() => handleAttendance('Check-Out')}
                                >
                                    <i className="fas fa-sign-out-alt text-2xl mb-1" /> Check Out
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="card">
                        <h3 className="font-bold text-lg mb-4">Stats</h3>
                        <div className="bg-white p-4 rounded-xl shadow border-b-4 border-purple-500 mb-4">
                            <div className="text-gray-400 text-xs">Total Days</div>
                            <div className="text-2xl font-bold text-gray-800">{stats.totalDays || 0}</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow border-b-4 border-orange-500">
                            <div className="text-gray-400 text-xs">Current Status</div>
                            <div className="text-lg font-bold text-orange-600">{attState.label}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* === Logs Tab === */}
            {activeTab === 'logs' && (
                <div className="card">
                    <h3 className="font-bold mb-4">Recent Logs</h3>
                    {data?.logs && data.logs.length > 0 ? (
                        data.logs.map((l, i) => (
                            <div key={i} className={`bg-white p-4 rounded-xl shadow-sm border-l-4 ${l.status === 'Check-In' ? 'border-green-500' : 'border-red-500'} flex justify-between items-center mb-2`}>
                                <div>
                                    <div className="font-bold text-gray-800">{l.status}</div>
                                    <div className="text-xs text-gray-400">{new Date(l.time).toLocaleString()}</div>
                                </div>
                                <div className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-500">{l.distance}</div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-gray-400 text-sm py-4">No recent logs found</div>
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

            {/* === Leaves Tab === */}
            {activeTab === 'leaves' && (
                <div>
                    <div className="card mb-4">
                        <h3 className="font-bold mb-4">Request Leave</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <select className="inp" value={leaveForm.type} onChange={(e) => setLeaveForm((p) => ({ ...p, type: e.target.value }))}>
                                <option>Sick Leave</option>
                                <option>Casual Leave</option>
                            </select>
                            <input className="inp" placeholder="Reason" value={leaveForm.reason} onChange={(e) => setLeaveForm((p) => ({ ...p, reason: e.target.value }))} />
                            <input className="inp" type="date" value={leaveForm.from} onChange={(e) => setLeaveForm((p) => ({ ...p, from: e.target.value }))} />
                            <input className="inp" type="date" value={leaveForm.to} onChange={(e) => setLeaveForm((p) => ({ ...p, to: e.target.value }))} />
                        </div>
                        <button className="btn w-full mt-2" onClick={handleLeaveRequest} disabled={savingLeave}>
                            {savingLeave ? 'Submitting...' : 'Submit Request'}
                        </button>
                    </div>
                    <div className="card">
                        <h3 className="font-bold mb-2">My History</h3>
                        {data?.leaves && data.leaves.length > 0 ? (
                            data.leaves.map((l, i) => (
                                <div key={i} className="flex justify-between items-center border-b p-2">
                                    <div>
                                        <div className="font-bold text-sm">{l.type}</div>
                                        <div className="text-xs text-gray-500">{l.from}</div>
                                    </div>
                                    <Badge text={l.status} variant={l.status === 'Approved' ? 'green' : l.status === 'Rejected' ? 'red' : 'yellow'} />
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-400 text-sm">No leave history</p>
                        )}
                    </div>
                </div>
            )}
        </PortalLayout>
    );
}
