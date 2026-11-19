import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getEmployeePortalData, saveLeaveRequest, apiCall } from '../../services/api';
import { showToast } from '../ui/Toast';
import AttendanceView from '../AttendanceView';
import SalarySlip from '../SalarySlip';
import CameraCapture from '../CameraCapture';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function MobileEmployeePortal() {
    const { user, logout } = useAuth();
    const queryClient = useQueryClient();

    const [currentScreen, setCurrentScreen] = useState('dashboard');
    const [marking, setMarking] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [attTypePending, setAttTypePending] = useState('');

    // Leave form state
    const [leaveForm, setLeaveForm] = useState({
        type: 'Sick Leave',
        reason: '',
        from: '',
        to: '',
    });
    const [savingLeave, setSavingLeave] = useState(false);

    // Salary slip modal state
    const [viewingSlip, setViewingSlip] = useState(null);

    const { data: result, isFetching } = useQuery({
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
    const profile = data?.profile || {};
    const stats = data?.stats || {};
    const logs = data?.logs || [];
    const allLogs = data?.allLogs || logs;
    const notices = data?.notices || [];
    const leaves = data?.leaves || [];
    const payroll = data?.payroll || [];

    const employeeName = profile.name || user?.name || user?.username || 'Employee';
    const employeeId = profile.id || user?.userId || '---';
    const employeeRole = profile.role || 'Staff';
    const activeBranch = user?.branch && user.branch !== 'All' ? user.branch : '';

    const todayStatus = stats.todayStatus || 'None';
    const statusInfo = todayStatus === 'Check-In'
        ? {
            label: 'Working',
            badge: 'CHECKED IN',
            color: 'text-[#10B981]',
            badgeBg: 'bg-[#10B981]/20 text-[#10B981]',
            canCheckIn: false,
            canCheckOut: true,
            isCompleted: false,
            lastText: stats.lastCheckTime
                ? `Checked in at ${new Date(stats.lastCheckTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Currently on shift',
        }
        : todayStatus === 'Check-Out'
            ? {
                label: 'Checked Out',
                badge: 'SHIFT ENDED',
                color: 'text-[#F59E0B]',
                badgeBg: 'bg-[#F59E0B]/20 text-[#F59E0B]',
                canCheckIn: false,
                canCheckOut: false,
                isCompleted: true,
                lastText: 'Today shift completed',
            }
            : {
                label: 'Not Marked',
                badge: 'PENDING',
                color: 'text-[#94A3B8]',
                badgeBg: 'bg-[#94A3B8]/20 text-[#94A3B8]',
                canCheckIn: true,
                canCheckOut: false,
                isCompleted: false,
                lastText: 'Tap below to mark your attendance',
            };

    const loadData = () => {
        queryClient.invalidateQueries(['employeeData']);
        queryClient.invalidateQueries(['settings']);
    };

    const initiateAttendance = (type) => {
        setAttTypePending(type);
        if (employeeCameraRequired) {
            setShowCamera(true);
        } else {
            submitEmployeeAttendance(type, '');
        }
    };

    const submitAttendanceFallback = async (type, photoBase64) => {
        const res = await apiCall('markEmployeeAtt', {
            id: user?.userId,
            type,
            lat: null,
            lng: null,
            photo: photoBase64,
        });
        if (res?.error) alert(res.error);
        else {
            showToast(`${type} Successful`);
            loadData();
        }
        setMarking(false);
    };

    const submitEmployeeAttendance = (type, photoBase64) => {
        setShowCamera(false);
        setMarking(true);
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const res = await apiCall('markEmployeeAtt', {
                    id: user?.userId,
                    type,
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    photo: photoBase64,
                });
                if (res?.error) alert(res.error);
                else {
                    showToast(`${type} Successful`);
                    loadData();
                }
                setMarking(false);
            },
            () => {
                submitAttendanceFallback(type, photoBase64);
            }
        );
    };

    const handleAttendance = async (photoBase64) => {
        submitEmployeeAttendance(attTypePending, photoBase64);
    };

    const handleLeaveRequest = async (e) => {
        if (e) e.preventDefault();
        if (!leaveForm.reason.trim() || !leaveForm.from || !leaveForm.to) {
            alert('Please fill all fields');
            return;
        }
        setSavingLeave(true);
        try {
            const res = await saveLeaveRequest({
                empId: user?.userId,
                name: employeeName,
                ...leaveForm,
                reason: leaveForm.reason.trim(),
            });
            if (res?.success) {
                showToast('Leave Request Sent');
                setLeaveForm({ type: 'Sick Leave', reason: '', from: '', to: '' });
                loadData();
            } else if (res?.error) {
                alert(res.error);
            }
        } finally {
            setSavingLeave(false);
        }
    };

    const renderTopBar = (title) => (
        <div className="sticky top-0 z-30 bg-[#131B2E] border-b border-[#1F293D] px-4 py-3 flex items-center justify-between">
            <button
                type="button"
                onClick={() => setCurrentScreen('dashboard')}
                className="text-[#818CF8] hover:text-white font-bold text-sm flex items-center space-x-1 py-1"
            >
                <span>← Back</span>
            </button>
            <h1 className="text-base font-bold text-white truncate max-w-[200px] text-center">
                {title}
            </h1>
            <div className="w-12"></div>
        </div>
    );

    const latestPayrollAmount = payroll.length > 0 ? Number(payroll[0]?.amount || 0) : 0;

    // ==========================================
    // 1. EMPLOYEE DASHBOARD HOME (Android Native UI)
    // ==========================================
    if (currentScreen === 'dashboard') {
        const actionCards = [
            {
                id: 'attendance',
                title: 'Mark Attendance',
                value: statusInfo.label,
                subtitle: employeeCameraRequired ? 'Camera selfie & GPS check-in' : 'One-tap GPS check-in',
                icon: '📍',
                gradient: 'from-[#10B981] to-[#047857]',
                borderColor: 'border-[#10B981]/40',
                onClick: () => setCurrentScreen('attendance'),
            },
            {
                id: 'payslips',
                title: 'Salary Slips',
                value: `${payroll.length} Slips`,
                subtitle: latestPayrollAmount > 0 ? `Latest: ₹${Math.round(latestPayrollAmount).toLocaleString('en-IN')}` : 'View & print payslips',
                icon: '💰',
                gradient: 'from-[#8B5CF6] to-[#6D28D9]',
                borderColor: 'border-[#8B5CF6]/40',
                onClick: () => setCurrentScreen('payslips'),
            },
            {
                id: 'attview',
                title: 'Attendance View',
                value: `${stats.totalDays || 0} Days`,
                subtitle: 'Monthly calendar & summary',
                icon: '📊',
                gradient: 'from-[#06B6D4] to-[#0891B2]',
                borderColor: 'border-[#06B6D4]/40',
                onClick: () => setCurrentScreen('attview'),
            },
            {
                id: 'logs',
                title: 'Recent Logs',
                value: `${logs.length} Entries`,
                subtitle: 'Check-in & check-out history',
                icon: '📋',
                gradient: 'from-[#4F46E5] to-[#4338CA]',
                borderColor: 'border-[#4F46E5]/40',
                onClick: () => setCurrentScreen('logs'),
            },
            {
                id: 'leaves',
                title: 'Leave Requests',
                value: `${leaves.length} Requests`,
                subtitle: 'Apply & track leave status',
                icon: '✈️',
                gradient: 'from-[#F59E0B] to-[#B45309]',
                borderColor: 'border-[#F59E0B]/40',
                onClick: () => setCurrentScreen('leaves'),
            },
            {
                id: 'notices',
                title: 'Notice Board',
                value: `${notices.length} Notices`,
                subtitle: 'Staff announcements & circulars',
                icon: '📢',
                gradient: 'from-[#EC4899] to-[#BE185D]',
                borderColor: 'border-[#EC4899]/40',
                onClick: () => setCurrentScreen('notices'),
            },
        ];

        return (
            <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col font-sans select-none pb-12">
                {/* Header Bar */}
                <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#4F46E5] to-[#06B6D4] flex items-center justify-center font-black text-white text-lg shadow-md shadow-indigo-500/20">
                            {employeeName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-base font-extrabold text-[#F8FAFC] leading-snug truncate max-w-[190px]">
                                {employeeName}
                            </h2>
                            <p className="text-xs text-[#94A3B8] font-medium">
                                #{employeeId} • {employeeRole}{activeBranch ? ` • ${activeBranch}` : ''}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <button
                            type="button"
                            onClick={loadData}
                            title="Refresh Data"
                            className="w-9 h-9 rounded-full bg-[#131B2E] border border-[#1F293D] flex items-center justify-center text-sm hover:text-white text-[#94A3B8] transition-colors"
                        >
                            {isFetching ? '⏳' : '🔄'}
                        </button>
                        <button
                            type="button"
                            onClick={logout}
                            title="Sign Out"
                            className="w-9 h-9 rounded-full bg-[#131B2E] border border-[#1F293D] flex items-center justify-center text-sm hover:bg-red-500/20 transition-colors"
                        >
                            🚪
                        </button>
                    </div>
                </div>

                {/* Live Shift Overview Strip */}
                <div className="px-4 py-2">
                    <div
                        onClick={() => setCurrentScreen('attendance')}
                        className="bg-gradient-to-r from-[#1E1B4B] to-[#0F172A] border border-[#4F46E5]/30 rounded-2xl p-3.5 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all"
                    >
                        <div>
                            <span className="block text-[11px] font-bold text-[#818CF8]">Employee Portal</span>
                            <span className="block text-xs font-bold text-white mt-0.5">{statusInfo.lastText}</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${statusInfo.badgeBg}`}>
                            ● {statusInfo.badge}
                        </span>
                    </div>
                </div>

                {/* Live Stats Strip */}
                <div className="px-4 py-2 grid grid-cols-3 gap-2.5">
                    <div
                        onClick={() => setCurrentScreen('attendance')}
                        className="bg-[#131B2E] border border-[#1F293D] rounded-2xl p-3 cursor-pointer active:scale-95 transition-all"
                    >
                        <span className="block text-[11px] text-[#94A3B8] font-medium">Status</span>
                        <span className={`block text-sm font-extrabold mt-1.5 truncate ${statusInfo.color}`}>
                            {statusInfo.label}
                        </span>
                    </div>

                    <div
                        onClick={() => setCurrentScreen('attview')}
                        className="bg-[#131B2E] border border-[#1F293D] rounded-2xl p-3 cursor-pointer active:scale-95 transition-all"
                    >
                        <span className="block text-[11px] text-[#94A3B8] font-medium">Total Days</span>
                        <span className="block text-xl font-extrabold text-[#06B6D4] mt-1">
                            {stats.totalDays || 0}
                        </span>
                    </div>

                    <div
                        onClick={() => setCurrentScreen('payslips')}
                        className="bg-[#131B2E] border border-[#1F293D] rounded-2xl p-3 cursor-pointer active:scale-95 transition-all"
                    >
                        <span className="block text-[11px] text-[#94A3B8] font-medium">Payslips</span>
                        <span className="block text-xl font-extrabold text-[#10B981] mt-1">
                            {payroll.length}
                        </span>
                    </div>
                </div>

                {/* 6 Action Cards Grid */}
                <div className="px-4 pt-2 pb-6 grid grid-cols-2 gap-3">
                    {actionCards.map((card) => (
                        <div
                            key={card.id}
                            onClick={card.onClick}
                            className={`h-[154px] bg-[#131B2E] border ${card.borderColor} rounded-[22px] p-4 flex flex-col justify-between cursor-pointer active:scale-[0.97] transition-all hover:border-white/30`}
                        >
                            <div className="flex items-center justify-between">
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-xl shadow-md`}>
                                    {card.icon}
                                </div>
                                <span className="text-[10px] font-bold text-[#818CF8]">
                                    OPEN →
                                </span>
                            </div>

                            <div>
                                <span className="block text-base font-extrabold text-white truncate">{card.value}</span>
                                <h3 className="text-xs font-bold text-[#94A3B8] mt-0.5 truncate">{card.title}</h3>
                                <p className="text-[10px] text-[#64748B] truncate">{card.subtitle}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ==========================================
    // 2. SUB-SCREENS
    // ==========================================
    return (
        <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col font-sans select-none pb-12">
            {/* SCREEN: MARK ATTENDANCE */}
            {currentScreen === 'attendance' && (
                <>
                    {renderTopBar('Mark Attendance')}
                    <div className="p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-[#131B2E] border border-[#06B6D4]/40 rounded-2xl p-3.5">
                                <span className="text-[11px] text-[#94A3B8] block">Total Days</span>
                                <span className="text-xl font-extrabold text-[#06B6D4] block mt-1">
                                    {stats.totalDays || 0} Days
                                </span>
                            </div>
                            <div className="bg-[#131B2E] border border-[#F59E0B]/40 rounded-2xl p-3.5">
                                <span className="text-[11px] text-[#94A3B8] block">Current Status</span>
                                <span className={`text-lg font-extrabold block mt-1 ${statusInfo.color}`}>
                                    {statusInfo.label}
                                </span>
                            </div>
                        </div>

                        <div className="bg-[#131B2E] border border-[#1F293D] rounded-[24px] p-6 text-center space-y-4">
                            <div className="w-20 h-20 rounded-full mx-auto bg-[#0B0F19] border border-[#1F293D] flex items-center justify-center text-4xl">
                                {todayStatus === 'Check-In' ? '🏢' : todayStatus === 'Check-Out' ? '🏠' : '🕒'}
                            </div>
                            <div>
                                <h3 className="text-base font-extrabold text-white">{statusInfo.label}</h3>
                                <p className="text-xs text-[#94A3B8] mt-1">{statusInfo.lastText}</p>
                            </div>

                            <div className="pt-2 grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => statusInfo.canCheckIn && initiateAttendance('Check-In')}
                                    disabled={!statusInfo.canCheckIn || marking}
                                    className={`h-[52px] rounded-2xl font-bold text-xs flex items-center justify-center space-x-1 transition-all ${
                                        statusInfo.canCheckIn && !marking
                                            ? 'bg-gradient-to-r from-[#10B981] to-[#059669] text-white shadow-lg shadow-emerald-500/25 active:scale-[0.98] cursor-pointer'
                                            : 'bg-[#1E293B] text-[#64748B] opacity-60 cursor-not-allowed'
                                    }`}
                                >
                                    <span>
                                        {marking && attTypePending === 'Check-In'
                                            ? 'Checking In...'
                                            : todayStatus === 'Check-In' || statusInfo.isCompleted
                                                ? '✓ Checked In'
                                                : employeeCameraRequired ? '📷 Check In' : '✓ Check In'}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => statusInfo.canCheckOut && initiateAttendance('Check-Out')}
                                    disabled={!statusInfo.canCheckOut || marking}
                                    className={`h-[52px] rounded-2xl font-bold text-xs flex items-center justify-center space-x-1 transition-all ${
                                        statusInfo.canCheckOut && !marking
                                            ? 'bg-gradient-to-r from-[#F43F5E] to-[#E11D48] text-white shadow-lg shadow-rose-500/25 active:scale-[0.98] cursor-pointer'
                                            : 'bg-[#1E293B] text-[#64748B] opacity-60 cursor-not-allowed'
                                    }`}
                                >
                                    <span>
                                        {marking && attTypePending === 'Check-Out'
                                            ? 'Checking Out...'
                                            : statusInfo.isCompleted
                                                ? '✓ Checked Out'
                                                : employeeCameraRequired ? '📷 Check Out' : '⏱ Check Out'}
                                    </span>
                                </button>
                            </div>
                            {statusInfo.isCompleted && (
                                <p className="text-[11px] font-bold text-[#10B981] mt-2">
                                    ✅ Shift completed for today. Double check-in is disabled.
                                </p>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* SCREEN: ATTENDANCE VIEW */}
            {currentScreen === 'attview' && (
                <>
                    {renderTopBar('Attendance View')}
                    <div className="p-4">
                        <div className="bg-white text-gray-800 rounded-2xl p-3 overflow-x-auto">
                            <AttendanceView logs={allLogs} type="employee" />
                        </div>
                    </div>
                </>
            )}

            {/* SCREEN: RECENT LOGS */}
            {currentScreen === 'logs' && (
                <>
                    {renderTopBar(`Recent Logs (${logs.length})`)}
                    <div className="p-4 space-y-2.5">
                        {logs.length === 0 ? (
                            <div className="bg-[#131B2E] border border-[#1F293D] rounded-2xl p-8 text-center text-xs text-[#94A3B8]">
                                No recent attendance logs found.
                            </div>
                        ) : (
                            logs.map((l, i) => {
                                const isIn = l.status === 'Check-In';
                                return (
                                    <div
                                        key={i}
                                        className={`bg-[#131B2E] border rounded-xl p-3.5 flex items-center justify-between ${
                                            isIn ? 'border-[#10B981]/30' : 'border-[#F43F5E]/30'
                                        }`}
                                    >
                                        <div>
                                            <h4 className="text-xs font-bold text-white">{l.status}</h4>
                                            <p className="text-[11px] text-[#94A3B8] mt-0.5">
                                                {l.time ? new Date(l.time).toLocaleString() : '---'}
                                            </p>
                                        </div>
                                        <div className="text-right space-y-1">
                                            <span
                                                className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-lg ${
                                                    isIn ? 'bg-[#10B981]/20 text-[#10B981]' : 'bg-[#F43F5E]/20 text-[#F43F5E]'
                                                }`}
                                            >
                                                {l.status}
                                            </span>
                                            {l.distance && (
                                                <span className="block text-[10px] font-mono text-[#06B6D4]">
                                                    📍 {l.distance}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </>
            )}

            {/* SCREEN: SALARY SLIPS */}
            {currentScreen === 'payslips' && (
                <>
                    {renderTopBar(`Salary Slips (${payroll.length})`)}
                    <div className="p-4 space-y-3">
                        <div className="bg-[#131B2E] border border-[#8B5CF6]/40 rounded-2xl p-4">
                            <span className="text-xs font-bold text-[#A78BFA]">My Payroll Ledger</span>
                            <h3 className="text-xl font-extrabold text-white mt-1">
                                {payroll.length} Generated {payroll.length === 1 ? 'Slip' : 'Slips'}
                            </h3>
                            <p className="text-xs text-[#94A3B8] mt-1">
                                Tap any salary slip to view or download as PDF.
                            </p>
                        </div>

                        {payroll.length === 0 ? (
                            <div className="bg-[#131B2E] border border-[#1F293D] rounded-2xl p-8 text-center text-xs text-[#94A3B8]">
                                No salary slips generated yet.
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {payroll.map((p, i) => (
                                    <div
                                        key={i}
                                        className="bg-[#131B2E] border border-[#1F293D] rounded-2xl p-4 flex items-center justify-between gap-3"
                                    >
                                        <div>
                                            <div className="text-base font-extrabold text-[#10B981]">
                                                ₹{Number(p.amount || 0).toLocaleString('en-IN')}
                                            </div>
                                            <div className="text-[11px] text-[#94A3B8] mt-0.5">
                                                Date: {p.date ? new Date(p.date).toLocaleDateString('en-IN') : '---'}
                                            </div>
                                            {p.days != null && (
                                                <div className="text-[10px] text-[#818CF8] mt-0.5">
                                                    Working Days: {p.days}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <span className="text-[10px] font-bold bg-[#10B981]/20 text-[#10B981] px-2.5 py-0.5 rounded-md">
                                                Paid
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setViewingSlip({
                                                        id: p.id,
                                                        date: p.date,
                                                        empId: user?.userId,
                                                        name: employeeName,
                                                        days: p.days,
                                                        amount: p.amount,
                                                    })
                                                }
                                                className="px-3 py-1.5 rounded-xl bg-[#4F46E5] text-xs font-bold text-white shadow-md shadow-indigo-500/20 active:scale-95 transition-all"
                                            >
                                                View Slip
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* SCREEN: LEAVES */}
            {currentScreen === 'leaves' && (
                <>
                    {renderTopBar('Leave Requests')}
                    <div className="p-4 space-y-4">
                        <form
                            onSubmit={handleLeaveRequest}
                            className="bg-[#131B2E] border border-[#1F293D] rounded-[22px] p-4 space-y-3"
                        >
                            <h3 className="text-sm font-bold text-white">Request Leave</h3>

                            <div>
                                <label className="block text-[11px] font-semibold text-[#94A3B8] mb-1">Leave Type</label>
                                <select
                                    value={leaveForm.type}
                                    onChange={(e) => setLeaveForm((p) => ({ ...p, type: e.target.value }))}
                                    className="w-full bg-[#0B0F19] border border-[#1F293D] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#4F46E5]"
                                >
                                    <option value="Sick Leave">Sick Leave</option>
                                    <option value="Casual Leave">Casual Leave</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-[#94A3B8] mb-1">Reason</label>
                                <input
                                    type="text"
                                    placeholder="Enter reason for leave"
                                    value={leaveForm.reason}
                                    onChange={(e) => setLeaveForm((p) => ({ ...p, reason: e.target.value }))}
                                    className="w-full bg-[#0B0F19] border border-[#1F293D] rounded-xl px-3 py-2.5 text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#4F46E5]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-semibold text-[#94A3B8] mb-1">From Date</label>
                                    <input
                                        type="date"
                                        value={leaveForm.from}
                                        onChange={(e) => setLeaveForm((p) => ({ ...p, from: e.target.value }))}
                                        className="w-full bg-[#0B0F19] border border-[#1F293D] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#4F46E5]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-[#94A3B8] mb-1">To Date</label>
                                    <input
                                        type="date"
                                        value={leaveForm.to}
                                        onChange={(e) => setLeaveForm((p) => ({ ...p, to: e.target.value }))}
                                        className="w-full bg-[#0B0F19] border border-[#1F293D] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#4F46E5]"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={savingLeave}
                                className="w-full h-11 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] font-bold text-xs text-white shadow-md shadow-amber-500/20 active:scale-[0.98] transition-all disabled:opacity-60"
                            >
                                {savingLeave ? 'Submitting...' : 'Submit Leave Request'}
                            </button>
                        </form>

                        <div className="space-y-2.5">
                            <h3 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider px-1">
                                My Leave History ({leaves.length})
                            </h3>
                            {leaves.length === 0 ? (
                                <div className="bg-[#131B2E] border border-[#1F293D] rounded-2xl p-6 text-center text-xs text-[#94A3B8]">
                                    No leave history yet.
                                </div>
                            ) : (
                                leaves.map((l, i) => {
                                    const badgeClass = l.status === 'Approved'
                                        ? 'bg-[#10B981]/20 text-[#10B981]'
                                        : l.status === 'Rejected'
                                            ? 'bg-[#F43F5E]/20 text-[#F43F5E]'
                                            : 'bg-[#F59E0B]/20 text-[#F59E0B]';
                                    return (
                                        <div
                                            key={i}
                                            className="bg-[#131B2E] border border-[#1F293D] rounded-xl p-3.5 flex items-center justify-between"
                                        >
                                            <div>
                                                <h4 className="text-xs font-bold text-white">{l.type || 'Leave'}</h4>
                                                <p className="text-[11px] text-[#06B6D4] mt-0.5">
                                                    {l.from}{l.to ? ` to ${l.to}` : ''}
                                                </p>
                                                {l.reason && <p className="text-[10px] text-[#94A3B8] mt-0.5">{l.reason}</p>}
                                            </div>
                                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${badgeClass}`}>
                                                {l.status || 'Pending'}
                                            </span>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* SCREEN: NOTICES */}
            {currentScreen === 'notices' && (
                <>
                    {renderTopBar(`Notices (${notices.length})`)}
                    <div className="p-4 space-y-3">
                        {notices.length === 0 ? (
                            <div className="bg-[#131B2E] border border-[#1F293D] rounded-2xl p-8 text-center text-xs text-[#94A3B8]">
                                No new staff notices at this time.
                            </div>
                        ) : (
                            notices.map((n, i) => (
                                <div key={i} className="bg-[#131B2E] border border-[#1F293D] rounded-2xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[11px] font-bold text-[#818CF8] bg-[#4F46E5]/20 px-2 py-0.5 rounded-md">
                                            {n.date || 'Notice'}
                                        </span>
                                        <span className="text-[10px] text-[#64748B]">Staff Circular</span>
                                    </div>
                                    <h4 className="text-sm font-bold text-white mb-1">{n.title}</h4>
                                    <p className="text-xs text-[#CBD5E1] leading-relaxed">{n.msg || n.message}</p>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}

            {/* Camera Modal */}
            {showCamera && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <div className="w-full max-w-sm bg-[#131B2E] border border-[#1F293D] rounded-[24px] p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-white">Secure {attTypePending}</h3>
                            <button
                                type="button"
                                onClick={() => setShowCamera(false)}
                                className="text-xs font-bold text-[#94A3B8] hover:text-white px-2 py-1"
                            >
                                ✕
                            </button>
                        </div>
                        <p className="text-[11px] text-[#94A3B8] text-center">
                            Look at the camera to capture your attendance photo. A timestamp will be embedded.
                        </p>
                        <CameraCapture
                            onCapture={(b64) => handleAttendance(b64)}
                            onCancel={() => setShowCamera(false)}
                        />
                    </div>
                </div>
            )}

            {/* Salary Slip Viewer Modal */}
            {viewingSlip && (
                <SalarySlip
                    slip={viewingSlip}
                    employee={{ id: employeeId, name: employeeName, role: employeeRole }}
                    onClose={() => setViewingSlip(null)}
                />
            )}
        </div>
    );
}

