/**
 * EmployeePortal — Employee-facing dashboard.
 * Tabs: Attendance (check-in/out), Attendance View, Logs, Notices, Leave Requests.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getEmployeePortalData, markEmployeeAttendance, saveLeaveRequest, apiCall } from '../../services/api';
import { showToast } from '../../components/ui/Toast';
import { setLoading } from '../../components/ui/LoadingBar';
import PortalLayout from '../../components/layout/PortalLayout';
import AttendanceView from '../../components/AttendanceView';
import Badge from '../../components/ui/Badge';
import SalarySlip from '../../components/SalarySlip';
import CameraCapture from '../../components/CameraCapture';
import Modal from '../../components/ui/Modal';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import useDeviceMode from '../../components/mobile/useDeviceMode';
import MobileEmployeePortal from '../../components/mobile/MobileEmployeePortal';
import AcademicTrackerForm from '../../components/employee/AcademicTrackerForm';

const TABS = [
    { id: 'attendance', label: 'Attendance', emoji: '📍' },
    { id: 'academic', label: 'Academic Tracker', emoji: '📚' },
    { id: 'attview', label: 'Attendance View', emoji: '📊' },
    { id: 'logs', label: 'Logs', emoji: '📋' },
    { id: 'notices', label: 'Notices', emoji: '📢' },
    { id: 'leaves', label: 'Leaves', emoji: '✈️' },
    { id: 'payslips', label: 'Payslips', emoji: '💰' },
];

const EMP_TABS = ['attendance', 'academic', 'attview', 'logs', 'notices', 'leaves', 'payslips'];

export default function EmployeePortal(props) {
    const { isMobile } = useDeviceMode();
    if (isMobile) {
        return <MobileEmployeePortal {...props} />;
    }
    return <DesktopEmployeePortal {...props} />;
}

function DesktopEmployeePortal({ portalData, onReload }) {
    const { user, logout } = useAuth();

    const getInitialTab = () => {
        const hash = (window.location.hash || '').replace('#', '').trim().toLowerCase();
        return EMP_TABS.includes(hash) ? hash : 'attendance';
    };

    const [activeTab, setActiveTabState] = useState(getInitialTab);
    const queryClient = useQueryClient();

    const setActiveTab = (tab) => {
        setActiveTabState(tab);
        window.history.replaceState(null, '', `#${tab}`);
    };

    useEffect(() => {
        const handleHashChange = () => {
            const hash = (window.location.hash || '').replace('#', '').trim().toLowerCase();
            if (EMP_TABS.includes(hash)) {
                setActiveTabState(hash);
            }
        };
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    const { data: result, isLoading: loading } = useQuery({
        queryKey: ['employeeData', user?.userId],
        queryFn: () => getEmployeePortalData(user?.userId),
        enabled: !!user,
    });

    const { data: settings } = useQuery({
        queryKey: ['settings'],
        queryFn: () => apiCall('getSettings', {}),
        enabled: !!user,
        refetchOnMount: 'always',
    });

    const employeeCameraRequired = settings?.success && settings.employeeCameraCheckIn !== undefined
        ? (settings.employeeCameraCheckIn === true || settings.employeeCameraCheckIn === 'true')
        : (() => { try { return localStorage.getItem('erp_employee_camera_checkin') === 'true'; } catch { return false; } })();

    const data = result && !result.error ? result : null;

    // Leave form state
    const [leaveForm, setLeaveForm] = useState({
        type: 'Sick Leave', reason: '', from: '', to: '',
    });
    const [savingLeave, setSavingLeave] = useState(false);
    const [viewingSlip, setViewingSlip] = useState(null);

    const loadData = () => {
        queryClient.invalidateQueries(['employeeData']);
    };

    const profile = data?.profile || {};
    const stats = data?.stats || {};

    // Attendance status helpers
    const todayStatus = stats.todayStatus || 'None';
    const getAttButtons = () => {
        if (todayStatus === 'Check-In') {
            return {
                canCheckIn: false,
                canCheckOut: true,
                isCompleted: false,
                icon: 'fas fa-building text-green-500',
                iconClass: 'text-5xl mb-4 text-green-500',
                label: 'Working (Checked In)',
                lastText: `Checked in at: ${stats.lastCheckTime ? new Date(stats.lastCheckTime).toLocaleTimeString() : ''}`
            };
        }
        if (todayStatus === 'Check-Out') {
            return {
                canCheckIn: false,
                canCheckOut: false,
                isCompleted: true,
                icon: 'fas fa-check-circle text-blue-500',
                iconClass: 'text-5xl mb-4 text-blue-500',
                label: 'Shift Completed',
                lastText: 'Attendance completed for today. Double check-in is disabled.'
            };
        }
        return {
            canCheckIn: true,
            canCheckOut: false,
            isCompleted: false,
            icon: 'fas fa-clock text-gray-400',
            iconClass: 'text-5xl mb-4 text-gray-400',
            label: 'Not Checked In',
            lastText: 'Mark your check-in to start your day.'
        };
    };
    const attState = getAttButtons();
    const [marking, setMarking] = useState(false);

    // Camera state
    const [showCamera, setShowCamera] = useState(false);
    const [attTypePending, setAttTypePending] = useState(''); // 'Check-In' or 'Check-Out'

    // Open camera modal only if camera enforcement is ON; otherwise submit directly
    const initiateAttendance = (type) => {
        setAttTypePending(type);
        if (employeeCameraRequired) {
            setShowCamera(true);
        } else {
            submitEmployeeAttendance(type, '');
        }
    };

    const submitEmployeeAttendance = (type, photoBase64) => {
        setShowCamera(false);
        setMarking(true);
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const res = await apiCall('markEmployeeAtt', {
                    id: user.userId,
                    type,
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    photo: photoBase64
                });
                if (res?.error) alert(res.error);
                else { showToast(`${type} Successful`); loadData(); }
                setMarking(false);
            },
            () => {
                // Fallback if no location
                submitAttendanceFallback(type, photoBase64);
            }
        );
    };

    const handleAttendance = async (photoBase64) => {
        submitEmployeeAttendance(attTypePending, photoBase64);
    };

    const submitAttendanceFallback = async (type, photoBase64) => {
        const res = await apiCall('markEmployeeAtt', {
            id: user.userId,
            type,
            lat: null,
            lng: null,
            photo: photoBase64
        });
        if (res?.error) alert(res.error);
        else { showToast(`${type} Successful`); loadData(); }
        setMarking(false);
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
                        <div className="flex justify-center gap-4 mt-8">
                            <button
                                className={`btn px-8 py-3 text-lg transition-all ${attState.canCheckIn && !marking ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg cursor-pointer' : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'}`}
                                onClick={() => attState.canCheckIn && initiateAttendance('Check-In')}
                                disabled={!attState.canCheckIn || marking}
                            >
                                <i className="fas fa-sign-in-alt mr-2" />
                                {marking && attTypePending === 'Check-In'
                                    ? 'Wait...'
                                    : todayStatus === 'Check-In' || todayStatus === 'Check-Out'
                                        ? 'Checked In ✓'
                                        : employeeCameraRequired ? 'Check In (Camera)' : 'Check In'}
                            </button>
                            <button
                                className={`btn px-8 py-3 text-lg transition-all ${attState.canCheckOut && !marking ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg cursor-pointer' : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'}`}
                                onClick={() => attState.canCheckOut && initiateAttendance('Check-Out')}
                                disabled={!attState.canCheckOut || marking}
                            >
                                <i className="fas fa-sign-out-alt mr-2" />
                                {marking && attTypePending === 'Check-Out'
                                    ? 'Wait...'
                                    : todayStatus === 'Check-Out'
                                        ? 'Checked Out ✓'
                                        : employeeCameraRequired ? 'Check Out (Camera)' : 'Check Out'}
                            </button>
                        </div>
                        {attState.isCompleted && (
                            <p className="text-sm font-semibold text-green-600 mt-4">
                                ✅ Shift completed for today. Double check-in is disabled.
                            </p>
                        )}
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

            {/* Camera Modal */}
            {showCamera && (
                <Modal title={`Secure ${attTypePending}`} isOpen={showCamera} onClose={() => setShowCamera(false)}>
                    <div className="text-center mb-4 text-sm text-gray-500">
                        Please look at the camera to capture your attendance photo. A timestamp will be embedded.
                    </div>
                    <CameraCapture
                        onCapture={(b64) => handleAttendance(b64)}
                        onCancel={() => setShowCamera(false)}
                    />
                </Modal>
            )}

            {/* === Academic Tracker Tab === */}
            {activeTab === 'academic' && (
                <AcademicTrackerForm
                    user={user}
                    todayStatus={stats?.todayStatus || 'None'}
                    isMobile={false}
                    onGoToAttendance={() => setActiveTab('attendance')}
                    recentLogs={data?.academicLogs || []}
                    onReload={loadData}
                />
            )}

            {/* === Attendance View Tab === */}
            {activeTab === 'attview' && (
                <AttendanceView logs={data?.allLogs || data?.logs || []} type="employee" />
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            {/* === Payslips Tab === */}
            {activeTab === 'payslips' && (
                <div className="card">
                    <h3 className="font-bold mb-4">My Salary Slips</h3>
                    {data?.payroll && data.payroll.length > 0 ? (
                        <div className="grid gap-3">
                            {data.payroll.map((p, i) => (
                                <div key={i} className="bg-white p-4 rounded-xl shadow-sm border flex flex-wrap justify-between items-center gap-4">
                                    <div>
                                        <div className="font-bold text-lg text-gray-800">₹{p.amount}</div>
                                        <div className="text-sm text-gray-500">Date: {new Date(p.date).toLocaleDateString('en-IN')}</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge text="Paid" variant="green" />
                                        <button
                                            onClick={() => setViewingSlip({ id: p.id, date: p.date, empId: user?.userId, name: profile.name, days: p.days, amount: p.amount })}
                                            className="btn-outline text-sm py-1.5 border-blue-500 text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                                        >
                                            <i className="fas fa-file-invoice-dollar"></i> View Slip
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center p-6 text-gray-400">
                            <i className="fas fa-wallet text-4xl mb-3 opacity-50"></i>
                            <p>No salary slips generated yet.</p>
                        </div>
                    )}
                </div>
            )}

            {viewingSlip && (
                <SalarySlip
                    slip={viewingSlip}
                    employee={{ id: user?.userId, name: profile.name, role: profile.role || 'Staff' }}
                    onClose={() => setViewingSlip(null)}
                />
            )}
        </PortalLayout>
    );
}
