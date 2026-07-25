/**
 * StudentPortal — Gen Z redesign.
 * Tabs: Overview, Attendance, Assignments, Logs, Notices, LMS, Results, Schedule, Grades
 */

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { apiCall, uploadAssignment, getAssignments, getQuizzes, submitQuizResult, getQuizResults } from '../../services/api';
import { showToast } from '../../components/ui/Toast';
import Modal from '../../components/ui/Modal';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardWidget from './components/DashboardWidget';
import AnimatedSkeleton from './components/AnimatedSkeleton';
import ScheduleTab from './components/ScheduleTab';
import GradesTab from './components/GradesTab';
import PortalLayout from '../../components/layout/PortalLayout';
import AttendanceView from '../../components/AttendanceView';
import CameraCapture from '../../components/CameraCapture';

const isMobileDevice = () =>
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || window.innerWidth <= 768;

const TABS = [
    { id: 'overview', label: 'Home', emoji: '🏠' },
    { id: 'attendance', label: 'Attend', emoji: '📍' },
    { id: 'classroom', label: 'Classroom', emoji: '📚' },
    { id: 'quizzes', label: 'Quizzes', emoji: '📝' },
    { id: 'results', label: 'Results', emoji: '🏆' },
    { id: 'schedule', label: 'Schedule', emoji: '🗓️' },
    { id: 'grades', label: 'Grades', emoji: '📊' },
    { id: 'notices', label: 'Notices', emoji: '📢' },
    { id: 'logs', label: 'Logs', emoji: '📋' },
];

// ─── Inline media helpers ─────────────────────────────────────────────────────
function getYouTubeEmbed(url) {
    if (!url) return null;
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
        /youtube\.com\/embed\/([^&\n?#]+)/,
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m) return `https://www.youtube.com/embed/${m[1]}`;
    }
    return null;
}
function getDriveEmbed(url) {
    if (!url) return null;
    const m = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
    return null;
}

const formatSize = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const getFileIcon = (mimeType, fileName) => {
    if (!mimeType && !fileName) return '📄';
    const ext = fileName?.split('.').pop()?.toLowerCase() || '';
    if (mimeType?.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return '🖼️';
    if (mimeType?.includes('pdf') || ext === 'pdf') return '📕';
    if (mimeType?.includes('word') || ['doc', 'docx'].includes(ext)) return '📘';
    if (mimeType?.includes('excel') || ['xls', 'xlsx', 'csv'].includes(ext)) return '📗';
    if (mimeType?.includes('powerpoint') || ['ppt', 'pptx'].includes(ext)) return '📙';
    if (mimeType?.includes('video') || ['mp4', 'avi', 'mkv', 'mov'].includes(ext)) return '🎬';
    if (mimeType?.includes('audio') || ['mp3', 'wav', 'ogg'].includes(ext)) return '🎵';
    if (mimeType?.includes('zip') || ['zip', 'rar', '7z'].includes(ext)) return '📦';
    return '📄';
};

export default function StudentPortal() {
    const { user, logout } = useAuth();
    const { isDark } = useTheme();
    const [activeTab, setActiveTab] = useState('overview');
    const queryClient = useQueryClient();

    const [asnForm, setAsnForm] = useState({ topic: '', course: '', files: [] });
    const [uploading, setUploading] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [attTypePending, setAttTypePending] = useState('');

    // ── LMS / TOC state ────────────────────────────────────────────────────
    const [tocFilter, setTocFilter] = useState(''); // course filter for LMS
    const [expandedMedia, setExpandedMedia] = useState({}); // {index: bool}

    // ── Quiz state ─────────────────────────────────────────────────────────
    const [activeQuiz, setActiveQuiz] = useState(null);     // quiz object being taken
    const [quizStartTime, setQuizStartTime] = useState(null); // timestamp when quiz attempt starts
    const [quizStep, setQuizStep] = useState(0);             // current question index
    const [quizAnswers, setQuizAnswers] = useState({});      // {qIdx: 'a'|'b'|'c'|'d'}
    const [quizResult, setQuizResult] = useState(null);      // {score, total, duration}
    const [submittingQuiz, setSubmittingQuiz] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(null);    // continuous countdown timer seconds
    const [analysisModal, setAnalysisModal] = useState(null); // detailed question analysis object

    const { data: myQuizResultsData, refetch: refetchQuizResults } = useQuery({
        queryKey: ['studentQuizResults', user?.studentId || user?.userId],
        queryFn: () => getQuizResults(user?.studentId || user?.userId),
        enabled: !!user,
    });
    const myQuizResults = myQuizResultsData?.success ? myQuizResultsData.results : [];

    // Continuous Live Countdown Timer
    useEffect(() => {
        if (!activeQuiz || quizResult || secondsLeft === null || secondsLeft <= 0) return;
        const timer = setInterval(() => {
            setSecondsLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    alert('⏰ Time is up! Your quiz answers will now be automatically submitted.');
                    submitQuizAuto();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [activeQuiz, quizResult, secondsLeft]);

    const submitQuizAuto = async () => {
        if (!activeQuiz) return;
        setSubmittingQuiz(true);
        let score = 0;
        activeQuiz.questions.forEach((q, idx) => { if (quizAnswers[idx] === q.correct) score++; });
        const durationMs = Date.now() - (quizStartTime || Date.now());
        const totalSecs = Math.max(1, Math.round(durationMs / 1000));
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        const durationStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

        await submitQuizResult({
            studentId: user?.studentId || user?.userId,
            studentName: profile?.name || user?.username || 'Student',
            quizId: activeQuiz.id,
            quizTitle: activeQuiz.title,
            course: activeQuiz.course,
            score,
            total: activeQuiz.questions.length,
            duration: durationStr,
        });
        setSubmittingQuiz(false);
        setQuizResult({
            score,
            total: activeQuiz.questions.length,
            duration: durationStr,
            questions: activeQuiz.questions,
            answers: { ...quizAnswers },
            quizTitle: activeQuiz.title,
            course: activeQuiz.course,
        });
        if (refetchQuizResults) refetchQuizResults();
    };

    const handlePrintQuizReport = (quizTitle, course, score, total, duration, dateStr, questionsList, userAnswersMap) => {
        const pct = total > 0 ? Math.round((score / total) * 100) : 0;
        const passed = pct >= 40;
        const printWin = window.open('', '_blank', 'width=850,height=900');
        if (!printWin) return alert('Please allow popups to print report.');

        const qRows = (questionsList || []).map((q, i) => {
            const studentAns = userAnswersMap?.[i] || 'Not Answered';
            const correctOpt = q.correct || 'a';
            const isRight = String(studentAns).toLowerCase() === String(correctOpt).toLowerCase();
            const studentText = q.options?.[studentAns] ? `${String(studentAns).toUpperCase()}. ${q.options[studentAns]}` : String(studentAns).toUpperCase();
            const correctText = `${String(correctOpt).toUpperCase()}. ${q.options?.[correctOpt] || ''}`;

            return `
                <tr style="border-bottom:1px solid #e2e8f0;">
                    <td style="padding:10px;font-weight:bold;">Q${i + 1}</td>
                    <td style="padding:10px;">${q.q}</td>
                    <td style="padding:10px;color:${isRight ? '#059669' : '#dc2626'};font-weight:bold;">${studentText}</td>
                    <td style="padding:10px;color:#059669;font-weight:bold;">${correctText}</td>
                    <td style="padding:10px;font-weight:bold;color:${isRight ? '#059669' : '#dc2626'};">${isRight ? '✓ Correct' : '✕ Incorrect'}</td>
                </tr>
            `;
        }).join('');

        printWin.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Quiz Marksheet - ${quizTitle}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; background: #fff; }
                    .header { text-align: center; border-bottom: 2px solid #7c3aed; padding-bottom: 16px; margin-bottom: 24px; }
                    .logo { font-size: 26px; font-weight: 900; color: #7c3aed; }
                    .sub { font-size: 13px; color: #64748b; margin-top: 4px; }
                    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; padding: 16px; border-radius: 12px; margin-bottom: 24px; font-size: 14px; }
                    .badge { padding: 6px 14px; border-radius: 20px; font-weight: 800; font-size: 14px; display: inline-block; }
                    .badge-pass { background: #d1fae5; color: #065f46; }
                    .badge-fail { background: #fee2e2; color: #991b1b; }
                    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
                    th { background: #7c3aed; color: #fff; padding: 10px; text-align: left; }
                    @media print { button { display: none; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">🎓 EduManager Institute Portal</div>
                    <div class="sub">Official Quiz & Exam Performance Marksheet Report</div>
                </div>
                <div class="grid">
                    <div><strong>Student Name:</strong> ${profile?.name || user?.name || 'Student'}</div>
                    <div><strong>Student ID / Roll:</strong> ${user?.studentId || user?.userId || 'N/A'}</div>
                    <div><strong>Course:</strong> ${course}</div>
                    <div><strong>Quiz / Test Name:</strong> ${quizTitle}</div>
                    <div><strong>Score Obtained:</strong> ${score} / ${total} (${pct}%)</div>
                    <div><strong>Attempt Duration:</strong> ⏱️ ${duration || 'N/A'}</div>
                    <div><strong>Date Taken:</strong> ${dateStr || new Date().toLocaleDateString('en-IN')}</div>
                    <div><strong>Result Status:</strong> <span class="badge ${passed ? 'badge-pass' : 'badge-fail'}">${passed ? 'PASSED ✅' : 'NEEDS IMPROVEMENT ⚠️'}</span></div>
                </div>

                <h3 style="color:#7c3aed;margin-top:24px;">Question & Option Analysis</h3>
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Question Text</th>
                            <th>Your Answer</th>
                            <th>Correct Answer</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${qRows || '<tr><td colspan="5" style="padding:10px;text-align:center;">Question detail list unavailable</td></tr>'}
                    </tbody>
                </table>

                <div style="margin-top: 40px; text-align: center; color: #94a3b8; font-size: 12px;">
                    Generated by EduManager Student Portal • ${new Date().toLocaleString('en-IN')}
                </div>
                <script>
                    window.onload = function() { window.print(); };
                </script>
            </body>
            </html>
        `);
        printWin.document.close();
    };

    const { data: settings } = useQuery({
        queryKey: ['settings'],
        queryFn: () => apiCall('getSettings', {}),
        staleTime: 1000 * 60 * 30,
    });

    const mobileAllowed = settings?.success ? settings.mobileCheckIn : true;
    const cameraRequired = settings?.success ? settings.studentCameraCheckIn : false;
    const mobileCheckDone = settings !== undefined;

    const { data: resultBasic, isLoading: loading } = useQuery({
        queryKey: ['studentBasic', user?.studentId || user?.userId],
        queryFn: () => apiCall('getStudentBasic', { id: user?.studentId || user?.userId }),
        enabled: !!user,
    });

    const { data: resultExtra } = useQuery({
        queryKey: ['studentExtra', user?.studentId || user?.userId, resultBasic?.courses],
        queryFn: () => apiCall('getStudentExtra', { id: user?.studentId || user?.userId, cs: resultBasic?.courses || [] }),
        enabled: !!resultBasic?.courses,
    });

    const { data: assignmentsData, isLoading: asnLoading } = useQuery({
        queryKey: ['assignments', user?.studentId || user?.userId],
        queryFn: () => getAssignments(user?.studentId || user?.userId),
        enabled: !!user && activeTab === 'classroom',
    });

    const { data: quizzesData } = useQuery({
        queryKey: ['quizzes', resultBasic?.courses],
        queryFn: () => getQuizzes(resultBasic?.courses || []),
        enabled: !!resultBasic?.courses && (activeTab === 'quizzes' || activeTab === 'classroom'),
        staleTime: 1000 * 60 * 5,
    });
    const quizList = quizzesData?.success ? quizzesData.quizzes : [];

    const data = { ...resultBasic, ...resultExtra };
    const assignmentList = assignmentsData?.success ? assignmentsData.assignments : [];
    const asnTopics = assignmentsData?.success && assignmentsData.topics ? assignmentsData.topics : [];
    const asnCourses = assignmentsData?.success && assignmentsData.courses ? assignmentsData.courses : [];

    const loadData = () => {
        queryClient.invalidateQueries(['studentBasic']);
        queryClient.invalidateQueries(['studentExtra']);
        queryClient.invalidateQueries(['settings']);
    };

    if (loading && !data && !user?.name) return <AnimatedSkeleton />;

    const profile = data?.profile || {
        name: user?.name || 'Student',
        id: user?.studentId || user?.userId,
        photo: user?.photo || '',
        batch: user?.batch || 'Student',
    };
    const att = data?.attendance || {};
    const topics = asnTopics.length > 0 ? asnTopics : (data?.topics || []);
    const studentCourses = asnCourses.length > 0 ? asnCourses : (data?.courses || []);
    const isMobile = isMobileDevice();
    const canMarkAttendance = !isMobile || mobileAllowed;

    const getAttStatus = () => {
        if (att.todayStatus === 'Check-In') return { class: 'status-checkin', label: '✓ Checked In', showOut: true };
        if (att.todayStatus === 'Check-Out') return { class: 'status-checkout', label: '✗ Checked Out', showOut: false };
        return { class: 'status-none', label: '⏳ Not Marked', showOut: false };
    };
    const attStatus = getAttStatus();

    const initiateAttendance = (type) => {
        if (isMobileDevice() && !mobileAllowed) {
            alert('❌ Mobile check-in is disabled. Please use a desktop.');
            return;
        }
        if (cameraRequired) {
            setAttTypePending(type);
            setShowCamera(true);
        } else {
            handleAttendance(type, '');
        }
    };

    const handleAttendance = async (type, photoBase64) => {
        setShowCamera(false);
        showToast(`Processing ${type}...`);
        const result = await apiCall('markStudentAtt', {
            id: user?.studentId || user?.userId,
            type, lat: 0, lng: 0, photo: photoBase64,
            device: isMobileDevice() ? 'mobile' : 'desktop',
        });
        if (result?.success) { showToast(`${type} Successful! ✅`); loadData(); }
        else alert(result?.error || 'Failed');
    };

    const handleFileSelect = (e) => {
        const selected = Array.from(e.target.files);
        setAsnForm(prev => ({ ...prev, files: [...prev.files, ...selected] }));
    };

    const removeFile = (index) => {
        setAsnForm(prev => ({ ...prev, files: prev.files.filter((_, i) => i !== index) }));
    };

    const fileToBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    const handleUploadAssignment = async () => {
        if (!asnForm.topic) { alert('Please select a topic'); return; }
        if (asnForm.files.length === 0) { alert('Please select at least one file'); return; }
        setUploading(true);
        let successCount = 0;
        for (const file of asnForm.files) {
            try {
                const base64 = await fileToBase64(file);
                const result = await uploadAssignment({
                    studentId: user?.studentId || user?.userId,
                    course: asnForm.course, topic: asnForm.topic,
                    fileName: file.name, fileData: base64, mimeType: file.type,
                });
                if (result?.success) successCount++;
            } catch (err) { console.error('Upload error:', err); }
        }
        if (successCount > 0) {
            showToast(`${successCount} file(s) uploaded! 🎉`);
            setAsnForm({ topic: '', course: '', files: [] });
            queryClient.invalidateQueries(['assignments']);
        } else alert('Upload failed. Please try again.');
        setUploading(false);
    };

    // ─── Shared styles ───
    const cardS = {
        background: isDark ? 'rgba(26,22,48,0.85)' : '#ffffff',
        borderRadius: 20,
        border: `1.5px solid ${isDark ? 'rgba(139,92,246,0.15)' : 'rgba(124,58,237,0.08)'}`,
        boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 2px 16px rgba(0,0,0,0.05)',
        padding: '20px',
        marginBottom: 16,
    };

    const sectionTitle = (emoji, text) => (
        <h3 style={{
            fontSize: 16, fontWeight: 800, margin: '0 0 16px',
            color: isDark ? '#ede9fe' : '#1a1035',
            display: 'flex', alignItems: 'center', gap: 8,
        }}>
            {emoji} {text}
        </h3>
    );

    const emptyState = (emoji, title, sub) => (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>{emoji}</div>
            <div style={{ fontWeight: 800, fontSize: 16, color: isDark ? '#ede9fe' : '#1a1035', marginBottom: 6 }}>{title}</div>
            <div style={{ fontSize: 13, color: '#94a3b8' }}>{sub}</div>
        </div>
    );

    return (
        <PortalLayout
            name={profile.name}
            id={profile.id}
            role={profile.batch || 'Student'}
            photo={profile.photo}
            tabs={TABS}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            hasFace={true}
            onFaceReg={() => { }}
            onLogout={logout}
        >
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                >
                    {/* ── Overview ── */}
                    {activeTab === 'overview' && (
                        <DashboardWidget
                            att={att}
                            profile={profile}
                            assignmentsData={assignmentsData}
                            initiateAttendance={initiateAttendance}
                            canMarkAttendance={canMarkAttendance}
                            attStatus={attStatus}
                            cameraRequired={cameraRequired}
                            notices={data?.notices || []}
                            isDark={isDark}
                        />
                    )}

                    {/* ── Attendance ── */}
                    {activeTab === 'attendance' && (
                        <div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                                {/* Mark Card */}
                                <div style={cardS}>
                                    {sectionTitle('📍', 'Mark Attendance')}

                                    {isMobile && !mobileAllowed && mobileCheckDone && (
                                        <div style={{
                                            background: '#fff1f2', border: '1px solid #fecdd3',
                                            borderRadius: 12, padding: '10px 14px', marginBottom: 14,
                                            fontSize: 13, color: '#be123c', fontWeight: 600,
                                        }}>
                                            🖥️ Desktop only — mobile check-in is disabled.
                                        </div>
                                    )}

                                    {isMobile && mobileAllowed && mobileCheckDone && (
                                        <div style={{
                                            background: '#f0fdf4', border: '1px solid #bbf7d0',
                                            borderRadius: 12, padding: '8px 12px', marginBottom: 12,
                                            fontSize: 12, color: '#15803d', fontWeight: 600,
                                        }}>
                                            📱 Mobile check-in enabled ✓
                                        </div>
                                    )}

                                    <div style={{ textAlign: 'center', marginBottom: 16 }}>
                                        <span className={`status-indicator ${attStatus.class}`}>
                                            {attStatus.label}
                                        </span>
                                    </div>

                                    {att.lastCheckInTime && (
                                        <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginBottom: 14 }}>
                                            Last: {new Date(att.lastCheckInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    )}

                                    {attStatus.showOut ? (
                                        <button
                                            className="gz-checkin-btn gz-btn-out"
                                            onClick={() => initiateAttendance('Check-Out')}
                                            disabled={!canMarkAttendance}
                                        >
                                            👋 Check Out {cameraRequired ? '📷' : ''}
                                        </button>
                                    ) : (
                                        <button
                                            className="gz-checkin-btn gz-btn-in"
                                            onClick={() => initiateAttendance('Check-In')}
                                            disabled={!canMarkAttendance || att.todayStatus === 'Check-Out'}
                                        >
                                            {att.todayStatus === 'Check-Out' ? '✅ Done for Today' : `⚡ Check In ${cameraRequired ? '📷' : ''}`}
                                        </button>
                                    )}
                                </div>

                                {/* Stats Card */}
                                <div style={cardS}>
                                    {sectionTitle('📊', 'Stats')}
                                    <div style={{ marginBottom: 12 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                            <span style={{ fontSize: 13, color: '#94a3b8' }}>Attendance Rate</span>
                                            <span style={{ fontSize: 13, fontWeight: 800, color: '#7c3aed' }}>{att.perc || 0}%</span>
                                        </div>
                                        <div className="progress-bar">
                                            <motion.div
                                                className="progress-fill"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${att.perc || 0}%` }}
                                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                            />
                                        </div>
                                    </div>
                                    {[
                                        { label: 'Present Days', val: att.pres || 0, c: '#10b981' },
                                        { label: 'Total Days', val: att.total || 0, c: '#7c3aed' },
                                        { label: 'Absent Days', val: (att.total || 0) - (att.pres || 0), c: '#f43f5e' },
                                    ].map((s, i) => (
                                        <div key={i} style={{
                                            display: 'flex', justifyContent: 'space-between',
                                            padding: '8px 0',
                                            borderBottom: i < 2 ? `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'}` : 'none',
                                        }}>
                                            <span style={{ fontSize: 13, color: '#94a3b8' }}>{s.label}</span>
                                            <span style={{ fontSize: 13, fontWeight: 800, color: s.c }}>{s.val}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Attendance History */}
                            <div style={cardS}>
                                {sectionTitle('📋', 'Attendance History')}
                                <AttendanceView logs={att.allLogs || att.logs || []} type="student" />
                            </div>
                        </div>
                    )}

                    {/* Camera Modal */}
                    {showCamera && (
                        <Modal title={`📷 Secure ${attTypePending}`} isOpen={showCamera} onClose={() => setShowCamera(false)}>
                            <div style={{ textAlign: 'center', marginBottom: 14, fontSize: 13, color: '#94a3b8' }}>
                                Look at the camera for your attendance photo.
                            </div>
                            <CameraCapture
                                onCapture={(b64) => handleAttendance(attTypePending, b64)}
                                onCancel={() => setShowCamera(false)}
                            />
                        </Modal>
                    )}

                    {/* ── CLASSROOM MODULE ── */}
                    {activeTab === 'classroom' && (
                        <div>
                            {/* LMS Materials with TOC */}
                            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                                {/* TOC Sidebar */}
                                {data?.lms && data.lms.length > 0 && (() => {
                                    const courses = [...new Set((data.lms || []).map(l => l.course || 'General'))];
                                    return (
                                        <div style={{ width: 160, flexShrink: 0, display: courses.length > 1 ? 'block' : 'none' }}>
                                            <div style={{ ...cardS, padding: 14, position: 'sticky', top: 16 }}>
                                                <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>📋 Topics</div>
                                                <button
                                                    onClick={() => setTocFilter('')}
                                                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: tocFilter === '' ? 800 : 600, background: tocFilter === '' ? (isDark ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.1)') : 'transparent', color: isDark ? '#ede9fe' : '#1a1035', border: 'none', cursor: 'pointer', marginBottom: 2 }}
                                                >All</button>
                                                {courses.map(c => (
                                                    <button key={c}
                                                        onClick={() => setTocFilter(c)}
                                                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: tocFilter === c ? 800 : 600, background: tocFilter === c ? (isDark ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.1)') : 'transparent', color: isDark ? '#ede9fe' : '#1a1035', border: 'none', cursor: 'pointer', marginBottom: 2 }}
                                                    >{c}</button>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Materials List */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={cardS}>
                                        {sectionTitle('📚', 'Class Materials')}
                                        {data?.lms && data.lms.length > 0 ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                {data.lms
                                                    .filter(l => !tocFilter || (l.course || 'General') === tocFilter)
                                                    .map((l, i) => {
                                                        const ytEmbed = getYouTubeEmbed(l.link);
                                                        const driveEmbed = getDriveEmbed(l.link);
                                                        const embedUrl = ytEmbed || driveEmbed;
                                                        const isVideo = embedUrl || l.type?.toLowerCase().includes('video');
                                                        const isPdf = l.type?.toLowerCase().includes('pdf');
                                                        const isOpen = !!expandedMedia[i];
                                                        return (
                                                            <motion.div
                                                                key={i}
                                                                initial={{ opacity: 0, scale: 0.97 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                transition={{ delay: i * 0.04 }}
                                                                style={{
                                                                    padding: '14px 16px', borderRadius: 16,
                                                                    background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
                                                                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}`,
                                                                }}
                                                            >
                                                                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                                                    <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(6,182,212,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                                                                        {l.type?.toLowerCase().includes('video') ? '🎬' : l.type?.toLowerCase().includes('pdf') ? '📕' : l.type?.toLowerCase().includes('notes') ? '📒' : '📌'}
                                                                    </div>
                                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                                        <div style={{ fontWeight: 800, fontSize: 14, color: isDark ? '#ede9fe' : '#1e293b', marginBottom: 2 }}>{l.title}</div>
                                                                        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>
                                                                            {l.type}{l.course && <span style={{ marginLeft: 6, background: 'rgba(124,58,237,0.08)', padding: '1px 7px', borderRadius: 20, color: '#7c3aed' }}>{l.course}</span>}
                                                                            {l.desc && <span style={{ fontWeight: 'normal', color: '#94a3b8' }}> — {l.desc}</span>}
                                                                        </div>
                                                                        {/* Inline play / open buttons */}
                                                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                                            {(isVideo || isPdf) && embedUrl && (
                                                                                <button
                                                                                    onClick={() => setExpandedMedia(prev => ({ ...prev, [i]: !prev[i] }))}
                                                                                    style={{ fontSize: 11, fontWeight: 800, padding: '5px 12px', borderRadius: 8, background: isOpen ? '#7c3aed' : 'rgba(124,58,237,0.1)', color: isOpen ? '#fff' : '#7c3aed', border: 'none', cursor: 'pointer' }}
                                                                                >
                                                                                    {isOpen ? '▼ Hide' : (isVideo ? '▶ Play Video' : '👁 Preview')}
                                                                                </button>
                                                                            )}
                                                                            <a
                                                                                href={l.link} target="_blank" rel="noopener noreferrer"
                                                                                style={{ fontSize: 11, fontWeight: 800, padding: '5px 12px', borderRadius: 8, background: 'rgba(16,185,129,0.1)', color: '#059669', textDecoration: 'none' }}
                                                                            >Open ↗</a>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {/* Embedded player */}
                                                                {isOpen && embedUrl && (
                                                                    <div style={{ marginTop: 12, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(124,58,237,0.15)' }}>
                                                                        <iframe
                                                                            src={embedUrl}
                                                                            width="100%" height="300"
                                                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                            allowFullScreen
                                                                            style={{ display: 'block', border: 'none' }}
                                                                            title={l.title}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </motion.div>
                                                        );
                                                    })}
                                            </div>
                                        ) : emptyState('📚', 'No classwork yet', 'Learning materials will appear here when your teacher publishes them.')}
                                    </div>
                                </div>
                            </div>

                            {/* Assignment Upload */}
                            <div style={cardS}>
                                {sectionTitle('📤', 'Submit Assignment')}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                                    <div>
                                        <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Course</label>
                                        <select className="inp" value={asnForm.course} style={isDark ? { background: 'rgba(255,255,255,0.04)', color: '#e2e8f0', borderColor: 'rgba(139,92,246,0.2)' } : {}} onChange={(e) => setAsnForm(p => ({ ...p, course: e.target.value, topic: '' }))}>
                                            <option value="">Select Course</option>
                                            {(data?.courses || []).map((c) => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Topic</label>
                                        <select className="inp" value={asnForm.topic} style={isDark ? { background: 'rgba(255,255,255,0.04)', color: '#e2e8f0', borderColor: 'rgba(139,92,246,0.2)' } : {}} onChange={(e) => setAsnForm(p => ({ ...p, topic: e.target.value }))}>
                                            <option value="">Select Topic</option>
                                            {topics.filter(t => !asnForm.course || t.course.toLowerCase() === asnForm.course.toLowerCase()).map((t, i) => <option key={i} value={t.topic}>{t.topic}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div style={{ border: `2px dashed ${isDark ? 'rgba(139,92,246,0.3)' : 'rgba(124,58,237,0.2)'}`, borderRadius: 16, padding: '24px', textAlign: 'center', marginBottom: 14, background: isDark ? 'rgba(124,58,237,0.04)' : 'rgba(124,58,237,0.02)', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? 'rgba(124,58,237,0.08)' : 'rgba(124,58,237,0.05)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = isDark ? 'rgba(124,58,237,0.04)' : 'rgba(124,58,237,0.02)'; }} onClick={() => document.getElementById('asnFileInput').click()}>
                                    <input id="asnFileInput" type="file" multiple onChange={handleFileSelect} style={{ display: 'none' }} />
                                    <div style={{ fontSize: 32, marginBottom: 10 }}>☁️</div>
                                    <div style={{ fontSize: 14, fontWeight: 800, color: isDark ? '#c4b5fd' : '#7c3aed' }}>Click to Upload Work</div>
                                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>PDF, Images, Zip files supported</div>
                                </div>
                                {asnForm.files.length > 0 && (<div style={{ background: isDark ? 'rgba(124,58,237,0.08)' : 'rgba(124,58,237,0.04)', borderRadius: 14, padding: '12px 14px', marginBottom: 14 }}><div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase' }}>{asnForm.files.length} file(s) ready</div>{asnForm.files.map((f, i) => (<div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', marginBottom: 6, borderRadius: 10, background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'}`, fontSize: 13 }}><span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span>{getFileIcon(f.type, f.name)}</span><span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isDark ? '#e2e8f0' : '#1a1035', fontWeight: 600 }}>{f.name}</span><span style={{ fontSize: 10, color: '#94a3b8' }}>{formatSize(f.size)}</span></span><button onClick={() => removeFile(i)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#f43f5e', fontWeight: 700 }}>✕</button></div>))}</div>)}
                                <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={handleUploadAssignment} disabled={uploading || asnForm.files.length === 0} style={{ width: '100%', padding: '14px', borderRadius: 16, border: 'none', background: uploading || asnForm.files.length === 0 ? '#94a3b8' : 'linear-gradient(135deg, #7c3aed, #06b6d4)', color: 'white', fontSize: 14, fontWeight: 800, cursor: uploading || asnForm.files.length === 0 ? 'not-allowed' : 'pointer', boxShadow: asnForm.files.length > 0 ? '0 6px 20px rgba(124,58,237,0.3)' : 'none' }}>
                                    {uploading ? '⏳ Submitting to Teacher...' : `📤 Hand In${asnForm.files.length > 0 ? ` (${asnForm.files.length})` : ''}`}
                                </motion.button>
                            </div>

                            {/* Submissions History */}
                            <div style={cardS}>
                                {sectionTitle('📋', 'My Submissions')}
                                {asnLoading ? (<div style={{ textAlign: 'center', padding: '30px 0' }}><div style={{ width: 32, height: 32, margin: '0 auto 12px', border: '3px solid rgba(124,58,237,0.2)', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /></div>) : assignmentList.length > 0 ? (<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{assignmentList.map((a, i) => (<div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, background: isDark ? 'rgba(255,255,255,0.04)' : '#f8f7ff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(124,58,237,0.07)'}` }}><div style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(6,182,212,0.15))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{getFileIcon(a.mimeType, a.fileName)}</div><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 800, fontSize: 13, color: isDark ? '#ede9fe' : '#1a1035', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.topic || '—'}</div><div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}><span style={{ fontSize: 10, color: '#94a3b8' }}>{a.date ? new Date(a.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}</span>{a.grade && <span style={{ fontSize: 10, fontWeight: 800, background: 'rgba(16,185,129,0.12)', color: '#059669', padding: '1px 8px', borderRadius: 20 }}>Grade: {a.grade}</span>}</div></div><a href={a.fileUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, fontWeight: 800, padding: '6px 12px', borderRadius: 10, background: 'rgba(16, 185, 129, 0.1)', color: '#059669', textDecoration: 'none' }}>View</a></div>))}</div>) : emptyState('📎', 'No submissions yet', 'Your assignments will appear here.')}
                            </div>
                        </div>
                    )}

                    {/* ── QUIZZES TAB ── */}
                    {activeTab === 'quizzes' && (
                        <div>
                            {/* Quiz Detailed Analysis Modal */}
                            {analysisModal && (
                                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ background: isDark ? '#1a1035' : '#fff', borderRadius: 24, padding: 30, maxWidth: 640, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`, paddingBottom: 12 }}>
                                            <div>
                                                <div style={{ fontSize: 20, fontWeight: 900, color: isDark ? '#ede9fe' : '#1a1035' }}>📊 Detailed Quiz Analysis</div>
                                                <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>{analysisModal.quizTitle} • Score: {analysisModal.score}/{analysisModal.total}</div>
                                            </div>
                                            <button onClick={() => setAnalysisModal(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: isDark ? '#ede9fe' : '#64748b' }}>✕</button>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                            {(analysisModal.questions || []).map((q, idx) => {
                                                const userOpt = analysisModal.answers?.[idx];
                                                const correctOpt = q.correct || 'a';
                                                const isCorrect = String(userOpt).toLowerCase() === String(correctOpt).toLowerCase();

                                                return (
                                                    <div key={idx} style={{ padding: 16, borderRadius: 16, background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', border: `1px solid ${isCorrect ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'}` }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                                            <div style={{ fontWeight: 800, fontSize: 14, color: isDark ? '#ede9fe' : '#1e293b' }}>
                                                                Q{idx + 1}. {q.q}
                                                            </div>
                                                            <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 12, background: isCorrect ? '#d1fae5' : '#fee2e2', color: isCorrect ? '#065f46' : '#991b1b', whiteSpace: 'nowrap' }}>
                                                                {isCorrect ? '✓ Correct (+1)' : '✕ Incorrect'}
                                                            </span>
                                                        </div>

                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                                            {['a', 'b', 'c', 'd'].filter(opt => q.options?.[opt]).map(opt => {
                                                                const isChosen = String(userOpt).toLowerCase() === opt;
                                                                const isRightOpt = String(correctOpt).toLowerCase() === opt;
                                                                let bg = isDark ? 'rgba(255,255,255,0.05)' : '#fff';
                                                                let border = isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0';
                                                                let color = isDark ? '#94a3b8' : '#64748b';

                                                                if (isRightOpt) {
                                                                    bg = '#d1fae5';
                                                                    border = '#10b981';
                                                                    color = '#065f46';
                                                                } else if (isChosen && !isRightOpt) {
                                                                    bg = '#fee2e2';
                                                                    border = '#f43f5e';
                                                                    color = '#991b1b';
                                                                }

                                                                return (
                                                                    <div key={opt} style={{ padding: '8px 12px', borderRadius: 10, border: `1px solid ${border}`, background: bg, color, fontSize: 12, fontWeight: (isChosen || isRightOpt) ? 800 : 500 }}>
                                                                        <span style={{ textTransform: 'uppercase', marginRight: 6 }}>{opt}.</span>
                                                                        {q.options[opt]}
                                                                        {isRightOpt && <span style={{ marginLeft: 6 }}>✓ Correct</span>}
                                                                        {isChosen && !isRightOpt && <span style={{ marginLeft: 6 }}>✕ Your Choice</span>}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
                                            <button
                                                onClick={() => handlePrintQuizReport(analysisModal.quizTitle, analysisModal.course, analysisModal.score, analysisModal.total, analysisModal.duration, analysisModal.date, analysisModal.questions, analysisModal.answers)}
                                                style={{ flex: 1, padding: 12, borderRadius: 14, border: 'none', background: '#7c3aed', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
                                            >
                                                𖤂 Print Marksheet Report
                                            </button>
                                            <button
                                                onClick={() => setAnalysisModal(null)}
                                                style={{ padding: '12px 24px', borderRadius: 14, border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`, background: 'transparent', color: isDark ? '#ede9fe' : '#64748b', fontWeight: 700, cursor: 'pointer' }}
                                            >
                                                Close
                                            </button>
                                        </div>
                                    </motion.div>
                                </div>
                            )}

                            {/* Quiz Result Modal */}
                            {quizResult && (
                                <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ background: isDark ? '#1a1035' : '#fff', borderRadius: 24, padding: 40, textAlign: 'center', maxWidth: 400, width: '100%' }}>
                                        <div style={{ fontSize: 64, marginBottom: 16 }}>{quizResult.score / quizResult.total >= 0.6 ? '🎉' : quizResult.score / quizResult.total >= 0.4 ? '👍' : '😔'}</div>
                                        <div style={{ fontSize: 28, fontWeight: 900, color: isDark ? '#ede9fe' : '#1a1035', marginBottom: 8 }}>Quiz Complete!</div>
                                        <div style={{ fontSize: 48, fontWeight: 900, color: '#7c3aed', marginBottom: 4 }}>{quizResult.score}/{quizResult.total}</div>
                                        <div style={{ fontSize: 16, color: '#94a3b8', marginBottom: 12 }}>{Math.round((quizResult.score / quizResult.total) * 100)}% Score</div>
                                        {quizResult.duration && (
                                            <div style={{ fontSize: 13, fontWeight: 700, color: '#06b6d4', marginBottom: 20, background: 'rgba(6,182,212,0.1)', padding: '6px 14px', borderRadius: 20, display: 'inline-block' }}>
                                                ⏱️ Time Taken: {quizResult.duration}
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            {quizResult.questions && (
                                                <button
                                                    onClick={() => setAnalysisModal({
                                                        quizTitle: quizResult.quizTitle || activeQuiz?.title,
                                                        course: quizResult.course || activeQuiz?.course,
                                                        score: quizResult.score,
                                                        total: quizResult.total,
                                                        duration: quizResult.duration,
                                                        questions: quizResult.questions,
                                                        answers: quizResult.answers,
                                                    })}
                                                    style={{ padding: '12px 20px', borderRadius: 14, border: 'none', background: 'rgba(124,58,237,0.12)', color: '#7c3aed', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}
                                                >
                                                    📊 View Detailed Analysis
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handlePrintQuizReport(
                                                    quizResult.quizTitle || activeQuiz?.title,
                                                    quizResult.course || activeQuiz?.course,
                                                    quizResult.score,
                                                    quizResult.total,
                                                    quizResult.duration,
                                                    new Date().toLocaleDateString('en-IN'),
                                                    quizResult.questions || activeQuiz?.questions,
                                                    quizResult.answers || quizAnswers
                                                )}
                                                style={{ padding: '12px 20px', borderRadius: 14, border: '1px solid rgba(6,182,212,0.3)', background: 'rgba(6,182,212,0.08)', color: '#0891b2', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}
                                            >
                                                🖨️ Print Marksheet Report
                                            </button>
                                            <button onClick={() => { setQuizResult(null); setActiveQuiz(null); setQuizAnswers({}); setQuizStep(0); setSecondsLeft(null); }} style={{ padding: '14px 40px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', marginTop: 6 }}>Done ✓</button>
                                        </div>
                                    </motion.div>
                                </div>
                            )}

                            {/* Quiz Player */}
                            {activeQuiz && !quizResult && (() => {
                                const question = activeQuiz.questions[quizStep];
                                const mins = secondsLeft !== null ? Math.floor(secondsLeft / 60) : 0;
                                const secs = secondsLeft !== null ? secondsLeft % 60 : 0;
                                const timeStr = secondsLeft !== null ? `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}` : null;
                                const isWarning = secondsLeft !== null && secondsLeft < 120;

                                return (
                                    <div style={cardS}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                            <div style={{ fontWeight: 800, fontSize: 16, color: isDark ? '#ede9fe' : '#1a1035' }}>📝 {activeQuiz.title}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                {timeStr && (
                                                    <span style={{
                                                        fontSize: 13, fontWeight: 900,
                                                        color: isWarning ? '#ef4444' : '#0891b2',
                                                        background: isWarning ? 'rgba(239,68,68,0.12)' : 'rgba(8,145,178,0.1)',
                                                        border: `1px solid ${isWarning ? 'rgba(239,68,68,0.3)' : 'rgba(8,145,178,0.2)'}`,
                                                        padding: '4px 12px', borderRadius: 20,
                                                    }}>
                                                        ⏱️ Time Left: {timeStr}
                                                    </span>
                                                )}
                                                <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Q{quizStep + 1} of {activeQuiz.questions.length}</div>
                                            </div>
                                        </div>
                                        {/* Progress Bar */}
                                        <div style={{ height: 6, borderRadius: 3, background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9', marginBottom: 24, overflow: 'hidden' }}>
                                            <motion.div animate={{ width: `${((quizStep + 1) / activeQuiz.questions.length) * 100}%` }} style={{ height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, #7c3aed, #06b6d4)' }} />
                                        </div>
                                        <div style={{ fontWeight: 700, fontSize: 16, color: isDark ? '#ede9fe' : '#1a1035', marginBottom: 20, lineHeight: 1.5 }}>{question?.q}</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                                            {['a', 'b', 'c', 'd'].filter(opt => question?.options?.[opt]).map(opt => (
                                                <button key={opt}
                                                    onClick={() => setQuizAnswers(prev => ({ ...prev, [quizStep]: opt }))}
                                                    style={{ padding: '14px 18px', borderRadius: 14, border: `2px solid ${quizAnswers[quizStep] === opt ? '#7c3aed' : isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`, background: quizAnswers[quizStep] === opt ? (isDark ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.06)') : 'transparent', color: isDark ? '#ede9fe' : '#1a1035', fontWeight: quizAnswers[quizStep] === opt ? 800 : 600, fontSize: 14, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
                                                >
                                                    <span style={{ fontWeight: 900, marginRight: 10, color: '#7c3aed', textTransform: 'uppercase' }}>{opt}.</span> {question.options[opt]}
                                                </button>
                                            ))}
                                        </div>
                                        <div style={{ display: 'flex', gap: 12 }}>
                                            {quizStep > 0 && <button onClick={() => setQuizStep(s => s - 1)} style={{ flex: 1, padding: 14, borderRadius: 14, border: `2px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`, background: 'transparent', color: isDark ? '#ede9fe' : '#1a1035', fontWeight: 700, cursor: 'pointer' }}>← Back</button>}
                                            {quizStep < activeQuiz.questions.length - 1 ? (
                                                <button onClick={() => { if (!quizAnswers[quizStep]) { alert('Please select an answer'); return; } setQuizStep(s => s + 1); }} style={{ flex: 2, padding: 14, borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>Next →</button>
                                            ) : (
                                                <button disabled={submittingQuiz} onClick={async () => {
                                                    if (!quizAnswers[quizStep]) { alert('Please select an answer'); return; }
                                                    setSubmittingQuiz(true);
                                                    let score = 0;
                                                    activeQuiz.questions.forEach((q, idx) => { if (quizAnswers[idx] === q.correct) score++; });

                                                    // Calculate attempt duration
                                                    const durationMs = Date.now() - (quizStartTime || Date.now());
                                                    const totalSecs = Math.max(1, Math.round(durationMs / 1000));
                                                    const mins = Math.floor(totalSecs / 60);
                                                    const secs = totalSecs % 60;
                                                    const durationStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

                                                    await submitQuizResult({
                                                        studentId: user?.studentId || user?.userId,
                                                        studentName: profile?.name || user?.username || 'Student',
                                                        quizId: activeQuiz.id,
                                                        quizTitle: activeQuiz.title,
                                                        course: activeQuiz.course,
                                                        score,
                                                        total: activeQuiz.questions.length,
                                                        duration: durationStr,
                                                    });
                                                    setSubmittingQuiz(false);
                                                    setQuizResult({
                                                        score,
                                                        total: activeQuiz.questions.length,
                                                        duration: durationStr,
                                                        questions: activeQuiz.questions,
                                                        answers: { ...quizAnswers },
                                                        quizTitle: activeQuiz.title,
                                                        course: activeQuiz.course,
                                                    });
                                                    if (refetchQuizResults) refetchQuizResults();
                                                }} style={{ flex: 2, padding: 14, borderRadius: 14, border: 'none', background: submittingQuiz ? '#94a3b8' : 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
                                                    {submittingQuiz ? '⏳ Submitting...' : '✅ Submit Quiz'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Available Quizzes List */}
                            {!activeQuiz && (
                                <div style={cardS}>
                                    {sectionTitle('📝', 'Available Quizzes & Exams')}
                                    {quizList.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                            {quizList.map((qz, i) => {
                                                const attempt = myQuizResults.find(r => String(r.quizId) === String(qz.id));
                                                return (
                                                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderRadius: 16, background: isDark ? 'rgba(255,255,255,0.04)' : '#f8f7ff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(124,58,237,0.08)'}` }}>
                                                        <div>
                                                            <div style={{ fontWeight: 800, fontSize: 15, color: isDark ? '#ede9fe' : '#1a1035', marginBottom: 4 }}>📋 {qz.title}</div>
                                                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                                                <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(124,58,237,0.1)', color: '#7c3aed', padding: '2px 9px', borderRadius: 20 }}>{qz.course}</span>
                                                                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{qz.questions?.length || 0} Questions</span>
                                                                {qz.timeLimit > 0 && <span style={{ fontSize: 11, color: '#0891b2', fontWeight: 700 }}>⏱️ {qz.timeLimit} Mins</span>}
                                                                {qz.dueDate && <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>Due: {qz.dueDate}</span>}
                                                                {attempt && (
                                                                    <span style={{ fontSize: 11, fontWeight: 800, background: 'rgba(16,185,129,0.12)', color: '#059669', padding: '2px 9px', borderRadius: 20 }}>
                                                                        Score: {attempt.score}/{attempt.total} ({attempt.percentage}%) {attempt.duration ? `• ⏱️ ${attempt.duration}` : ''}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                setActiveQuiz(qz);
                                                                setQuizStep(0);
                                                                setQuizAnswers({});
                                                                setQuizStartTime(Date.now());
                                                                const limitMins = Number(qz.timeLimit) || 0;
                                                                setSecondsLeft(limitMins > 0 ? limitMins * 60 : null);
                                                            }}
                                                            style={{ padding: '10px 20px', borderRadius: 12, border: 'none', background: attempt ? 'rgba(124,58,237,0.15)' : 'linear-gradient(135deg, #7c3aed, #06b6d4)', color: attempt ? '#7c3aed' : '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                                                        >{attempt ? 'Retake Quiz ↻' : 'Start Quiz →'}</button>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    ) : emptyState('📝', 'No quizzes yet', 'Your teacher will publish quizzes here. Check back soon!')}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Results ── */}
                    {activeTab === 'results' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            {/* Quiz Results Section */}
                            <div style={cardS}>
                                {sectionTitle('📝', 'Quiz / Test Results')}
                                {myQuizResults && myQuizResults.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {myQuizResults.map((r, i) => {
                                            const pct = Number(r.percentage) || 0;
                                            const passed = pct >= 40;
                                            return (
                                                <motion.div
                                                    key={i}
                                                    initial={{ opacity: 0, x: -12 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: i * 0.06 }}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                        padding: '14px 16px', borderRadius: 14,
                                                        background: isDark ? 'rgba(255,255,255,0.04)' : '#f8f7ff',
                                                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(124,58,237,0.07)'}`,
                                                    }}
                                                >
                                                    <div>
                                                        <div style={{ fontWeight: 800, fontSize: 14, color: isDark ? '#ede9fe' : '#1a1035' }}>
                                                            {r.quizTitle}
                                                        </div>
                                                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, display: 'flex', gap: 8, alignItems: 'center' }}>
                                                            <span>{r.course}</span>
                                                            {r.duration && <span style={{ color: '#06b6d4', fontWeight: 700 }}>⏱️ {r.duration}</span>}
                                                            {r.date && <span>• {new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>}
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <span style={{ fontSize: 15, fontWeight: 900, color: passed ? '#10b981' : '#f43f5e' }}>
                                                            {r.score}/{r.total}
                                                        </span>
                                                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: passed ? '#d1fae5' : '#fee2e2', color: passed ? '#065f46' : '#991b1b' }}>
                                                            {pct}%
                                                        </span>
                                                        <button
                                                            onClick={() => handlePrintQuizReport(r.quizTitle, r.course, r.score, r.total, r.duration, r.date, [], {})}
                                                            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(124,58,237,0.2)', background: 'rgba(124,58,237,0.08)', color: '#7c3aed', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                                                            title="Print Quiz Report"
                                                        >
                                                            🖨️ Print Report
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                ) : emptyState('📝', 'No quiz attempts yet', 'Quiz scores and attempt duration will show up here after taking a test.')}
                            </div>

                            {/* Exam Results Section */}
                            <div style={cardS}>
                                {sectionTitle('🏆', 'Exam Results')}
                                {data?.results && data.results.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {data.results.map((r, i) => {
                                            const pct = r.total ? Math.round((r.marks / r.total) * 100) : 0;
                                            const passed = r.grade !== 'Fail' && pct >= 40;
                                            return (
                                                <motion.div
                                                    key={i}
                                                    initial={{ opacity: 0, x: -12 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: i * 0.06 }}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                        padding: '14px 16px', borderRadius: 14,
                                                        background: isDark ? 'rgba(255,255,255,0.04)' : '#f8f7ff',
                                                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(124,58,237,0.07)'}`,
                                                    }}
                                                >
                                                    <div style={{ fontWeight: 700, fontSize: 14, color: isDark ? '#ede9fe' : '#1a1035' }}>
                                                        {r.exam}
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <span style={{
                                                            fontSize: 15, fontWeight: 900,
                                                            color: passed ? '#10b981' : '#f43f5e',
                                                        }}>
                                                            {r.marks}/{r.total}
                                                        </span>
                                                        <span style={{
                                                            fontSize: 11, fontWeight: 700, padding: '3px 9px',
                                                            borderRadius: 20,
                                                            background: passed ? '#d1fae5' : '#fee2e2',
                                                            color: passed ? '#065f46' : '#991b1b',
                                                        }}>
                                                            {pct}%
                                                        </span>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                ) : emptyState('🏆', 'No exam results yet', 'Your term exam results will appear here.')}
                            </div>
                        </div>
                    )}

                    {/* ── Schedule (NEW) ── */}
                    {activeTab === 'schedule' && (
                        <ScheduleTab schedule={data?.schedule || []} isDark={isDark} />
                    )}

                    {/* ── Grades (NEW) ── */}
                    {activeTab === 'grades' && (
                        <GradesTab results={data?.results || []} isDark={isDark} />
                    )}



                    {/* ── Notices ── */}
                    {activeTab === 'notices' && (
                        <div style={cardS}>
                            {sectionTitle('📢', 'Announcements')}
                            {data?.notices && data.notices.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {data.notices.map((n, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: -12 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.06 }}
                                            style={{
                                                padding: '14px 16px', borderRadius: 16,
                                                background: isDark ? 'rgba(245,158,11,0.08)' : '#fffbeb',
                                                border: `1.5px solid ${isDark ? 'rgba(245,158,11,0.2)' : '#fde68a'}`,
                                                borderLeft: '4px solid #f59e0b',
                                            }}
                                        >
                                            <div style={{
                                                display: 'flex', justifyContent: 'space-between',
                                                alignItems: 'flex-start', gap: 8, marginBottom: 6,
                                            }}>
                                                <span style={{ fontWeight: 800, fontSize: 14, color: isDark ? '#fbbf24' : '#92400e' }}>
                                                    {n.title}
                                                </span>
                                                <span style={{ fontSize: 10, color: '#94a3b8', flexShrink: 0, fontWeight: 600 }}>
                                                    {n.date}
                                                </span>
                                            </div>
                                            {n.msg && (
                                                <p style={{ fontSize: 13, color: isDark ? '#d4a053' : '#78350f', margin: 0, lineHeight: 1.5 }}>
                                                    {n.msg}
                                                </p>
                                            )}
                                        </motion.div>
                                    ))}
                                </div>
                            ) : emptyState('📢', 'All clear!', 'No new notices from the admin.')}
                        </div>
                    )}

                    {/* ── Logs ── */}
                    {activeTab === 'logs' && (
                        <div style={cardS}>
                            {sectionTitle('📋', 'Attendance Logs')}
                            {att.logs && att.logs.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {att.logs.map((l, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: -8 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.04 }}
                                            className="log-item"
                                        >
                                            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                                                {new Date(l.time).toLocaleString('en-IN', {
                                                    day: '2-digit', month: 'short', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit',
                                                })}
                                            </div>
                                            <div style={{
                                                fontWeight: 800, fontSize: 14,
                                                color: l.status === 'Check-In' ? '#10b981' : '#f43f5e',
                                            }}>
                                                {l.status === 'Check-In' ? '↗️' : '↙️'} {l.status}
                                            </div>
                                            {l.distance && (
                                                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>📍 {l.distance}</div>
                                            )}
                                        </motion.div>
                                    ))}
                                </div>
                            ) : emptyState('📋', 'No logs yet', 'Your check-in and check-out history will appear here.')}
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @media (max-width: 600px) {
                    .gz-two-col { grid-template-columns: 1fr !important; }
                }
            `}</style>
        </PortalLayout>
    );
}
