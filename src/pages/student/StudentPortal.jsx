/**
 * StudentPortal — Gen Z redesign.
 * Tabs: Overview, Attendance, Assignments, Logs, Notices, LMS, Results, Schedule, Grades
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { apiCall, uploadAssignment, getAssignments, getQuizzes, submitQuizResult, getQuizResults, getCourseSessions, getStudentLearningProgress } from '../../services/api';
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
import ArticulatePlayerModal from './components/ArticulatePlayerModal';

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

const formatDueDate = (dateStr) => {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
        return dateStr;
    }
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

const STUDENT_TABS = ['overview', 'attendance', 'classroom', 'quizzes', 'results', 'schedule', 'grades', 'notices', 'logs'];

export default function StudentPortal() {
    const { user, logout } = useAuth();
    const { isDark, toggleTheme } = useTheme();

    const getInitialTab = () => {
        const hash = (window.location.hash || '').replace('#', '').trim().toLowerCase();
        return STUDENT_TABS.includes(hash) ? hash : 'overview';
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
            if (STUDENT_TABS.includes(hash)) {
                setActiveTabState(hash);
            }
        };
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

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
    const [wallClock, setWallClock] = useState(() => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    const [flaggedQuestions, setFlaggedQuestions] = useState({}); // {qIdx: bool}
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
    const [showEndExamModal, setShowEndExamModal] = useState(false);
    const [quizLang, setQuizLang] = useState('en'); // 'en' | 'hi' | 'mr'
    const [bilingualMode, setBilingualMode] = useState(false);

    // ── Articulate Learning Player State ──
    const [showArticulateModal, setShowArticulateModal] = useState(false);
    const [articulateCourse, setArticulateCourse] = useState('MS-CIT');
    const [courseSessions, setCourseSessions] = useState([]);
    const [completedTopicIds, setCompletedTopicIds] = useState([]);
    const [pointsEarned, setPointsEarned] = useState(4589);
    const [completedSessions, setCompletedSessions] = useState(50);

    const loadProgress = async () => {
        try {
            const sid = user?.studentId || user?.userId;
            const res = await getStudentLearningProgress(sid, articulateCourse);
            if (res?.success) {
                if (Array.isArray(res.completedTopicIds)) setCompletedTopicIds(res.completedTopicIds);
                if (res.pointsEarned !== undefined && res.pointsEarned !== null) setPointsEarned(res.pointsEarned || 4589);
                if (res.completedSessions !== undefined && res.completedSessions !== null) setCompletedSessions(res.completedSessions || 50);
            }
            const sRes = await getCourseSessions(articulateCourse);
            if (sRes?.success && Array.isArray(sRes.sessions)) {
                setCourseSessions(sRes.sessions);
            }
        } catch (e) {
            console.error('Error loading ERA progress:', e);
        }
    };

    useEffect(() => {
        loadProgress();
    }, [user, articulateCourse]);

    const GetQuestionText = (q, lang) => {
        if (!q) return '';
        if (lang !== 'en' && q.translations?.[lang]?.q) {
            return q.translations[lang].q;
        }
        return q.q || '';
    };
    const getQuestionText = GetQuestionText;

    const GetOptionText = (q, optKey, lang) => {
        if (!q) return '';
        if (lang !== 'en' && q.translations?.[lang]?.options?.[optKey]) {
            return q.translations[lang].options[optKey];
        }
        return q.options?.[optKey] || '';
    };
    const getOptionText = GetOptionText;

    useEffect(() => {
        const interval = setInterval(() => {
            setWallClock(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => { });
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => { });
            }
        }
    };

    useEffect(() => {
        const handleFsChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFsChange);
        return () => document.removeEventListener('fullscreenchange', handleFsChange);
    }, []);

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

    const checkQuizAnswer = (q, studentAns) => {
        if (!studentAns) return false;
        const isMulti = q.type === 'multiple' || String(q.correct || '').includes(',');
        if (isMulti) {
            const studentArr = Array.isArray(studentAns) ? studentAns : String(studentAns).split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
            const correctArr = typeof q.correct === 'string' ? q.correct.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : (Array.isArray(q.correct) ? q.correct : []);
            if (studentArr.length !== correctArr.length) return false;
            return studentArr.sort().join(',') === correctArr.sort().join(',');
        } else {
            return String(studentAns).trim().toLowerCase() === String(q.correct).trim().toLowerCase();
        }
    };

    const formatAnswerDisplay = (q, rawAns) => {
        if (!rawAns) return 'Not Answered';
        const isMulti = q.type === 'multiple' || String(q.correct || '').includes(',');
        const ansArr = isMulti
            ? (Array.isArray(rawAns) ? rawAns : String(rawAns).split(',').map(s => s.trim().toLowerCase()).filter(Boolean))
            : [String(rawAns).trim().toLowerCase()];

        if (ansArr.length === 0) return 'Not Answered';

        const textParts = ansArr.map(k => {
            const optVal = q.options?.[k];
            return optVal ? `${k.toUpperCase()}. ${optVal}` : k.toUpperCase();
        });
        return textParts.join(' | ');
    };

    const shuffleArray = (arr) => {
        const array = [...arr];
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    };

    const handleStartQuiz = (qz, inNewTab = false, openFullscreen = true) => {
        if (inNewTab) {
            window.open(`${window.location.origin}${window.location.pathname}#quiz-take:${qz.id}`, '_blank');
            return;
        }

        let preparedQuestions = (qz.questions || []).map(q => ({ ...q }));

        if (qz.shuffleQuestions !== false) {
            preparedQuestions = shuffleArray(preparedQuestions);
        }

        preparedQuestions = preparedQuestions.map(q => {
            const defaultKeys = ['a', 'b', 'c', 'd'].filter(k => q.options?.[k]);
            const keys = (qz.shuffleOptions !== false) ? shuffleArray(defaultKeys) : defaultKeys;
            return { ...q, shuffledOptionKeys: keys };
        });

        setActiveQuiz({ ...qz, questions: preparedQuestions });
        setQuizStep(0);
        setQuizAnswers({});
        setFlaggedQuestions({});
        setQuizLang('en');
        setBilingualMode(false);
        setQuizStartTime(Date.now());
        const limitMins = Number(qz.timeLimit) || 0;
        setSecondsLeft(limitMins > 0 ? limitMins * 60 : null);
        window.history.replaceState(null, '', `#quiz-take:${qz.id}`);

        if (openFullscreen) {
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch(() => { });
            }
        }
    };

    const handleToggleStudentOption = (stepIndex, optKey, isMulti) => {
        setQuizAnswers(prev => {
            if (isMulti) {
                const currentStr = prev[stepIndex] || '';
                const currentArr = currentStr ? currentStr.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : [];
                let nextArr;
                if (currentArr.includes(optKey)) {
                    nextArr = currentArr.filter(x => x !== optKey);
                } else {
                    nextArr = [...currentArr, optKey].sort();
                }
                return { ...prev, [stepIndex]: nextArr.join(',') };
            } else {
                return { ...prev, [stepIndex]: optKey };
            }
        });
    };

    const submitQuizAuto = async () => {
        if (!activeQuiz) return;
        setSubmittingQuiz(true);
        let score = 0;
        activeQuiz.questions.forEach((q, idx) => { if (checkQuizAnswer(q, quizAnswers[idx])) score++; });
        const durationMs = Date.now() - (quizStartTime || Date.now());
        const totalSecs = Math.max(1, Math.round(durationMs / 1000));
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        const durationStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

        const answersJson = JSON.stringify(quizAnswers);
        await submitQuizResult({
            studentId: user?.studentId || user?.userId,
            studentName: profile?.name || user?.username || 'Student',
            quizId: activeQuiz.id,
            quizTitle: activeQuiz.title,
            course: activeQuiz.course,
            score,
            total: activeQuiz.questions.length,
            duration: durationStr,
            answers: answersJson,
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

        const franchiseInfo = data?.franchise;
        const centerName = franchiseInfo?.centerName && franchiseInfo.centerName !== 'Institute Marksheet Report' ? franchiseInfo.centerName : 'DURGE COMPUTER CLASSES';
        const centerAddress = franchiseInfo?.address || '';
        const centerPhone = franchiseInfo?.mobile ? (franchiseInfo.mobile.startsWith('+91') ? franchiseInfo.mobile : `• Phone: +91 ${franchiseInfo.mobile}`) : '';
        const centerBranch = franchiseInfo?.branch || profile?.branch || '';

        const qRows = (questionsList || []).map((q, i) => {
            const studentAns = userAnswersMap?.[i];
            const isRight = checkQuizAnswer(q, studentAns);
            const studentText = formatAnswerDisplay(q, studentAns);
            const correctText = formatAnswerDisplay(q, q.correct);

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
                    .logo { font-size: 24px; font-weight: 900; color: #1e1b4b; text-transform: uppercase; letter-spacing: 0.5px; }
                    .sub { font-size: 13px; color: #475569; margin-top: 4px; font-weight: 600; }
                    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; padding: 16px; border-radius: 12px; margin-bottom: 24px; font-size: 14px; border: 1px solid #e2e8f0; }
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
                    <div class="logo">${centerName}</div>
                    <div class="sub">${centerAddress} ${centerPhone}</div>
                    ${centerBranch ? `<div style="font-size:12px;color:#7c3aed;font-weight:700;margin-top:4px;">Branch: ${centerBranch}</div>` : ''}
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
            hideHeaderNav={Boolean(activeQuiz && !quizResult)}
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
                            <div className="sp-main-grid" style={{ marginBottom: 16 }}>
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
                            {/* 🎓 ERA-Style Articulate Course Summary & Marks Report Dashboard */}
                            <div style={{
                                background: isDark ? 'linear-gradient(135deg, rgba(2,132,199,0.15), rgba(15,23,42,0.85))' : 'linear-gradient(135deg, #f0f9ff, #ffffff)',
                                borderRadius: 24, border: `2px solid ${isDark ? 'rgba(2,132,199,0.3)' : '#bae6fd'}`,
                                boxShadow: '0 8px 30px rgba(2,132,199,0.12)', padding: '24px', marginBottom: 24
                            }}>
                                {/* Course Header */}
                                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                                    <h2 style={{ fontSize: 24, fontWeight: 900, color: isDark ? '#38bdf8' : '#0369a1', margin: 0, letterSpacing: '-0.3px' }}>
                                        {articulateCourse}
                                    </h2>
                                </div>

                                {/* Level & Current Session Card */}
                                <div style={{
                                    background: isDark ? '#1e293b' : '#ffffff', borderRadius: 16, padding: '20px',
                                    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`, marginBottom: 24,
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.04)'
                                }}>
                                    <div style={{ fontSize: 16, fontWeight: 900, color: isDark ? '#f8fafc' : '#0f172a' }}>
                                        Level: {completedSessions || 50}
                                    </div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginTop: 4, marginBottom: 16 }}>
                                        Current Session: Session #{completedSessions || 50} {articulateCourse} (Final Exam Practice & Interactive Articulate Self-Learning)
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                                        <button
                                            onClick={() => setShowArticulateModal(true)}
                                            style={{
                                                padding: '10px 22px', borderRadius: 24, border: '2px solid #0284c7',
                                                background: 'linear-gradient(135deg, #0284c7, #0369a1)', color: '#ffffff',
                                                fontSize: 13, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                                                boxShadow: '0 4px 14px rgba(2,132,199,0.3)'
                                            }}
                                        >
                                            🔄 Start Learning
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('results')}
                                            style={{
                                                padding: '10px 20px', borderRadius: 24, border: '2px solid #0284c7',
                                                background: 'transparent', color: '#0284c7',
                                                fontSize: 13, fontWeight: 800, cursor: 'pointer'
                                            }}
                                        >
                                            Go to Learning Reports
                                        </button>
                                    </div>

                                    {/* Progress Bar */}
                                    <div style={{ marginTop: 20 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 800, marginBottom: 6, color: isDark ? '#f1f5f9' : '#1e293b' }}>
                                            <span>Session Completion</span>
                                            <span style={{ color: '#0284c7' }}>{Math.min(100, Math.round(((completedSessions || 50) / 50) * 100))}%</span>
                                        </div>
                                        <div style={{ width: '100%', height: 10, background: isDark ? '#334155' : '#e2e8f0', borderRadius: 5, overflow: 'hidden' }}>
                                            <div style={{ width: `${Math.min(100, Math.round(((completedSessions || 50) / 50) * 100))}%`, height: '100%', background: 'linear-gradient(90deg, #0284c7, #10b981)', borderRadius: 5, transition: 'width 0.5s' }} />
                                        </div>
                                    </div>
                                </div>

                                {/* ERA Marks Report Metric Cards */}
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: isDark ? '#f8fafc' : '#0f172a' }}>
                                            Marks Report
                                        </h3>
                                        <button onClick={() => loadProgress()} style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                                            🔄 Refresh Metrics
                                        </button>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                                        {/* Metric Card 1: Internal Score Points */}
                                        <div style={{
                                            background: 'linear-gradient(135deg, #06b6d4, #0891b2)', color: '#ffffff',
                                            borderRadius: 16, padding: '20px', position: 'relative', overflow: 'hidden', boxShadow: '0 6px 20px rgba(6,182,212,0.3)'
                                        }}>
                                            <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.9 }}>
                                                Internal Score (Points)
                                            </div>
                                            <div style={{ fontSize: 36, fontWeight: 900, margin: '8px 0 0' }}>
                                                {pointsEarned || 4589} <span style={{ fontSize: 18, opacity: 0.8, fontWeight: 700 }}>/ 5000</span>
                                            </div>
                                        </div>

                                        {/* Metric Card 2: Internal Marks MSBTE */}
                                        <div style={{
                                            background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#ffffff',
                                            borderRadius: 16, padding: '20px', position: 'relative', overflow: 'hidden', boxShadow: '0 6px 20px rgba(249,115,22,0.3)'
                                        }}>
                                            <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.9 }}>
                                                Internal Marks (MSBTE)
                                            </div>
                                            <div style={{ fontSize: 36, fontWeight: 900, margin: '8px 0 0' }}>
                                                {((pointsEarned || 4589) / 100).toFixed(2)} <span style={{ fontSize: 18, opacity: 0.8, fontWeight: 700 }}>/ 50</span>
                                            </div>
                                        </div>

                                        {/* Metric Card 3: Completed Session Count */}
                                        <div style={{
                                            background: 'linear-gradient(135deg, #10b981, #059669)', color: '#ffffff',
                                            borderRadius: 16, padding: '20px', position: 'relative', overflow: 'hidden', boxShadow: '0 6px 20px rgba(16,185,129,0.3)'
                                        }}>
                                            <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.9 }}>
                                                Completed Session Count
                                            </div>
                                            <div style={{ fontSize: 36, fontWeight: 900, margin: '8px 0 0' }}>
                                                {completedSessions || 50} <span style={{ fontSize: 18, opacity: 0.8, fontWeight: 700 }}>/ 50</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
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
                                <div className="sp-main-grid" style={{ marginBottom: 14 }}>
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

                            {/* Full-Screen Quiz & Exam Player */}
                            {activeQuiz && !quizResult && (() => {
                                const question = activeQuiz.questions[quizStep];
                                const isMulti = question?.type === 'multiple' || String(question?.correct || '').includes(',');
                                const displayOptionKeys = question?.shuffledOptionKeys || ['a', 'b', 'c', 'd'].filter(opt => question?.options?.[opt]);
                                const currentAnswerStr = quizAnswers[quizStep] || '';
                                const currentAnswerArr = currentAnswerStr ? currentAnswerStr.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : [];

                                const mins = secondsLeft !== null ? Math.floor(secondsLeft / 60) : 0;
                                const secs = secondsLeft !== null ? secondsLeft % 60 : 0;
                                const timeStr = secondsLeft !== null ? `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}` : null;
                                const isWarning = secondsLeft !== null && secondsLeft < 120;
                                const isFlagged = !!flaggedQuestions[quizStep];

                                const answeredCount = Object.keys(quizAnswers).filter(k => quizAnswers[k] && String(quizAnswers[k]).trim() !== '').length;
                                const flaggedCount = Object.keys(flaggedQuestions).filter(k => flaggedQuestions[k]).length;
                                const unansweredCount = activeQuiz.questions.length - answeredCount;

                                return (
                                    <div style={{
                                        position: 'fixed', inset: 0, zIndex: 99999,
                                        background: isDark ? '#0b0819' : '#f4f6f9',
                                        overflowY: 'auto', display: 'flex', flexDirection: 'column'
                                    }}>
                                        {/* ── EXAM TOP HEADER BAR ── */}
                                        <header style={{
                                            position: 'sticky', top: 0, zIndex: 100,
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '12px 24px',
                                            background: isDark ? 'rgba(26,22,48,0.98)' : '#ffffff',
                                            borderBottom: `2px solid ${isDark ? 'rgba(139,92,246,0.2)' : '#e2e8f0'}`,
                                            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                            flexWrap: 'wrap', gap: 12
                                        }}>
                                            {/* TOP LEFT: Student Photo & Profile */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <img
                                                    src={profile.photo && profile.photo.length > 10 ? profile.photo : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(profile.name || 'student')}&backgroundColor=b6e3f4,c0aede,d1d4f9`}
                                                    alt="Student"
                                                    style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid #7c3aed', boxShadow: '0 2px 8px rgba(124,58,237,0.3)' }}
                                                    onError={e => { e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile.name || 'S')}&backgroundColor=7c3aed`; }}
                                                />
                                                <div>
                                                    <div style={{ fontWeight: 800, fontSize: 14, color: isDark ? '#ede9fe' : '#1a1035', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        {profile.name || 'Student'}
                                                        <span style={{ fontSize: 10, background: 'rgba(124,58,237,0.12)', color: '#7c3aed', padding: '1px 7px', borderRadius: 12, fontWeight: 700 }}>
                                                            {profile.batch || 'Student'}
                                                        </span>
                                                    </div>
                                                    <div style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 }}>
                                                        ID: #{profile.id || '---'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* TOP CENTER: Exam Title & Subtitle */}
                                            <div style={{ textAlign: 'center', flex: 1, minWidth: 200 }}>
                                                <div style={{ fontWeight: 900, fontSize: 16, color: isDark ? '#ede9fe' : '#1a1035', letterSpacing: '-0.2px' }}>
                                                    📝 {activeQuiz.title}
                                                </div>
                                                <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700, marginTop: 2 }}>
                                                    Course: <span style={{ color: '#7c3aed' }}>{activeQuiz.course}</span> • Q{quizStep + 1} of {activeQuiz.questions.length}
                                                </div>
                                            </div>

                                            {/* TOP RIGHT: Clock - Timer, Language Selection, Theme Toggle & Fullscreen Toggle */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                                {/* Live Wall Clock */}
                                                <div style={{
                                                    display: 'flex', alignItems: 'center', gap: 6,
                                                    padding: '6px 14px', borderRadius: 12,
                                                    background: isDark ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.06)',
                                                    border: `1px solid ${isDark ? 'rgba(124,58,237,0.3)' : 'rgba(124,58,237,0.15)'}`,
                                                    color: isDark ? '#c4b5fd' : '#6d28d9', fontSize: 13, fontWeight: 800
                                                }} title="Live Current Time">
                                                    🕒 <span style={{ fontFamily: 'monospace', letterSpacing: 0.5 }}>{wallClock}</span>
                                                </div>

                                                {/* Continuous Countdown Timer */}
                                                {timeStr && (
                                                    <div style={{
                                                        display: 'flex', alignItems: 'center', gap: 6,
                                                        padding: '6px 14px', borderRadius: 12,
                                                        background: isWarning ? 'rgba(239,68,68,0.15)' : 'rgba(8,145,178,0.12)',
                                                        border: `1.5px solid ${isWarning ? '#f87171' : '#22d3ee'}`,
                                                        color: isWarning ? '#ef4444' : '#0891b2',
                                                        fontSize: 14, fontWeight: 900
                                                    }} title="Time Remaining">
                                                        ⏱️ Time Left: <span style={{ fontFamily: 'monospace' }}>{timeStr}</span>
                                                    </div>
                                                )}

                                                {/* Multi-Language Selector Controls */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: 3, borderRadius: 12, background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}` }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setQuizLang('en')}
                                                        style={{
                                                            padding: '5px 11px', borderRadius: 9, border: 'none',
                                                            background: quizLang === 'en' ? '#7c3aed' : 'transparent',
                                                            color: quizLang === 'en' ? '#ffffff' : isDark ? '#94a3b8' : '#64748b',
                                                            fontSize: 12, fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s'
                                                        }}
                                                    >
                                                        🇬🇧 English
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setQuizLang('hi')}
                                                        style={{
                                                            padding: '5px 11px', borderRadius: 9, border: 'none',
                                                            background: quizLang === 'hi' ? '#d97706' : 'transparent',
                                                            color: quizLang === 'hi' ? '#ffffff' : isDark ? '#94a3b8' : '#64748b',
                                                            fontSize: 12, fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s'
                                                        }}
                                                    >
                                                        🇮🇳 हिन्दी
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setQuizLang('mr')}
                                                        style={{
                                                            padding: '5px 11px', borderRadius: 9, border: 'none',
                                                            background: quizLang === 'mr' ? '#ea580c' : 'transparent',
                                                            color: quizLang === 'mr' ? '#ffffff' : isDark ? '#94a3b8' : '#64748b',
                                                            fontSize: 12, fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s'
                                                        }}
                                                    >
                                                        🇮🇳 मराठी
                                                    </button>
                                                </div>

                                                {quizLang !== 'en' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setBilingualMode(b => !b)}
                                                        style={{
                                                            padding: '6px 12px', borderRadius: 12,
                                                            border: `1.5px solid ${bilingualMode ? '#059669' : 'rgba(148,163,184,0.3)'}`,
                                                            background: bilingualMode ? 'rgba(16,185,129,0.15)' : 'transparent',
                                                            color: bilingualMode ? '#059669' : isDark ? '#94a3b8' : '#64748b',
                                                            fontSize: 11, fontWeight: 800, cursor: 'pointer',
                                                            display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s'
                                                        }}
                                                        title="Toggle Dual View (English + Selected Language)"
                                                    >
                                                        📖 {bilingualMode ? 'Dual View (ON)' : 'Dual View (OFF)'}
                                                    </button>
                                                )}

                                                {/* Theme Toggle (Dark / Light Mode) */}
                                                <button
                                                    type="button"
                                                    onClick={toggleTheme}
                                                    style={{
                                                        padding: '7px 14px', borderRadius: 12,
                                                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1'}`,
                                                        background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                                                        color: isDark ? '#fbbf24' : '#475569',
                                                        fontSize: 12, fontWeight: 800, cursor: 'pointer',
                                                        display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
                                                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                                                    }}
                                                    title="Toggle Light / Dark mode theme during exam"
                                                >
                                                    {isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}
                                                </button>

                                                {/* Fullscreen Button */}
                                                <button
                                                    onClick={toggleFullscreen}
                                                    style={{
                                                        padding: '7px 14px', borderRadius: 12, border: 'none',
                                                        background: isFullscreen ? 'rgba(239,68,68,0.15)' : 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                                                        color: isFullscreen ? '#f43f5e' : '#ffffff',
                                                        fontSize: 12, fontWeight: 800, cursor: 'pointer',
                                                        display: 'flex', alignItems: 'center', gap: 6,
                                                        boxShadow: '0 2px 10px rgba(124,58,237,0.2)'
                                                    }}
                                                >
                                                    {isFullscreen ? '↙ Exit Fullscreen' : '⛶ Fullscreen'}
                                                </button>

                                                {/* End Exam Button */}
                                                <button
                                                    onClick={() => setShowEndExamModal(true)}
                                                    style={{
                                                        padding: '7px 14px', borderRadius: 12,
                                                        border: '1.5px solid rgba(244,63,94,0.3)',
                                                        background: 'rgba(244,63,94,0.1)',
                                                        color: '#f43f5e',
                                                        fontSize: 12, fontWeight: 800, cursor: 'pointer',
                                                        display: 'flex', alignItems: 'center', gap: 6
                                                    }}
                                                    title="End or Exit Exam"
                                                >
                                                    🚪 End Exam
                                                </button>
                                            </div>
                                        </header>

                                        {/* ── EXAM MAIN CONTAINER ── */}
                                        <div style={{ flex: 1, maxWidth: 1280, width: '100%', margin: '0 auto', padding: '24px 16px', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                                            {/* LEFT: Question Palette & Overview Sidebar */}
                                            <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                                                {/* Status Summary */}
                                                <div style={{
                                                    background: isDark ? 'rgba(26,22,48,0.85)' : '#ffffff',
                                                    borderRadius: 20, padding: 18,
                                                    border: `1.5px solid ${isDark ? 'rgba(139,92,246,0.15)' : 'rgba(124,58,237,0.08)'}`,
                                                    boxShadow: '0 4px 16px rgba(0,0,0,0.04)'
                                                }}>
                                                    <div style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>📊 Quiz Navigator</div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
                                                        <div style={{ padding: '8px 10px', borderRadius: 10, background: 'rgba(16,185,129,0.1)', color: '#059669', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <span>✓ Answered:</span> <strong>{answeredCount}</strong>
                                                        </div>
                                                        <div style={{ padding: '8px 10px', borderRadius: 10, background: 'rgba(245,158,11,0.1)', color: '#d97706', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <span>🚩 Flagged:</span> <strong>{flaggedCount}</strong>
                                                        </div>
                                                    </div>

                                                    {/* Question Grid */}
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                                                        {activeQuiz.questions.map((_, idx) => {
                                                            const isAns = !!quizAnswers[idx];
                                                            const isFlag = !!flaggedQuestions[idx];
                                                            const isCur = quizStep === idx;
                                                            let bg = isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9';
                                                            let color = isDark ? '#94a3b8' : '#475569';
                                                            let border = '1px solid transparent';

                                                            if (isAns) { bg = '#10b981'; color = '#fff'; }
                                                            if (isFlag) { bg = '#f59e0b'; color = '#fff'; }
                                                            if (isCur) { border = '2.5px solid #7c3aed'; }

                                                            return (
                                                                <button
                                                                    key={idx}
                                                                    onClick={() => setQuizStep(idx)}
                                                                    style={{
                                                                        height: 38, borderRadius: 10, border, background: bg, color,
                                                                        fontWeight: 800, fontSize: 13, cursor: 'pointer',
                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                        position: 'relative', transition: 'all 0.15s'
                                                                    }}
                                                                >
                                                                    {idx + 1}
                                                                    {isFlag && <span style={{ position: 'absolute', top: -2, right: -2, fontSize: 8 }}>🚩</span>}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Sidebar Quick End Exam */}
                                                <button
                                                    onClick={() => setShowEndExamModal(true)}
                                                    style={{
                                                        padding: '12px', borderRadius: 16, border: '1.5px solid rgba(244,63,94,0.3)',
                                                        background: 'rgba(244,63,94,0.08)', color: '#f43f5e',
                                                        fontSize: 13, fontWeight: 800, cursor: 'pointer',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                                                    }}
                                                >
                                                    🚪 End Exam Early
                                                </button>
                                            </div>

                                            {/* RIGHT: Question Display Box */}
                                            <div style={{ flex: 1, minWidth: 320 }}>
                                                <div style={{
                                                    background: isDark ? 'rgba(26,22,48,0.85)' : '#ffffff',
                                                    borderRadius: 24, padding: '28px 32px',
                                                    border: `1.5px solid ${isDark ? 'rgba(139,92,246,0.15)' : 'rgba(124,58,237,0.08)'}`,
                                                    boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
                                                }}>
                                                    {/* Progress Line */}
                                                    <div style={{ height: 6, borderRadius: 3, background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9', marginBottom: 24, overflow: 'hidden' }}>
                                                        <motion.div animate={{ width: `${((quizStep + 1) / activeQuiz.questions.length) * 100}%` }} style={{ height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, #7c3aed, #06b6d4)' }} />
                                                    </div>

                                                    {/* Question Banner Header */}
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 12 }}>
                                                        <div>
                                                            <span style={{ fontSize: 12, fontWeight: 800, color: '#7c3aed', background: 'rgba(124,58,237,0.1)', padding: '4px 12px', borderRadius: 20 }}>
                                                                Question {quizStep + 1} of {activeQuiz.questions.length}
                                                            </span>
                                                            {isMulti && (
                                                                <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, background: 'rgba(6,182,212,0.12)', color: '#0891b2', padding: '4px 10px', borderRadius: 20 }}>
                                                                    ☑️ Multi-Select
                                                                </span>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={() => setFlaggedQuestions(p => ({ ...p, [quizStep]: !p[quizStep] }))}
                                                            style={{
                                                                padding: '6px 14px', borderRadius: 10, border: `1px solid ${isFlagged ? '#f59e0b' : 'rgba(148,163,184,0.3)'}`,
                                                                background: isFlagged ? 'rgba(245,158,11,0.12)' : 'transparent',
                                                                color: isFlagged ? '#d97706' : '#94a3b8', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                                                display: 'flex', alignItems: 'center', gap: 6
                                                            }}
                                                        >
                                                            {isFlagged ? '🚩 Flagged' : '🏳️ Flag Question'}
                                                        </button>
                                                    </div>

                                                    {/* Question Text */}
                                                    <div style={{ marginBottom: 24 }}>
                                                        <h2 style={{ fontWeight: 800, fontSize: 18, color: isDark ? '#ede9fe' : '#1a1035', margin: 0, lineHeight: 1.6 }}>
                                                            {GetQuestionText(question, quizLang)}
                                                        </h2>
                                                        {bilingualMode && quizLang !== 'en' && question?.q && (
                                                            <div style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed', fontStyle: 'italic', marginTop: 6 }}>
                                                                🇬🇧 English: {question.q}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Options List */}
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                                                        {displayOptionKeys.map(opt => {
                                                            const isSelected = isMulti ? currentAnswerArr.includes(opt) : currentAnswerStr === opt;
                                                            const mainOptText = getOptionText(question, opt, quizLang);
                                                            const engOptText = question?.options?.[opt];
                                                            return (
                                                                <button
                                                                    key={opt}
                                                                    onClick={() => handleToggleStudentOption(quizStep, opt, isMulti)}
                                                                    style={{
                                                                        padding: '16px 20px', borderRadius: 16,
                                                                        border: `2px solid ${isSelected ? '#7c3aed' : isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
                                                                        background: isSelected ? (isDark ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.06)') : isDark ? 'rgba(255,255,255,0.02)' : '#ffffff',
                                                                        color: isDark ? '#ede9fe' : '#1a1035',
                                                                        fontWeight: isSelected ? 800 : 600,
                                                                        fontSize: 14, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                                                                        display: 'flex', alignItems: 'center', gap: 12,
                                                                        boxShadow: isSelected ? '0 4px 14px rgba(124,58,237,0.15)' : 'none'
                                                                    }}
                                                                >
                                                                    <span style={{
                                                                        width: 24, height: 24, borderRadius: isMulti ? 6 : 12,
                                                                        border: `2px solid ${isSelected ? '#7c3aed' : '#94a3b8'}`,
                                                                        background: isSelected ? '#7c3aed' : 'transparent',
                                                                        color: '#fff', fontSize: 12, fontWeight: 900,
                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                                                    }}>
                                                                        {isSelected ? (isMulti ? '✓' : '•') : ''}
                                                                    </span>
                                                                    <span style={{ fontWeight: 900, color: '#7c3aed', textTransform: 'uppercase' }}>{opt}.</span>
                                                                    <span style={{ flex: 1 }}>
                                                                        {mainOptText}
                                                                        {bilingualMode && quizLang !== 'en' && engOptText && engOptText !== mainOptText && (
                                                                            <span style={{ opacity: 0.75, fontSize: 12, fontStyle: 'italic', marginLeft: 8, color: isDark ? '#c4b5fd' : '#6b21a8' }}>
                                                                                ({engOptText})
                                                                            </span>
                                                                        )}
                                                                    </span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>

                                                    {/* Navigation Action Buttons */}
                                                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                                                        <button
                                                            disabled={quizStep === 0}
                                                            onClick={() => setQuizStep(s => Math.max(0, s - 1))}
                                                            style={{
                                                                padding: '12px 20px', borderRadius: 14,
                                                                border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
                                                                background: 'transparent', color: quizStep === 0 ? '#94a3b8' : isDark ? '#ede9fe' : '#1a1035',
                                                                fontWeight: 700, fontSize: 13, cursor: quizStep === 0 ? 'not-allowed' : 'pointer'
                                                            }}
                                                        >
                                                            ← Previous
                                                        </button>

                                                        {quizAnswers[quizStep] && (
                                                            <button
                                                                onClick={() => setQuizAnswers(p => ({ ...p, [quizStep]: '' }))}
                                                                style={{
                                                                    padding: '12px 16px', borderRadius: 14, border: 'none',
                                                                    background: 'rgba(244,63,94,0.1)', color: '#f43f5e',
                                                                    fontWeight: 700, fontSize: 12, cursor: 'pointer'
                                                                }}
                                                            >
                                                                Clear Selection
                                                            </button>
                                                        )}

                                                        <div style={{ flex: 1 }} />

                                                        {quizStep < activeQuiz.questions.length - 1 ? (
                                                            <button
                                                                onClick={() => setQuizStep(s => s + 1)}
                                                                style={{
                                                                    padding: '12px 28px', borderRadius: 14, border: 'none',
                                                                    background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                                                                    color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer',
                                                                    boxShadow: '0 4px 14px rgba(124,58,237,0.3)'
                                                                }}
                                                            >
                                                                Next Question →
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => setShowSubmitConfirm(true)}
                                                                style={{
                                                                    padding: '12px 28px', borderRadius: 14, border: 'none',
                                                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                                                    color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer',
                                                                    boxShadow: '0 4px 14px rgba(16,185,129,0.3)'
                                                                }}
                                                            >
                                                                Finish & Submit Exam ✅
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Submit Confirmation Dialog Modal */}
                                        {showSubmitConfirm && (
                                            <div style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                                                <div style={{ background: isDark ? '#1a1035' : '#ffffff', borderRadius: 24, padding: 32, maxWidth: 440, width: '100%', textAlign: 'center' }}>
                                                    <div style={{ fontSize: 48, marginBottom: 12 }}>🏁</div>
                                                    <div style={{ fontSize: 20, fontWeight: 900, color: isDark ? '#ede9fe' : '#1a1035', marginBottom: 8 }}>Ready to Submit Exam?</div>
                                                    <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>
                                                        You have answered <strong>{answeredCount}</strong> out of <strong>{activeQuiz.questions.length}</strong> questions.
                                                        {unansweredCount > 0 && <div style={{ color: '#ef4444', fontWeight: 700, marginTop: 4 }}>⚠️ {unansweredCount} question(s) remain unanswered!</div>}
                                                    </div>

                                                    <div style={{ display: 'flex', gap: 12 }}>
                                                        <button
                                                            onClick={() => setShowSubmitConfirm(false)}
                                                            style={{ flex: 1, padding: 12, borderRadius: 14, border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`, background: 'transparent', color: isDark ? '#ede9fe' : '#64748b', fontWeight: 700, cursor: 'pointer' }}
                                                        >
                                                            Continue Test
                                                        </button>
                                                        <button
                                                            disabled={submittingQuiz}
                                                            onClick={async () => {
                                                                setShowSubmitConfirm(false);
                                                                setSubmittingQuiz(true);
                                                                let score = 0;
                                                                activeQuiz.questions.forEach((q, idx) => { if (checkQuizAnswer(q, quizAnswers[idx])) score++; });

                                                                const durationMs = Date.now() - (quizStartTime || Date.now());
                                                                const totalSecs = Math.max(1, Math.round(durationMs / 1000));
                                                                const mins = Math.floor(totalSecs / 60);
                                                                const secs = totalSecs % 60;
                                                                const durationStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

                                                                const answersJson = JSON.stringify(quizAnswers);
                                                                await submitQuizResult({
                                                                    studentId: user?.studentId || user?.userId,
                                                                    studentName: profile?.name || user?.username || 'Student',
                                                                    quizId: activeQuiz.id,
                                                                    quizTitle: activeQuiz.title,
                                                                    course: activeQuiz.course,
                                                                    score,
                                                                    total: activeQuiz.questions.length,
                                                                    duration: durationStr,
                                                                    answers: answersJson,
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
                                                            }}
                                                            style={{ flex: 1, padding: 12, borderRadius: 14, border: 'none', background: submittingQuiz ? '#94a3b8' : 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
                                                        >
                                                            {submittingQuiz ? 'Submitting...' : 'Yes, Submit Now'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* End Exam Confirmation Modal */}
                                        {showEndExamModal && (
                                            <div style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                                                <div style={{ background: isDark ? '#1a1035' : '#ffffff', borderRadius: 24, padding: 32, maxWidth: 460, width: '100%', textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
                                                    <div style={{ fontSize: 48, marginBottom: 12 }}>🚨</div>
                                                    <div style={{ fontSize: 20, fontWeight: 900, color: isDark ? '#ede9fe' : '#1a1035', marginBottom: 8 }}>End Exam Early?</div>
                                                    <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 22, lineHeight: 1.6 }}>
                                                        You have answered <strong>{answeredCount}</strong> out of <strong>{activeQuiz.questions.length}</strong> questions.
                                                        <br />Would you like to submit your current progress or exit without saving?
                                                    </div>

                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                        <button
                                                            disabled={submittingQuiz}
                                                            onClick={async () => {
                                                                setShowEndExamModal(false);
                                                                setSubmittingQuiz(true);
                                                                let score = 0;
                                                                activeQuiz.questions.forEach((q, idx) => { if (checkQuizAnswer(q, quizAnswers[idx])) score++; });
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
                                                                    answers: JSON.stringify(quizAnswers),
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
                                                            }}
                                                            style={{ width: '100%', padding: '13px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}
                                                        >
                                                            ✅ Submit Progress & View Score
                                                        </button>

                                                        <button
                                                            onClick={() => {
                                                                setShowEndExamModal(false);
                                                                setActiveQuiz(null);
                                                                setQuizAnswers({});
                                                                setQuizStep(0);
                                                                setSecondsLeft(null);
                                                                if (document.exitFullscreen && document.fullscreenElement) {
                                                                    document.exitFullscreen().catch(() => { });
                                                                }
                                                            }}
                                                            style={{ width: '100%', padding: '12px', borderRadius: 14, border: '1.5px solid rgba(244,63,94,0.3)', background: 'rgba(244,63,94,0.08)', color: '#f43f5e', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                                                        >
                                                            🚪 Exit Exam Without Saving
                                                        </button>

                                                        <button
                                                            onClick={() => setShowEndExamModal(false)}
                                                            style={{ width: '100%', padding: '11px', borderRadius: 14, border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`, background: 'transparent', color: isDark ? '#ede9fe' : '#64748b', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                                                        >
                                                            ← Continue Exam
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
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
                                                    <motion.div
                                                        key={i}
                                                        initial={{ opacity: 0, y: 8 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: i * 0.05 }}
                                                        style={{
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: 12,
                                                            padding: '16px',
                                                            borderRadius: 16,
                                                            background: isDark ? 'rgba(255,255,255,0.04)' : '#f8f7ff',
                                                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(124,58,237,0.08)'}`
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                                                            <div>
                                                                <div style={{ fontWeight: 800, fontSize: 15, color: isDark ? '#ede9fe' : '#1a1035', marginBottom: 6 }}>📋 {qz.title}</div>
                                                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                                                    <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(124,58,237,0.1)', color: '#7c3aed', padding: '2px 9px', borderRadius: 20 }}>{qz.course}</span>
                                                                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{qz.questions?.length || 0} Questions</span>
                                                                    {qz.timeLimit > 0 && <span style={{ fontSize: 11, color: '#0891b2', fontWeight: 700 }}>⏱️ {qz.timeLimit} Mins</span>}
                                                                    {qz.dueDate && <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>📅 Due: {formatDueDate(qz.dueDate)}</span>}
                                                                </div>
                                                            </div>
                                                            {attempt && (
                                                                <span style={{ fontSize: 11, fontWeight: 800, background: 'rgba(16,185,129,0.12)', color: '#059669', padding: '4px 10px', borderRadius: 20 }}>
                                                                    Score: {attempt.score}/{attempt.total} ({attempt.percentage}%) {attempt.duration ? `• ⏱️ ${attempt.duration}` : ''}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Responsive action buttons */}
                                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', width: '100%', paddingTop: 6, borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(124,58,237,0.05)'}` }}>
                                                            {attempt && (
                                                                <>
                                                                    <button
                                                                        onClick={() => {
                                                                            setAnalysisModal({
                                                                                quizTitle: qz.title,
                                                                                course: qz.course,
                                                                                score: attempt.score,
                                                                                total: attempt.total,
                                                                                duration: attempt.duration,
                                                                                date: attempt.date,
                                                                                questions: qz.questions || [],
                                                                                answers: attempt.answers || {},
                                                                            });
                                                                        }}
                                                                        style={{ flex: '1 1 100px', padding: '9px 14px', borderRadius: 10, border: 'none', background: 'rgba(124,58,237,0.12)', color: '#7c3aed', fontWeight: 800, fontSize: 12, cursor: 'pointer', textAlign: 'center' }}
                                                                    >
                                                                        📊 Analysis
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handlePrintQuizReport(
                                                                            qz.title,
                                                                            qz.course,
                                                                            attempt.score,
                                                                            attempt.total,
                                                                            attempt.duration,
                                                                            attempt.date,
                                                                            qz.questions || [],
                                                                            attempt.answers || {}
                                                                        )}
                                                                        style={{ flex: '1 1 100px', padding: '9px 14px', borderRadius: 10, border: '1px solid rgba(8,145,178,0.3)', background: 'rgba(8,145,178,0.08)', color: '#0891b2', fontWeight: 800, fontSize: 12, cursor: 'pointer', textAlign: 'center' }}
                                                                    >
                                                                        🖨️ Print
                                                                    </button>
                                                                </>
                                                            )}
                                                            <a
                                                                href={`#quiz-take:${qz.id}`}
                                                                onClick={(e) => {
                                                                    if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && e.button === 0) {
                                                                        e.preventDefault();
                                                                        handleStartQuiz(qz, false, true);
                                                                    }
                                                                }}
                                                                style={{
                                                                    flex: attempt ? '1 1 120px' : '2 1 140px',
                                                                    padding: '10px 16px',
                                                                    borderRadius: 10,
                                                                    border: 'none',
                                                                    background: attempt ? (isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0') : 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                                                                    color: attempt ? (isDark ? '#ede9fe' : '#475569') : '#fff',
                                                                    fontWeight: 800,
                                                                    fontSize: 13,
                                                                    cursor: 'pointer',
                                                                    textAlign: 'center',
                                                                    textDecoration: 'none',
                                                                    display: 'inline-block',
                                                                    boxShadow: attempt ? 'none' : '0 4px 14px rgba(124,58,237,0.25)'
                                                                }}
                                                            >
                                                                {attempt ? 'Retake ⛶' : 'Start Exam (Fullscreen) ⛶'}
                                                            </a>
                                                            <a
                                                                href={`#quiz-take:${qz.id}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                style={{
                                                                    flex: '1 1 110px',
                                                                    padding: '10px 14px',
                                                                    borderRadius: 10,
                                                                    border: '1px solid rgba(124,58,237,0.25)',
                                                                    background: 'rgba(124,58,237,0.08)',
                                                                    color: '#7c3aed',
                                                                    fontWeight: 800,
                                                                    fontSize: 12,
                                                                    cursor: 'pointer',
                                                                    textAlign: 'center',
                                                                    textDecoration: 'none',
                                                                    display: 'inline-block'
                                                                }}
                                                                title="Open Exam in New Window/Tab"
                                                            >
                                                                Open in New Tab ↗
                                                            </a>
                                                        </div>
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
                                            const matchingQuiz = quizList.find(q => String(q.id) === String(r.quizId));
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
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <span style={{ fontSize: 15, fontWeight: 900, color: passed ? '#10b981' : '#f43f5e' }}>
                                                            {r.score}/{r.total}
                                                        </span>
                                                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: passed ? '#d1fae5' : '#fee2e2', color: passed ? '#065f46' : '#991b1b' }}>
                                                            {pct}%
                                                        </span>
                                                        <button
                                                            onClick={() => setAnalysisModal({
                                                                quizTitle: r.quizTitle,
                                                                course: r.course,
                                                                score: r.score,
                                                                total: r.total,
                                                                duration: r.duration,
                                                                date: r.date,
                                                                questions: matchingQuiz?.questions || [],
                                                                answers: r.answers || {},
                                                            })}
                                                            style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: 'rgba(124,58,237,0.12)', color: '#7c3aed', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
                                                            title="View Detailed Question Analysis"
                                                        >
                                                            📊 Analysis
                                                        </button>
                                                        <button
                                                            onClick={() => handlePrintQuizReport(
                                                                r.quizTitle,
                                                                r.course,
                                                                r.score,
                                                                r.total,
                                                                r.duration,
                                                                r.date,
                                                                matchingQuiz?.questions || [],
                                                                r.answers || {}
                                                            )}
                                                            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(8,145,178,0.3)', background: 'rgba(8,145,178,0.08)', color: '#0891b2', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
                                                            title="Print Marksheet Report"
                                                        >
                                                            🖨️ Print
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

            {/* ERA Articulate Interactive Player Modal */}
            <ArticulatePlayerModal
                isOpen={showArticulateModal}
                onClose={() => setShowArticulateModal(false)}
                courseName={articulateCourse}
                sessions={courseSessions}
                studentId={user?.studentId || user?.userId}
                completedTopicIds={completedTopicIds}
                pointsEarned={pointsEarned}
                isDark={isDark}
                onProgressUpdate={(newTopics, newPoints) => {
                    setCompletedTopicIds(newTopics);
                    setPointsEarned(newPoints);
                    loadProgress();
                }}
            />

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @media (max-width: 600px) {
                    .gz-two-col { grid-template-columns: 1fr !important; }
                }
            `}</style>
        </PortalLayout>
    );
}
