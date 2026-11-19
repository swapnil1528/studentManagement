import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    getStudentPortalData,
    getStudentFees,
    markStudentAttendance,
    getChatConversations,
    getChatMessages,
    sendChatMessage
} from '../../services/api';
import MobileFeeReminderModal from './MobileFeeReminderModal';

export default function MobileStudentPortal() {
    const { user, logout } = useAuth();
    const studentId = user?.studentId || user?.userId || 'ST-2026-1001';

    const [currentScreen, setCurrentScreen] = useState('dashboard');
    const [isLoading, setIsLoading] = useState(true);

    // Profile data
    const [profile, setProfile] = useState({
        name: user?.name || user?.username || 'Student',
        branch: user?.branch || 'Devichapada',
        batch: user?.batch || '',
        photo: user?.photo || ''
    });

    const [attendanceData, setAttendanceData] = useState({
        perc: 0,
        pres: 0,
        total: 0,
        todayStatus: 'None',
        logs: []
    });

    const [feesData, setFeesData] = useState({
        pendingAmount: 0,
        totalFee: 0,
        totalPaid: 0,
        dueDate: '',
        payments: []
    });
    const [enrollments, setEnrollments] = useState([]);
    const [showFeeReminderModal, setShowFeeReminderModal] = useState(false);
    const [feeReminderDismissed, setFeeReminderDismissed] = useState(false);

    const [courses, setCourses] = useState([]);
    const [notices, setNotices] = useState([]);
    const [results, setResults] = useState([]);

    // Load data concurrently
    const loadData = async () => {
        setIsLoading(true);
        try {
            const [portalRes, feeRes] = await Promise.allSettled([
                getStudentPortalData(studentId),
                getStudentFees(studentId)
            ]);

            if (portalRes.status === 'fulfilled' && portalRes.value) {
                const data = portalRes.value;
                if (data.profile) {
                    setProfile({
                        name: data.profile.name || user?.name || 'Student',
                        branch: data.profile.branch || user?.branch || 'Devichapada',
                        batch: data.profile.batch || '',
                        photo: data.profile.photo || ''
                    });
                }
                if (data.attendance) {
                    setAttendanceData({
                        perc: data.attendance.perc || 0,
                        pres: data.attendance.pres || 0,
                        total: data.attendance.total || 0,
                        todayStatus: data.attendance.todayStatus || 'None',
                        logs: data.attendance.allLogs || data.attendance.logs || []
                    });
                }
                if (Array.isArray(data.courses)) setCourses(data.courses);
                if (Array.isArray(data.notices)) setNotices(data.notices);
                if (Array.isArray(data.results)) setResults(data.results);
            }

            if (feeRes.status === 'fulfilled' && feeRes.value) {
                const fData = feeRes.value;
                const summary = fData.feeSummary || {};
                const total = Number(summary.totalAmount || summary.totalFee || 0);
                const paid = Number(summary.paidAmount || summary.totalPaid || 0);
                const pending = summary.pendingAmount !== undefined ? Number(summary.pendingAmount) : Math.max(0, total - paid);
                const nextDue = summary.nextDueDate || summary.dueDate || '';
                setFeesData({
                    pendingAmount: pending,
                    totalFee: total,
                    totalPaid: paid,
                    dueDate: nextDue,
                    payments: fData.feePayments || []
                });
                if (Array.isArray(fData.enrollments)) {
                    setEnrollments(fData.enrollments);
                }
            }
        } catch (err) {
            console.error('Error loading mobile student data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [studentId]);

    // Check fee reminder popup on fresh load or data update
    useEffect(() => {
        if (isLoading || feeReminderDismissed) return;
        const pending = Number(feesData?.pendingAmount) || 0;
        if (pending <= 0) return;

        const studentKey = studentId || user?.studentId || user?.userId || 'student';
        const dueDateStr = feesData?.dueDate || 'nodate';
        const sessionKey = `fee_reminder_closed_${studentKey}_${dueDateStr}`;
        if (sessionStorage.getItem(sessionKey) === 'true') {
            return;
        }

        let shouldShow = true;
        if (dueDateStr && dueDateStr !== 'nodate') {
            const parts = String(dueDateStr).split(/[-/.]/);
            let d = null;
            if (parts.length === 3) {
                if (parts[0].length === 4) d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                else d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
            } else {
                d = new Date(dueDateStr);
            }
            if (d && !isNaN(d.getTime())) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                d.setHours(0, 0, 0, 0);
                const diffDays = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                if (diffDays > 5) shouldShow = false;
            }
        }

        if (shouldShow) {
            setShowFeeReminderModal(true);
        }
    }, [feesData, studentId, user, feeReminderDismissed, isLoading]);

    const handleCloseFeeReminder = () => {
        setShowFeeReminderModal(false);
        setFeeReminderDismissed(true);
        try {
            const studentKey = studentId || user?.studentId || user?.userId || 'student';
            const dueDateStr = feesData?.dueDate || 'nodate';
            sessionStorage.setItem(`fee_reminder_closed_${studentKey}_${dueDateStr}`, 'true');
        } catch (e) {}
    };

    const handleNavigateToFeesFromReminder = () => {
        handleCloseFeeReminder();
        setCurrentScreen('fees');
    };

    // Top Navigation Bar
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
    // 1. DASHBOARD HOME
    // ==========================================
    if (currentScreen === 'dashboard') {
        const actionCards = [
            {
                id: 'chat',
                icon: '💬',
                title: 'WhatsApp Chat',
                subtitle: 'Groups, 1-on-1 & Faculty Help',
                badge: 'ACTIVE',
                gradient: 'from-[#10B981] to-[#047857]',
                borderColor: 'border-[#10B981]/40',
                onClick: () => setCurrentScreen('chat')
            },
            {
                id: 'attendance',
                icon: '📍',
                title: 'Smart Attendance',
                subtitle: 'Camera selfie & GPS check-in',
                badge: `${attendanceData.perc}%`,
                gradient: 'from-[#06B6D4] to-[#0891B2]',
                borderColor: 'border-[#06B6D4]/40',
                onClick: () => setCurrentScreen('attendance')
            },
            {
                id: 'fees',
                icon: '💳',
                title: 'Fee Ledger',
                subtitle: 'Dues, payments & receipts',
                badge: feesData.pendingAmount > 0 ? 'DUE' : 'CLEARED',
                gradient: 'from-[#34D399] to-[#059669]',
                borderColor: 'border-[#34D399]/40',
                onClick: () => setCurrentScreen('fees')
            },
            {
                id: 'notices',
                icon: '📢',
                title: 'Notice Board',
                subtitle: 'Campus circulars & holidays',
                badge: notices.length > 0 ? 'NEW' : null,
                gradient: 'from-[#F59E0B] to-[#D97706]',
                borderColor: 'border-[#F59E0B]/40',
                onClick: () => setCurrentScreen('notices')
            },
            {
                id: 'results',
                icon: '📊',
                title: 'Exams & Results',
                subtitle: 'Grades, marks & certificates',
                badge: null,
                gradient: 'from-[#8B5CF6] to-[#7C3AED]',
                borderColor: 'border-[#8B5CF6]/40',
                onClick: () => setCurrentScreen('results')
            },
            {
                id: 'courses',
                icon: '📚',
                title: 'Enrolled Courses',
                subtitle: 'Syllabus modules & practicals',
                badge: courses.length > 0 ? `${courses.length} Active` : null,
                gradient: 'from-[#4F46E5] to-[#4338CA]',
                borderColor: 'border-[#4F46E5]/40',
                onClick: () => setCurrentScreen('courses')
            },
            {
                id: 'profile',
                icon: '👤',
                title: 'Digital Student ID',
                subtitle: 'Campus pass & credentials',
                badge: 'VERIFIED',
                gradient: 'from-[#EC4899] to-[#BE185D]',
                borderColor: 'border-[#EC4899]/40',
                onClick: () => setCurrentScreen('profile')
            }
        ];

        return (
            <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col font-sans select-none pb-12">
                {/* Header Bar */}
                <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3" onClick={() => setCurrentScreen('profile')}>
                        <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#4F46E5] to-[#06B6D4] flex items-center justify-center font-black text-white text-lg shadow-md shadow-indigo-500/20">
                            {profile.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-[#F8FAFC] leading-snug truncate max-w-[200px]">
                                {profile.name}
                            </h2>
                            <p className="text-xs text-[#94A3B8]">
                                {studentId} • {profile.branch}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={logout}
                        title="Sign Out"
                        className="w-10 h-10 rounded-full bg-[#131B2E] border border-[#1F293D] flex items-center justify-center text-lg hover:bg-red-500/20 transition-colors"
                    >
                        🚪
                    </button>
                </div>

                {/* Live Stats Strip */}
                <div className="px-4 py-2 grid grid-cols-3 gap-2.5">
                    {/* Attendance */}
                    <div
                        onClick={() => setCurrentScreen('attendance')}
                        className="bg-[#131B2E] border border-[#1F293D] rounded-2xl p-3 cursor-pointer active:scale-95 transition-all"
                    >
                        <span className="block text-[11px] text-[#94A3B8] font-medium">Attendance</span>
                        <span className={`block text-xl font-extrabold mt-1 ${attendanceData.perc >= 75 ? 'text-[#10B981]' : 'text-[#F59E0B]'}`}>
                            {attendanceData.perc}%
                        </span>
                    </div>

                    {/* Fee Dues */}
                    <div
                        onClick={() => {
                            if (feesData.pendingAmount > 0) setShowFeeReminderModal(true);
                            else setCurrentScreen('fees');
                        }}
                        className={`bg-[#131B2E] border rounded-2xl p-3 cursor-pointer active:scale-95 transition-all ${
                            feesData.pendingAmount > 0 ? 'border-[#F43F5E]/40' : 'border-[#1F293D]'
                        }`}
                    >
                        <span className="block text-[11px] text-[#94A3B8] font-medium">Fee Dues</span>
                        <span className={`block text-base font-extrabold mt-1 truncate ${
                            feesData.pendingAmount > 0 ? 'text-[#F43F5E]' : 'text-[#10B981]'
                        }`}>
                            {feesData.pendingAmount > 0 ? `₹${Math.round(feesData.pendingAmount)}` : 'CLEARED'}
                        </span>
                    </div>

                    {/* Batch Timing */}
                    <div className="bg-[#131B2E] border border-[#1F293D] rounded-2xl p-3">
                        <span className="block text-[11px] text-[#94A3B8] font-medium">Batch Timing</span>
                        <span className="block text-sm font-bold text-[#06B6D4] mt-1.5 truncate">
                            {profile.batch || 'Regular'}
                        </span>
                    </div>
                </div>

                {/* 2-Column Action Cards Grid */}
                <div className="px-4 pt-3 pb-8 grid grid-cols-2 gap-3">
                    {actionCards.map((card) => (
                        <div
                            key={card.id}
                            onClick={card.onClick}
                            className={`h-[150px] bg-[#131B2E] border ${card.borderColor} rounded-[22px] p-4 flex flex-col justify-between cursor-pointer active:scale-[0.97] transition-all hover:border-white/30`}
                        >
                            <div className="flex items-start justify-between">
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-xl shadow-md`}>
                                    {card.icon}
                                </div>
                                {card.badge && (
                                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-white/10 text-white border border-white/15">
                                        {card.badge}
                                    </span>
                                )}
                            </div>

                            <div>
                                <h3 className="text-sm font-bold text-white line-clamp-1">{card.title}</h3>
                                <p className="text-[10px] text-[#94A3B8] line-clamp-1 mt-0.5">{card.subtitle}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Mobile Fee Reminder Popup Modal */}
                <MobileFeeReminderModal
                    isOpen={showFeeReminderModal}
                    onClose={handleCloseFeeReminder}
                    onNavigateToFees={handleNavigateToFeesFromReminder}
                    feeSummary={{
                        pendingAmount: feesData.pendingAmount,
                        totalFee: feesData.totalFee,
                        totalPaid: feesData.totalPaid,
                        dueDate: feesData.dueDate,
                    }}
                    enrollments={enrollments}
                    profile={{ ...profile, id: studentId }}
                />
            </div>
        );
    }

    // ==========================================
    // 2. SUB-PAGES
    // ==========================================
    return (
        <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col font-sans select-none pb-12">
            {/* SCREEN: ATTENDANCE */}
            {currentScreen === 'attendance' && (
                <>
                    {renderTopBar('Smart Attendance')}
                    <div className="p-4 space-y-4">
                        {/* Overall Card */}
                        <div className="bg-[#131B2E] border border-[#1F293D] rounded-[22px] p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-xs text-[#94A3B8]">Overall Attendance</span>
                                    <h3 className={`text-3xl font-black mt-0.5 ${attendanceData.perc >= 75 ? 'text-[#10B981]' : 'text-[#F59E0B]'}`}>
                                        {attendanceData.perc}%
                                    </h3>
                                </div>
                                <div className="px-3 py-1.5 rounded-xl bg-[#0B0F19] border border-[#1F293D] text-xs font-bold text-[#38BDF8]">
                                    Today: {attendanceData.todayStatus}
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-[#0B0F19] h-2 rounded-full mt-4 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${attendanceData.perc >= 75 ? 'bg-[#10B981]' : 'bg-[#F59E0B]'}`}
                                    style={{ width: `${Math.min(100, Math.max(0, attendanceData.perc))}%` }}
                                />
                            </div>

                            <div className="flex items-center justify-between text-xs text-[#94A3B8] mt-3">
                                <span>Present: {attendanceData.pres} Days</span>
                                <span>Total: {attendanceData.total} Days</span>
                            </div>
                        </div>

                        {/* Selfie & GPS Check-In Card */}
                        <AttendanceActionBox studentId={studentId} todayStatus={attendanceData.todayStatus} onDone={loadData} />

                        {/* History Logs */}
                        <div>
                            <h4 className="text-sm font-bold text-white mb-2 px-1">Attendance History Logs</h4>
                            <div className="space-y-2">
                                {attendanceData.logs.length === 0 ? (
                                    <div className="bg-[#131B2E] rounded-xl p-6 text-center text-xs text-[#94A3B8]">
                                        No recent attendance records found.
                                    </div>
                                ) : (
                                    attendanceData.logs.slice(0, 15).map((log, idx) => (
                                        <div key={idx} className="bg-[#131B2E] border border-[#1F293D] rounded-xl p-3 flex items-center justify-between">
                                            <div>
                                                <span className={`text-xs font-bold ${String(log.status).toLowerCase().includes('in') || String(log.status).toLowerCase().includes('present') ? 'text-[#10B981]' : 'text-[#F43F5E]'}`}>
                                                    {log.status || 'Present'}
                                                </span>
                                                <p className="text-[11px] text-[#94A3B8] mt-0.5">
                                                    {String(log.time || '').replace('T', ' ').slice(0, 19)}
                                                </p>
                                            </div>
                                            <div className="text-[11px] text-[#06B6D4] bg-[#0B0F19] px-2.5 py-1 rounded-lg border border-[#1F293D]">
                                                📍 {log.distance || '0m'}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* SCREEN: FEES */}
            {currentScreen === 'fees' && (
                <>
                    {renderTopBar('Fee Ledger & Receipts')}
                    <div className="p-4 space-y-4">
                        {/* Pending Banner */}
                        <div className="bg-[#131B2E] border border-[#1F293D] rounded-[22px] p-5">
                            <span className="text-xs text-[#94A3B8]">Pending Balance</span>
                            <h3 className={`text-3xl font-black mt-1 ${feesData.pendingAmount > 0 ? 'text-[#F43F5E]' : 'text-[#10B981]'}`}>
                                ₹{Math.round(feesData.pendingAmount)}
                            </h3>

                            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-[#1F293D] text-xs">
                                <div>
                                    <span className="text-[#94A3B8] block">Total Course Fees</span>
                                    <span className="text-white font-bold text-sm">₹{Math.round(feesData.totalFee)}</span>
                                </div>
                                <div>
                                    <span className="text-[#94A3B8] block">Total Paid</span>
                                    <span className="text-[#10B981] font-bold text-sm">₹{Math.round(feesData.totalPaid)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Payment Receipts */}
                        <div>
                            <h4 className="text-sm font-bold text-white mb-2 px-1">Payment Receipts ({feesData.payments.length})</h4>
                            <div className="space-y-2">
                                {feesData.payments.length === 0 ? (
                                    <div className="bg-[#131B2E] rounded-xl p-6 text-center text-xs text-[#94A3B8]">
                                        No fee payment receipts found.
                                    </div>
                                ) : (
                                    feesData.payments.map((rec, i) => (
                                        <div key={i} className="bg-[#131B2E] border border-[#1F293D] rounded-xl p-3 flex items-center justify-between">
                                            <div>
                                                <span className="text-xs font-bold text-[#818CF8]">{rec.recNo || `REC-${i + 1}`}</span>
                                                <p className="text-[11px] text-[#94A3B8] mt-0.5">{rec.course || 'DCC Course'} • {rec.date || ''}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-sm font-extrabold text-[#10B981]">+₹{Math.round(rec.amount || 0)}</span>
                                                <span className="block text-[10px] text-[#64748B]">{rec.mode || 'Cash'}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* SCREEN: NOTICES */}
            {currentScreen === 'notices' && (
                <>
                    {renderTopBar('Campus Notices')}
                    <div className="p-4 space-y-3">
                        {notices.length === 0 ? (
                            <div className="bg-[#131B2E] rounded-xl p-8 text-center text-xs text-[#94A3B8]">
                                No circulars or announcements posted yet.
                            </div>
                        ) : (
                            notices.map((n, i) => (
                                <div key={i} className="bg-[#131B2E] border border-[#1F293D] rounded-2xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[11px] font-bold text-[#818CF8] bg-[#4F46E5]/20 px-2 py-0.5 rounded-md">
                                            {n.date || 'Announcement'}
                                        </span>
                                        <span className="text-[10px] text-[#64748B]">Official Circular</span>
                                    </div>
                                    <h4 className="text-sm font-bold text-white mb-1">{n.title}</h4>
                                    <p className="text-xs text-[#CBD5E1] leading-relaxed">{n.msg || n.message}</p>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}

            {/* SCREEN: RESULTS */}
            {currentScreen === 'results' && (
                <>
                    {renderTopBar('Exams & Results')}
                    <div className="p-4 space-y-3">
                        {results.length === 0 ? (
                            <div className="bg-[#131B2E] rounded-xl p-8 text-center text-xs text-[#94A3B8]">
                                No exam results published yet.
                            </div>
                        ) : (
                            results.map((r, i) => (
                                <div key={i} className="bg-[#131B2E] border border-[#1F293D] rounded-2xl p-4 flex items-center justify-between">
                                    <div>
                                        <h4 className="text-sm font-bold text-white">{r.exam || 'Terminal Examination'}</h4>
                                        <p className="text-xs text-[#94A3B8] mt-0.5">Score: {r.marks} / {r.total}</p>
                                    </div>
                                    <div className="px-3 py-1 bg-[#10B981]/20 border border-[#10B981]/40 rounded-xl text-xs font-extrabold text-[#10B981]">
                                        Grade: {r.grade || 'A'}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}

            {/* SCREEN: COURSES */}
            {currentScreen === 'courses' && (
                <>
                    {renderTopBar('Enrolled Courses')}
                    <div className="p-4 space-y-3">
                        {courses.length === 0 ? (
                            <div className="bg-[#131B2E] rounded-xl p-8 text-center text-xs text-[#94A3B8]">
                                Enrolled in primary curriculum.
                            </div>
                        ) : (
                            courses.map((c, i) => (
                                <div key={i} className="bg-[#131B2E] border border-[#1F293D] rounded-2xl p-4">
                                    <h4 className="text-sm font-bold text-white">{typeof c === 'string' ? c : (c.course || c.name)}</h4>
                                    <p className="text-xs text-[#94A3B8] mt-1">Batch: {profile.batch || 'Regular'} • Campus: {profile.branch}</p>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}

            {/* SCREEN: DIGITAL ID / PROFILE */}
            {currentScreen === 'profile' && (
                <>
                    {renderTopBar('Digital Student ID')}
                    <div className="p-5 flex flex-col items-center">
                        <div className="w-full max-w-sm bg-gradient-to-b from-[#1E293B] to-[#131B2E] border border-[#334155] rounded-[28px] p-6 text-center shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#4F46E5] via-[#06B6D4] to-[#10B981]" />

                            <div className="w-20 h-20 rounded-full mx-auto bg-gradient-to-tr from-[#4F46E5] to-[#06B6D4] flex items-center justify-center font-black text-white text-3xl shadow-lg mt-2 mb-4">
                                {profile.photo ? (
                                    <img src={profile.photo} alt="Student" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                    profile.name.charAt(0).toUpperCase()
                                )}
                            </div>

                            <h3 className="text-lg font-black text-white">{profile.name}</h3>
                            <p className="text-xs text-[#38BDF8] font-bold mt-0.5">{studentId}</p>

                            <div className="mt-5 pt-4 border-t border-[#334155]/60 text-left space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-[#94A3B8]">Campus Branch</span>
                                    <span className="text-white font-bold">{profile.branch}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[#94A3B8]">Batch Timing</span>
                                    <span className="text-white font-bold">{profile.batch || 'Regular'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[#94A3B8]">Identity Status</span>
                                    <span className="text-[#10B981] font-bold">Verified Student</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* SCREEN: CHAT */}
            {currentScreen === 'chat' && (
                <MobileChatView studentId={studentId} studentName={profile.name} branch={profile.branch} onBack={() => setCurrentScreen('dashboard')} />
            )}
            {/* Mobile Fee Reminder Popup Modal (available across sub-pages) */}
            <MobileFeeReminderModal
                isOpen={showFeeReminderModal}
                onClose={handleCloseFeeReminder}
                onNavigateToFees={handleNavigateToFeesFromReminder}
                feeSummary={{
                    pendingAmount: feesData.pendingAmount,
                    totalFee: feesData.totalFee,
                    totalPaid: feesData.totalPaid,
                    dueDate: feesData.dueDate,
                }}
                enrollments={enrollments}
                profile={{ ...profile, id: studentId }}
            />
        </div>
    );
}

// Attendance Box with Camera
function AttendanceActionBox({ studentId, todayStatus = 'None', onDone }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [msg, setMsg] = useState('');

    const canCheckIn = todayStatus === 'None' || !todayStatus;
    const canCheckOut = todayStatus === 'Check-In';
    const isCompleted = todayStatus === 'Check-Out';

    const handleMark = async (type) => {
        setIsSubmitting(true);
        setMsg('');
        try {
            let lat = 19.076;
            let lng = 72.877;
            if (navigator.geolocation) {
                await new Promise((resolve) => {
                    navigator.geolocation.getCurrentPosition(
                        (pos) => { lat = pos.coords.latitude; lng = pos.coords.longitude; resolve(); },
                        () => resolve(),
                        { timeout: 4000 }
                    );
                });
            }
            const res = await markStudentAttendance(studentId, type, lat, lng, '');
            if (res && res.success !== false) {
                setMsg(`${type} marked successfully!`);
                if (onDone) onDone();
            } else {
                setMsg(res?.error || 'Attendance recorded');
            }
        } catch (err) {
            setMsg(err.message || 'Marked locally');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-[#131B2E] border border-[#1F293D] rounded-[22px] p-5 text-center">
            <h4 className="text-sm font-bold text-white">Daily Check-In & Check-Out</h4>
            <p className="text-xs text-[#94A3B8] mt-1 mb-4">
                {isCompleted
                    ? "Today's attendance completed"
                    : canCheckOut
                        ? "You are checked in. Tap check-out when leaving."
                        : "Tap Check-In to start your session"}
            </p>

            {msg && <p className="text-xs font-bold text-[#10B981] mb-3">{msg}</p>}

            <div className="grid grid-cols-2 gap-3">
                <button
                    type="button"
                    disabled={!canCheckIn || isSubmitting}
                    onClick={() => handleMark('Check-In')}
                    className={`h-12 rounded-xl font-bold text-xs flex items-center justify-center space-x-1 transition-all ${
                        canCheckIn && !isSubmitting
                            ? 'bg-[#10B981] hover:bg-[#059669] text-white active:scale-95 shadow-md shadow-emerald-500/20 cursor-pointer'
                            : 'bg-[#1E293B] text-[#64748B] opacity-60 cursor-not-allowed'
                    }`}
                >
                    <span>{todayStatus === 'Check-In' || isCompleted ? '✓ Checked In' : '✓ Check In'}</span>
                </button>
                <button
                    type="button"
                    disabled={!canCheckOut || isSubmitting}
                    onClick={() => handleMark('Check-Out')}
                    className={`h-12 rounded-xl font-bold text-xs flex items-center justify-center space-x-1 transition-all ${
                        canCheckOut && !isSubmitting
                            ? 'bg-[#DC2626] hover:bg-[#B91C1C] text-white active:scale-95 shadow-md shadow-red-500/20 cursor-pointer'
                            : 'bg-[#1E293B] text-[#64748B] opacity-60 cursor-not-allowed'
                    }`}
                >
                    <span>{isCompleted ? '✓ Checked Out' : '⏱ Check Out'}</span>
                </button>
            </div>
            {isCompleted && (
                <p className="text-[11px] font-bold text-[#10B981] mt-3">
                    ✅ Attendance complete for today. Double check-in is disabled.
                </p>
            )}
        </div>
    );
}

// Mobile Chat View
function MobileChatView({ studentId, studentName, branch, onBack }) {
    const [conversations, setConversations] = useState([]);
    const [activeConv, setActiveConv] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputMsg, setInputMsg] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        const loadConvs = async () => {
            try {
                const res = await getChatConversations(studentId, 'student', studentName, branch);
                if (res && Array.isArray(res.conversations)) {
                    setConversations(res.conversations);
                    if (res.conversations.length > 0) {
                        setActiveConv(res.conversations[0]);
                    }
                }
            } catch (e) {}
        };
        loadConvs();
    }, [studentId, studentName, branch]);

    useEffect(() => {
        if (!activeConv) return;
        const loadMsgs = async () => {
            try {
                const res = await getChatMessages(activeConv.id, studentId);
                if (res && Array.isArray(res.messages)) {
                    setMessages(res.messages);
                }
            } catch (e) {}
        };
        loadMsgs();
    }, [activeConv, studentId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e) => {
        if (e) e.preventDefault();
        if (!inputMsg.trim() || !activeConv || isSending) return;
        const text = inputMsg.trim();
        setInputMsg('');
        setIsSending(true);

        const optimisticMsg = {
            id: 'temp_' + Date.now(),
            text,
            senderId: studentId,
            senderName: studentName,
            timestamp: new Date().toISOString()
        };
        setMessages((prev) => [...prev, optimisticMsg]);

        try {
            await sendChatMessage({
                conversationId: activeConv.id,
                senderId: studentId,
                senderName: studentName,
                text
            });
        } catch (e) {
            console.error(e);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-50px)] bg-[#0B0F19]">
            {/* Top Bar */}
            <div className="bg-[#131B2E] border-b border-[#1F293D] px-4 py-3 flex items-center justify-between">
                <button type="button" onClick={onBack} className="text-[#818CF8] font-bold text-sm">
                    ← Back
                </button>
                <div className="text-center">
                    <h3 className="text-sm font-bold text-white">{activeConv?.title || activeConv?.name || 'Campus WhatsApp'}</h3>
                    <p className="text-[10px] text-[#10B981]">Online</p>
                </div>
                <div className="w-10"></div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-[#94A3B8]">
                        Start your campus conversation...
                    </div>
                ) : (
                    messages.map((m) => {
                        const isMe = m.senderId === studentId || String(m.senderName).toLowerCase() === studentName.toLowerCase();
                        return (
                            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-xs ${
                                    isMe ? 'bg-[#4F46E5] text-white rounded-tr-none' : 'bg-[#1E293B] text-slate-100 rounded-tl-none border border-[#334155]'
                                }`}>
                                    {!isMe && <p className="text-[10px] font-bold text-[#38BDF8] mb-0.5">{m.senderName || 'Faculty'}</p>}
                                    <p className="leading-relaxed">{m.text}</p>
                                    <span className="block text-[9px] text-right mt-1 opacity-60">
                                        {String(m.timestamp || '').slice(11, 16)}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSend} className="p-3 bg-[#131B2E] border-t border-[#1F293D] flex items-center space-x-2">
                <input
                    type="text"
                    value={inputMsg}
                    onChange={(e) => setInputMsg(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-[#0B0F19] border border-[#1F293D] rounded-full px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#4F46E5]"
                />
                <button
                    type="submit"
                    disabled={!inputMsg.trim() || isSending}
                    className="w-10 h-10 rounded-full bg-[#10B981] flex items-center justify-center text-white disabled:opacity-50"
                >
                    ➤
                </button>
            </form>
        </div>
    );
}
