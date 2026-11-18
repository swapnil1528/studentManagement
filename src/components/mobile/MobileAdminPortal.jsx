import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { actionLeaveRequest, saveNotice, apiCall } from '../../services/api';
import { showToast } from '../ui/Toast';

export default function MobileAdminPortal({ adminData, branch, onReload }) {
    const { user, logout } = useAuth();
    const username = user?.username || user?.name || 'Admin';
    const activeBranch = branch || user?.branch || 'Devichapada';

    const [currentScreen, setCurrentScreen] = useState('dashboard');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFeeTab, setSelectedFeeTab] = useState(0); // 0 = receipts, 1 = pending
    const [selectedAttTab, setSelectedAttTab] = useState(0); // 0 = staff, 1 = students

    // Notice post modal state
    const [showNoticeModal, setShowNoticeModal] = useState(false);
    const [noticeTitle, setNoticeTitle] = useState('');
    const [noticeMsg, setNoticeMsg] = useState('');
    const [isPostingNotice, setIsPostingNotice] = useState(false);

    // Leave action state
    const [actioningLeaveId, setActioningLeaveId] = useState(null);

    // System settings state
    const [mobileCheckIn, setMobileCheckIn] = useState(false);
    const [studentCamera, setStudentCamera] = useState(false);
    const [employeeCamera, setEmployeeCamera] = useState(false);
    const [settingsLoading, setSettingsLoading] = useState(true);

    useEffect(() => {
        let active = true;
        (async () => {
            setSettingsLoading(true);
            try {
                const res = await apiCall('getSettings', {});
                if (active && res?.success) {
                    setMobileCheckIn(res.mobileCheckIn === true || res.mobileCheckIn === 'true');
                    setStudentCamera(res.studentCameraCheckIn === true || res.studentCameraCheckIn === 'true');
                    if (res.employeeCameraCheckIn !== undefined) {
                        const empCamVal = res.employeeCameraCheckIn === true || res.employeeCameraCheckIn === 'true';
                        setEmployeeCamera(empCamVal);
                        try { localStorage.setItem('erp_employee_camera_checkin', String(empCamVal)); } catch (e) {}
                    } else {
                        try { setEmployeeCamera(localStorage.getItem('erp_employee_camera_checkin') === 'true'); } catch (e) {}
                    }
                }
            } finally {
                if (active) setSettingsLoading(false);
            }
        })();
        return () => { active = false; };
    }, []);

    const toggleSetting = async (key, currentVal, setter, label) => {
        const nextVal = !currentVal;
        setter(nextVal);
        const res = await apiCall('saveSetting', { key, value: nextVal ? 'true' : 'false' });
        if (res?.success) {
            if (key === 'employeeCameraCheckIn') {
                try { localStorage.setItem('erp_employee_camera_checkin', String(nextVal)); } catch (e) {}
            }
            showToast(`${label} ${nextVal ? 'ON' : 'OFF'}`);
        } else {
            setter(currentVal);
            showToast('Failed to save setting');
        }
    };

    // Compute stats
    const stats = useMemo(() => {
        const d = adminData || {};
        const feeArr = d.fees || [];
        const admArr = d.admissions || [];
        const todayStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '-'); // dd-mm-yyyy

        let todaySum = 0;
        const paidMap = {};
        const receiptsList = [];

        feeArr.forEach((f) => {
            const recNo = f[0] || '';
            const date = String(f[1] || '');
            const sId = String(f[2] || '').trim().toLowerCase();
            const sName = f[3] || 'Student';
            const course = f[4] || '';
            const amt = parseFloat(f[5]) || 0;
            const mode = f[7] || 'Cash';
            const collector = f[8] || '';

            if (date.includes(todayStr) || date.startsWith(todayStr.slice(0, 10))) {
                todaySum += amt;
            }
            paidMap[sId] = (paidMap[sId] || 0) + amt;

            receiptsList.push({
                recNo,
                date,
                studId: f[2] || '',
                name: sName,
                course,
                amount: amt,
                mode,
                collector
            });
        });

        let pendingSum = 0;
        const pendingList = [];

        admArr.forEach((a) => {
            const sId = String(a[2] || '').trim();
            const key = sId.toLowerCase();
            const sName = a[3] || 'Student';
            const mobile = a[4] || '';
            const course = a[7] || '';
            const total = parseFloat(a[10]) || 0;
            const paid = paidMap[key] || 0;
            const pending = total - paid;
            const dueD = a[9] || '';

            if (pending > 0) {
                pendingSum += pending;
                pendingList.push({
                    studId: sId,
                    name: sName,
                    course,
                    totalFee: total,
                    paidFee: paid,
                    pendingFee: pending,
                    dueDate: dueD,
                    mobile
                });
            }
        });

        // Attendance stats
        const attStats = d.stats || {};
        const todayPresent = attStats.todayPresent || 0;
        const todayAbsent = attStats.todayAbsent || 0;

        // Staff
        const employees = d.employees || [];
        const empAtt = d.empAttendance || [];
        const activeStaffSet = new Set();
        empAtt.forEach((ea) => {
            if (ea.empId) activeStaffSet.add(ea.empId);
        });

        // Leaves
        const leaves = d.leaves || [];

        // Raw Attendance
        const rawAtt = d._rawAttendance || [];

        return {
            todayFeesCollected: todaySum,
            totalPendingFees: pendingSum,
            receipts: receiptsList.reverse(),
            pendingItems: pendingList.sort((a, b) => b.pendingFee - a.pendingFee),
            todayPresentStudents: todayPresent,
            todayAbsentStudents: todayAbsent,
            totalStaffCount: employees.length,
            todayStaffPresent: activeStaffSet.size,
            empAttendanceList: empAtt,
            studentAttendanceList: rawAtt,
            leaves: leaves,
            totalAdmissionsCount: admArr.length,
            admissions: admArr
        };
    }, [adminData]);

    const handleActionLeave = async (leaveId, status) => {
        setActioningLeaveId(leaveId);
        try {
            await actionLeaveRequest(leaveId, status);
            if (onReload) onReload();
        } catch (e) {
            console.error(e);
        } finally {
            setActioningLeaveId(null);
        }
    };

    const handlePostNotice = async (e) => {
        if (e) e.preventDefault();
        if (!noticeTitle.trim() || !noticeMsg.trim()) return;
        setIsPostingNotice(true);
        try {
            await saveNotice({
                title: noticeTitle.trim(),
                message: noticeMsg.trim(),
                branch: activeBranch
            });
            setShowNoticeModal(false);
            setNoticeTitle('');
            setNoticeMsg('');
            if (onReload) onReload();
        } catch (e) {
            console.error(e);
        } finally {
            setIsPostingNotice(false);
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

    // ==========================================
    // 1. ADMIN DASHBOARD HOME
    // ==========================================
    if (currentScreen === 'dashboard') {
        const kpiCards = [
            {
                id: 'collection',
                title: 'Today Collection',
                value: `₹${Math.round(stats.todayFeesCollected).toLocaleString('en-US')}`,
                subtitle: 'Collected Today',
                icon: '💰',
                gradient: 'from-[#10B981] to-[#047857]',
                borderColor: 'border-[#10B981]/40',
                onClick: () => { setSelectedFeeTab(0); setCurrentScreen('fees'); }
            },
            {
                id: 'pending',
                title: 'Fees Pending',
                value: `₹${Math.round(stats.totalPendingFees).toLocaleString('en-US')}`,
                subtitle: 'Outstanding Dues',
                icon: '⏳',
                gradient: 'from-[#F43F5E] to-[#9F1239]',
                borderColor: 'border-[#F43F5E]/40',
                onClick: () => { setSelectedFeeTab(1); setCurrentScreen('fees'); }
            },
            {
                id: 'att_students',
                title: 'Student Attendance',
                value: `${stats.todayPresentStudents} Present`,
                subtitle: `${stats.todayAbsentStudents} Absent Today`,
                icon: '👥',
                gradient: 'from-[#06B6D4] to-[#0891B2]',
                borderColor: 'border-[#06B6D4]/40',
                onClick: () => { setSelectedAttTab(1); setCurrentScreen('attendance'); }
            },
            {
                id: 'att_staff',
                title: 'Staff Attendance',
                value: `${stats.todayStaffPresent} / ${stats.totalStaffCount}`,
                subtitle: 'Employees Checked-In',
                icon: '👔',
                gradient: 'from-[#4F46E5] to-[#4338CA]',
                borderColor: 'border-[#4F46E5]/40',
                onClick: () => { setSelectedAttTab(0); setCurrentScreen('attendance'); }
            },
            {
                id: 'leaves',
                title: 'Leave Requests',
                value: `${stats.leaves.length} Pending`,
                subtitle: 'Staff Applications',
                icon: '📝',
                gradient: 'from-[#F59E0B] to-[#B45309]',
                borderColor: 'border-[#F59E0B]/40',
                onClick: () => setCurrentScreen('leaves')
            },
            {
                id: 'students',
                title: 'Total Enrolled',
                value: `${stats.totalAdmissionsCount} Students`,
                subtitle: 'Active Admissions',
                icon: '🎓',
                gradient: 'from-[#8B5CF6] to-[#6D28D9]',
                borderColor: 'border-[#8B5CF6]/40',
                onClick: () => setCurrentScreen('students')
            }
        ];

        return (
            <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col font-sans select-none pb-12">
                {/* Executive Header */}
                <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#F59E0B] to-[#D97706] flex items-center justify-center text-xl shadow-md shadow-amber-500/20">
                            👑
                        </div>
                        <div>
                            <h2 className="text-base font-extrabold text-[#F8FAFC] leading-snug">
                                Admin Executive Hub
                            </h2>
                            <p className="text-xs text-[#F59E0B] font-medium">
                                {username} • Campus: {activeBranch}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <button
                            type="button"
                            onClick={() => onReload && onReload()}
                            title="Refresh Data"
                            className="w-9 h-9 rounded-full bg-[#131B2E] border border-[#1F293D] flex items-center justify-center text-sm hover:text-white text-[#94A3B8] transition-colors"
                        >
                            🔄
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

                {/* Live Campus Overview Strip */}
                <div className="px-4 py-2">
                    <div className="bg-gradient-to-r from-[#1E1B4B] to-[#0F172A] border border-[#4F46E5]/30 rounded-2xl p-3.5 flex items-center justify-between">
                        <div>
                            <span className="block text-[11px] font-bold text-[#818CF8]">Live Campus Overview</span>
                            <span className="block text-xs font-bold text-white mt-0.5">Collection & Attendance Realtime Feed</span>
                        </div>
                        <span className="text-[10px] font-bold text-[#10B981] bg-[#10B981]/20 px-2.5 py-1 rounded-lg">
                            ● LIVE
                        </span>
                    </div>
                </div>

                {/* 6 Executive KPI Cards Grid */}
                <div className="px-4 pt-2 pb-4 grid grid-cols-2 gap-3">
                    {kpiCards.map((card) => (
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

                {/* Quick Action Cards */}
                <div className="px-4 pb-6 grid grid-cols-2 gap-3">
                    <div
                        onClick={() => setCurrentScreen('notices')}
                        className="h-[120px] bg-[#131B2E] border border-[#F59E0B]/40 rounded-[22px] p-4 flex flex-col justify-between cursor-pointer active:scale-[0.97] transition-all"
                    >
                        <span className="text-2xl">📢</span>
                        <div>
                            <h4 className="text-xs font-bold text-white">Broadcast Notice</h4>
                            <p className="text-[10px] text-[#94A3B8]">Publish campus circulars</p>
                        </div>
                    </div>

                    <div
                        onClick={() => setCurrentScreen('chat')}
                        className="h-[120px] bg-[#131B2E] border border-[#10B981]/40 rounded-[22px] p-4 flex flex-col justify-between cursor-pointer active:scale-[0.97] transition-all"
                    >
                        <span className="text-2xl">💬</span>
                        <div>
                            <h4 className="text-xs font-bold text-white">WhatsApp Hub</h4>
                            <p className="text-[10px] text-[#94A3B8]">Chat with students & staff</p>
                        </div>
                    </div>
                </div>

                {/* System Settings Card */}
                <div className="px-4 pb-6">
                    <div className="bg-[#131B2E] border border-[#1F293D] rounded-[22px] p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-extrabold text-white">⚙️ Attendance Settings</h4>
                            {settingsLoading && <span className="text-[10px] text-[#64748B]">Loading...</span>}
                        </div>

                        {[
                            {
                                key: 'mobileCheckIn',
                                title: 'Mobile Check-In',
                                desc: 'Allow check-in from mobile devices',
                                value: mobileCheckIn,
                                setter: setMobileCheckIn,
                            },
                            {
                                key: 'studentCameraCheckIn',
                                title: 'Student Camera Enforcement',
                                desc: 'Require live photo for student check-in',
                                value: studentCamera,
                                setter: setStudentCamera,
                            },
                            {
                                key: 'employeeCameraCheckIn',
                                title: 'Employee Camera Enforcement',
                                desc: 'Require live photo for employee check-in/out',
                                value: employeeCamera,
                                setter: setEmployeeCamera,
                            },
                        ].map((item) => (
                            <div
                                key={item.key}
                                className="flex items-center justify-between gap-3 bg-[#0B0F19] border border-[#1F293D] rounded-xl px-3.5 py-2.5"
                            >
                                <div className="min-w-0">
                                    <div className="text-xs font-bold text-white truncate">{item.title}</div>
                                    <div className="text-[10px] text-[#94A3B8] truncate">{item.desc}</div>
                                </div>
                                <button
                                    type="button"
                                    disabled={settingsLoading}
                                    onClick={() => toggleSetting(item.key, item.value, item.setter, item.title)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold shrink-0 transition-all ${
                                        item.value
                                            ? 'bg-[#10B981] text-white shadow-sm shadow-emerald-500/30'
                                            : 'bg-[#1F293D] text-[#94A3B8]'
                                    }`}
                                >
                                    {settingsLoading ? '...' : item.value ? 'ON' : 'OFF'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    // 2. SUB-PAGES
    // ==========================================
    return (
        <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col font-sans select-none pb-12">
            {/* SCREEN: FEES */}
            {currentScreen === 'fees' && (
                <>
                    {renderTopBar('Campus Fee Management')}
                    <div className="p-4 space-y-4">
                        {/* Financial Banners */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-[#131B2E] border border-[#10B981]/40 rounded-2xl p-3.5">
                                <span className="text-[11px] text-[#94A3B8] block">Today Collected</span>
                                <span className="text-lg font-extrabold text-[#10B981] block mt-1">
                                    ₹{Math.round(stats.todayFeesCollected).toLocaleString('en-US')}
                                </span>
                            </div>
                            <div className="bg-[#131B2E] border border-[#F43F5E]/40 rounded-2xl p-3.5">
                                <span className="text-[11px] text-[#94A3B8] block">Total Pending Dues</span>
                                <span className="text-lg font-extrabold text-[#F43F5E] block mt-1">
                                    ₹{Math.round(stats.totalPendingFees).toLocaleString('en-US')}
                                </span>
                            </div>
                        </div>

                        {/* Dual Tabs */}
                        <div className="bg-[#131B2E] border border-[#1F293D] rounded-xl p-1 flex">
                            <button
                                type="button"
                                onClick={() => setSelectedFeeTab(0)}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                                    selectedFeeTab === 0 ? 'bg-[#10B981] text-white' : 'text-[#94A3B8]'
                                }`}
                            >
                                Receipts ({stats.receipts.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedFeeTab(1)}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                                    selectedFeeTab === 1 ? 'bg-[#F43F5E] text-white' : 'text-[#94A3B8]'
                                }`}
                            >
                                Pending Dues ({stats.pendingItems.length})
                            </button>
                        </div>

                        {/* Search Filter */}
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by student name or ID..."
                            className="w-full bg-[#131B2E] border border-[#1F293D] rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#4F46E5]"
                        />

                        {/* List */}
                        {selectedFeeTab === 0 ? (
                            <div className="space-y-2.5">
                                {stats.receipts
                                    .filter((r) => !searchQuery.trim() || r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.studId.toLowerCase().includes(searchQuery.toLowerCase()))
                                    .slice(0, 30)
                                    .map((rec, i) => (
                                        <div key={i} className="bg-[#131B2E] border border-[#1F293D] rounded-xl p-3 flex items-center justify-between">
                                            <div>
                                                <h4 className="text-xs font-bold text-white">{rec.name}</h4>
                                                <p className="text-[11px] text-[#818CF8] mt-0.5">{rec.course} • {rec.recNo}</p>
                                                <p className="text-[10px] text-[#94A3B8]">Date: {rec.date.slice(0, 10)} • ID: {rec.studId}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-sm font-extrabold text-[#10B981]">+₹{Math.round(rec.amount)}</span>
                                                <span className="block text-[10px] text-[#64748B]">{rec.mode}</span>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {stats.pendingItems
                                    .filter((p) => !searchQuery.trim() || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.studId.toLowerCase().includes(searchQuery.toLowerCase()))
                                    .slice(0, 30)
                                    .map((p, i) => (
                                        <div key={i} className="bg-[#131B2E] border border-[#F43F5E]/30 rounded-xl p-3 flex items-center justify-between">
                                            <div>
                                                <h4 className="text-xs font-bold text-white">{p.name}</h4>
                                                <p className="text-[11px] text-[#06B6D4] mt-0.5">{p.course} • {p.studId}</p>
                                                <p className="text-[10px] text-[#94A3B8]">Total: ₹{Math.round(p.totalFee)} • Paid: ₹{Math.round(p.paidFee)}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-sm font-extrabold text-[#F43F5E]">DUE: ₹{Math.round(p.pendingFee)}</span>
                                                {p.mobile && (
                                                    <a
                                                        href={`https://wa.me/91${p.mobile.replace(/\D/g, '')}?text=Dear%20${encodeURIComponent(p.name)},%20your%20pending%20fee%20balance%20at%20DCC%20is%20Rs.%20${Math.round(p.pendingFee)}.`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="block text-[10px] text-[#10B981] font-bold mt-1"
                                                    >
                                                        📲 Remind
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* SCREEN: ATTENDANCE */}
            {currentScreen === 'attendance' && (
                <>
                    {renderTopBar('Campus Attendance Ledger')}
                    <div className="p-4 space-y-4">
                        {/* Stats Banner */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-[#131B2E] border border-[#10B981]/40 rounded-2xl p-3.5">
                                <span className="text-[11px] text-[#94A3B8] block">Today Present</span>
                                <span className="text-xl font-extrabold text-[#10B981] block mt-1">
                                    {stats.todayPresentStudents} Students
                                </span>
                            </div>
                            <div className="bg-[#131B2E] border border-[#F59E0B]/40 rounded-2xl p-3.5">
                                <span className="text-[11px] text-[#94A3B8] block">Today Absent</span>
                                <span className="text-xl font-extrabold text-[#F59E0B] block mt-1">
                                    {stats.todayAbsentStudents} Students
                                </span>
                            </div>
                        </div>

                        {/* Dual Tabs */}
                        <div className="bg-[#131B2E] border border-[#1F293D] rounded-xl p-1 flex">
                            <button
                                type="button"
                                onClick={() => setSelectedAttTab(0)}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                                    selectedAttTab === 0 ? 'bg-[#4F46E5] text-white' : 'text-[#94A3B8]'
                                }`}
                            >
                                Staff Logs ({stats.empAttendanceList.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedAttTab(1)}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                                    selectedAttTab === 1 ? 'bg-[#06B6D4] text-black font-extrabold' : 'text-[#94A3B8]'
                                }`}
                            >
                                Student Logs ({stats.studentAttendanceList.length})
                            </button>
                        </div>

                        {/* Logs */}
                        {selectedAttTab === 0 ? (
                            <div className="space-y-2.5">
                                {stats.empAttendanceList.length === 0 ? (
                                    <div className="bg-[#131B2E] rounded-xl p-8 text-center text-xs text-[#94A3B8]">
                                        No employee check-in logs for today.
                                    </div>
                                ) : (
                                    stats.empAttendanceList.map((item, i) => (
                                        <div key={i} className="bg-[#131B2E] border border-[#1F293D] rounded-xl p-3 flex items-center justify-between">
                                            <div>
                                                <h4 className="text-xs font-bold text-white">{item.name || 'Employee'}</h4>
                                                <p className="text-[11px] text-[#94A3B8]">Staff ID: {item.empId} • {String(item.time || '').slice(0, 19).replace('T', ' ')}</p>
                                                <p className="text-[10px] text-[#06B6D4]">📍 {item.dist || '0m'} • {item.loc || 'Campus'}</p>
                                            </div>
                                            <span className="text-xs font-bold text-[#10B981] bg-[#10B981]/20 px-2.5 py-1 rounded-lg">
                                                {item.status || 'Check-In'}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {stats.studentAttendanceList.length === 0 ? (
                                    <div className="bg-[#131B2E] rounded-xl p-8 text-center text-xs text-[#94A3B8]">
                                        No student attendance logs for today.
                                    </div>
                                ) : (
                                    stats.studentAttendanceList.slice(0, 50).map((r, i) => {
                                        const sId = r.id || r[1] || '';
                                        const name = r.name || r[2] || 'Student';
                                        const date = r.date || r[0] || '';
                                        const status = r.status || r[4] || 'Present';
                                        return (
                                            <div key={i} className="bg-[#131B2E] border border-[#1F293D] rounded-xl p-3 flex items-center justify-between">
                                                <div>
                                                    <h4 className="text-xs font-bold text-white">{name}</h4>
                                                    <p className="text-[11px] text-[#94A3B8]">ID: {sId} • Date: {String(date).slice(0, 10)}</p>
                                                </div>
                                                <span className="text-xs font-bold text-[#06B6D4] bg-[#06B6D4]/20 px-2.5 py-1 rounded-lg">
                                                    {status}
                                                </span>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* SCREEN: LEAVES */}
            {currentScreen === 'leaves' && (
                <>
                    {renderTopBar('Staff Leave Management')}
                    <div className="p-4 space-y-4">
                        <div className="bg-[#131B2E] border border-[#F59E0B]/40 rounded-2xl p-4">
                            <span className="text-xs font-bold text-[#F59E0B]">Pending Staff Applications</span>
                            <h3 className="text-xl font-extrabold text-white mt-1">{stats.leaves.length} Leave Applications</h3>
                            <p className="text-xs text-[#94A3B8] mt-1">Review, approve or reject staff leave requests.</p>
                        </div>

                        {stats.leaves.length === 0 ? (
                            <div className="bg-[#131B2E] rounded-xl p-8 text-center text-xs text-[#94A3B8]">
                                No pending leave applications at this time.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {stats.leaves.map((item, i) => (
                                    <div key={i} className="bg-[#131B2E] border border-[#1F293D] rounded-2xl p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="text-sm font-bold text-white">{item.name || 'Staff Member'}</h4>
                                                <p className="text-xs text-[#818CF8] mt-0.5">{item.empId} • {item.type || 'Leave'}</p>
                                            </div>
                                            <span className="text-xs font-bold text-[#F59E0B] bg-[#F59E0B]/20 px-2.5 py-1 rounded-lg">
                                                {item.status || 'Pending'}
                                            </span>
                                        </div>

                                        <p className="text-xs text-[#06B6D4]">Duration: {item.from || item.fromDate} to {item.to || item.toDate}</p>
                                        {item.reason && <p className="text-xs text-[#94A3B8]">Reason: {item.reason}</p>}

                                        <div className="grid grid-cols-2 gap-3 pt-2">
                                            <button
                                                type="button"
                                                disabled={actioningLeaveId === item.id}
                                                onClick={() => handleActionLeave(item.id, 'Approved')}
                                                className="h-10 rounded-xl bg-[#10B981] font-bold text-xs text-white flex items-center justify-center active:scale-95 transition-all shadow-md shadow-emerald-500/20"
                                            >
                                                <span>✓ Approve</span>
                                            </button>
                                            <button
                                                type="button"
                                                disabled={actioningLeaveId === item.id}
                                                onClick={() => handleActionLeave(item.id, 'Rejected')}
                                                className="h-10 rounded-xl bg-[#F43F5E] font-bold text-xs text-white flex items-center justify-center active:scale-95 transition-all shadow-md shadow-red-500/20"
                                            >
                                                <span>✕ Reject</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* SCREEN: NOTICES */}
            {currentScreen === 'notices' && (
                <>
                    <div className="sticky top-0 z-30 bg-[#131B2E] border-b border-[#1F293D] px-4 py-3 flex items-center justify-between">
                        <button type="button" onClick={() => setCurrentScreen('dashboard')} className="text-[#818CF8] font-bold text-sm">
                            ← Back
                        </button>
                        <h1 className="text-base font-bold text-white">Broadcast Notices</h1>
                        <button
                            type="button"
                            onClick={() => setShowNoticeModal(true)}
                            className="text-[#10B981] font-extrabold text-sm"
                        >
                            + Post
                        </button>
                    </div>

                    <div className="p-4 space-y-3">
                        {adminData?.notices && adminData.notices.length > 0 ? (
                            adminData.notices.map((n, i) => (
                                <div key={i} className="bg-[#131B2E] border border-[#1F293D] rounded-2xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[11px] font-bold text-[#818CF8] bg-[#4F46E5]/20 px-2 py-0.5 rounded-md">
                                            {n.date || 'Notice'}
                                        </span>
                                        <span className="text-[10px] text-[#64748B]">Official Circular</span>
                                    </div>
                                    <h4 className="text-sm font-bold text-white mb-1">{n.title}</h4>
                                    <p className="text-xs text-[#CBD5E1] leading-relaxed">{n.msg || n.message}</p>
                                </div>
                            ))
                        ) : (
                            <div className="bg-[#131B2E] rounded-xl p-8 text-center text-xs text-[#94A3B8]">
                                No circulars or announcements posted yet. Tap "+ Post" above to publish one.
                            </div>
                        )}
                    </div>

                    {/* Post Notice Modal */}
                    {showNoticeModal && (
                        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
                            <div className="w-full max-w-sm bg-[#131B2E] border border-[#1F293D] rounded-[24px] p-5 space-y-4">
                                <h3 className="text-base font-bold text-white">Broadcast Campus Notice</h3>
                                <input
                                    type="text"
                                    value={noticeTitle}
                                    onChange={(e) => setNoticeTitle(e.target.value)}
                                    placeholder="Notice Title"
                                    className="w-full bg-[#0B0F19] border border-[#1F293D] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#4F46E5]"
                                />
                                <textarea
                                    value={noticeMsg}
                                    onChange={(e) => setNoticeMsg(e.target.value)}
                                    placeholder="Notice Message / Circular Details"
                                    rows={4}
                                    className="w-full bg-[#0B0F19] border border-[#1F293D] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#4F46E5]"
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowNoticeModal(false)}
                                        className="h-10 rounded-xl bg-[#1E293B] text-xs font-bold text-[#94A3B8]"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isPostingNotice || !noticeTitle.trim() || !noticeMsg.trim()}
                                        onClick={handlePostNotice}
                                        className="h-10 rounded-xl bg-[#4F46E5] text-xs font-bold text-white shadow-md shadow-indigo-500/20 disabled:opacity-50"
                                    >
                                        {isPostingNotice ? 'Publishing...' : 'Publish'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* SCREEN: STUDENTS */}
            {currentScreen === 'students' && (
                <>
                    {renderTopBar(`Students (${stats.admissions.length})`)}
                    <div className="p-4 space-y-3">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search students..."
                            className="w-full bg-[#131B2E] border border-[#1F293D] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#4F46E5]"
                        />
                        <div className="space-y-2.5">
                            {stats.admissions
                                .filter((a) => !searchQuery.trim() || String(a[3]).toLowerCase().includes(searchQuery.toLowerCase()) || String(a[2]).toLowerCase().includes(searchQuery.toLowerCase()))
                                .slice(0, 40)
                                .map((a, i) => (
                                    <div key={i} className="bg-[#131B2E] border border-[#1F293D] rounded-xl p-3 flex items-center justify-between">
                                        <div>
                                            <h4 className="text-xs font-bold text-white">{a[3] || 'Student'}</h4>
                                            <p className="text-[11px] text-[#818CF8] mt-0.5">{a[2]} • {a[7]}</p>
                                            <p className="text-[10px] text-[#94A3B8]">Batch: {a[8] || 'Regular'} • Campus: {a[6] || activeBranch}</p>
                                        </div>
                                        <span className="text-[10px] font-bold text-[#10B981] bg-[#10B981]/20 px-2 py-0.5 rounded-md">
                                            {a[11] || 'Active'}
                                        </span>
                                    </div>
                                ))}
                        </div>
                    </div>
                </>
            )}

            {/* SCREEN: CHAT */}
            {currentScreen === 'chat' && (
                <div className="flex flex-col h-[calc(100vh-50px)] bg-[#0B0F19]">
                    <div className="bg-[#131B2E] border-b border-[#1F293D] px-4 py-3 flex items-center justify-between">
                        <button type="button" onClick={() => setCurrentScreen('dashboard')} className="text-[#818CF8] font-bold text-sm">
                            ← Back
                        </button>
                        <h3 className="text-sm font-bold text-white">Campus WhatsApp Hub</h3>
                        <div className="w-10"></div>
                    </div>
                    <div className="flex-1 flex items-center justify-center p-6 text-center">
                        <div className="max-w-xs space-y-3">
                            <span className="text-4xl">💬</span>
                            <h4 className="text-sm font-bold text-white">Executive WhatsApp Messenger</h4>
                            <p className="text-xs text-[#94A3B8]">Open individual student conversations, broadcast to batches, or respond to parental inquiries.</p>
                            <a
                                href="/admin/chat"
                                className="inline-block mt-3 px-5 py-2.5 rounded-xl bg-[#10B981] text-xs font-bold text-white shadow-md shadow-emerald-500/20"
                            >
                                Open Full Chat Hub
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
