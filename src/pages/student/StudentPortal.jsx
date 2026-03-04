/**
 * StudentPortal — Gen Z redesign.
 * Tabs: Overview, Attendance, Assignments, Logs, Notices, LMS, Results, Schedule, Grades
 */

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { apiCall, uploadAssignment, getAssignments } from '../../services/api';
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
    { id: 'results', label: 'Results', emoji: '🏆' },
    { id: 'schedule', label: 'Schedule', emoji: '🗓️' },
    { id: 'grades', label: 'Grades', emoji: '📊' },
    { id: 'notices', label: 'Notices', emoji: '📢' },
    { id: 'logs', label: 'Logs', emoji: '📋' },
];

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
                            {/* Class Materials / Schedule */}
                            <div style={cardS}>
                                {sectionTitle('📚', 'Classwork & Materials')}
                                {data?.lms && data.lms.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {data.lms.map((l, i) => (
                                            <motion.a
                                                key={i}
                                                href={l.link} target="_blank" rel="noopener noreferrer"
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: i * 0.05 }}
                                                style={{
                                                    display: 'block', textDecoration: 'none',
                                                    padding: '16px', borderRadius: 16,
                                                    background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
                                                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}`,
                                                    transition: 'all 0.2s',
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                                    e.currentTarget.style.boxShadow = isDark ? '0 10px 20px rgba(0,0,0,0.3)' : '0 10px 20px rgba(0,0,0,0.05)';
                                                    e.currentTarget.style.borderColor = isDark ? 'rgba(124,58,237,0.4)' : '#c4b5fd';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.transform = '';
                                                    e.currentTarget.style.boxShadow = '';
                                                    e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0';
                                                }}
                                            >
                                                <div style={{ display: 'flex', gap: 14 }}>
                                                    <div style={{
                                                        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                                                        background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(6,182,212,0.1))',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
                                                    }}>
                                                        {l.type?.toLowerCase().includes('video') ? '🎬'
                                                            : l.type?.toLowerCase().includes('pdf') ? '📕'
                                                                : l.type?.toLowerCase().includes('quiz') ? '📝'
                                                                    : '📌'}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 800, fontSize: 14, color: isDark ? '#ede9fe' : '#1e293b', marginBottom: 4 }}>
                                                            {l.title}
                                                        </div>
                                                        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                                                            {l.type} {l.desc && <span style={{ fontWeight: 'normal' }}>— {l.desc}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.a>
                                        ))}
                                    </div>
                                ) : emptyState('📚', 'No classwork assigned yet', 'Learning materials and schedules will appear here.')}
                            </div>

                            {/* Assignment Upload */}
                            <div style={cardS}>
                                {sectionTitle('📤', 'Submit Assignment')}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                                    <div>
                                        <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
                                            Course
                                        </label>
                                        <select
                                            className="inp"
                                            value={asnForm.course}
                                            style={isDark ? { background: 'rgba(255,255,255,0.04)', color: '#e2e8f0', borderColor: 'rgba(139,92,246,0.2)' } : {}}
                                            onChange={(e) => setAsnForm(p => ({ ...p, course: e.target.value, topic: '' }))}
                                        >
                                            <option value="">Select Course</option>
                                            {(data?.courses || []).map((c) => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
                                            Topic
                                        </label>
                                        <select
                                            className="inp"
                                            value={asnForm.topic}
                                            style={isDark ? { background: 'rgba(255,255,255,0.04)', color: '#e2e8f0', borderColor: 'rgba(139,92,246,0.2)' } : {}}
                                            onChange={(e) => setAsnForm(p => ({ ...p, topic: e.target.value }))}
                                        >
                                            <option value="">Select Topic</option>
                                            {topics
                                                .filter(t => !asnForm.course || t.course.toLowerCase() === asnForm.course.toLowerCase())
                                                .map((t, i) => <option key={i} value={t.topic}>{t.topic}</option>)
                                            }
                                        </select>
                                    </div>
                                </div>

                                <div style={{
                                    border: `2px dashed ${isDark ? 'rgba(139,92,246,0.3)' : 'rgba(124,58,237,0.2)'}`,
                                    borderRadius: 16, padding: '24px', textAlign: 'center', marginBottom: 14,
                                    background: isDark ? 'rgba(124,58,237,0.04)' : 'rgba(124,58,237,0.02)',
                                    cursor: 'pointer', transition: 'all 0.2s'
                                }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? 'rgba(124,58,237,0.08)' : 'rgba(124,58,237,0.05)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = isDark ? 'rgba(124,58,237,0.04)' : 'rgba(124,58,237,0.02)'; }}
                                    onClick={() => document.getElementById('asnFileInput').click()}
                                >
                                    <input
                                        id="asnFileInput" type="file" multiple
                                        onChange={handleFileSelect} style={{ display: 'none' }}
                                    />
                                    <div style={{ fontSize: 32, marginBottom: 10 }}>☁️</div>
                                    <div style={{ fontSize: 14, fontWeight: 800, color: isDark ? '#c4b5fd' : '#7c3aed' }}>
                                        Click to Upload Work
                                    </div>
                                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>PDF, Images, Zip files supported</div>
                                </div>

                                {asnForm.files.length > 0 && (
                                    <div style={{ background: isDark ? 'rgba(124,58,237,0.08)' : 'rgba(124,58,237,0.04)', borderRadius: 14, padding: '12px 14px', marginBottom: 14 }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase' }}>
                                            {asnForm.files.length} file(s) ready
                                        </div>
                                        {asnForm.files.map((f, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', marginBottom: 6, borderRadius: 10, background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'}`, fontSize: 13 }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <span>{getFileIcon(f.type, f.name)}</span>
                                                    <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isDark ? '#e2e8f0' : '#1a1035', fontWeight: 600 }}>{f.name}</span>
                                                    <span style={{ fontSize: 10, color: '#94a3b8' }}>{formatSize(f.size)}</span>
                                                </span>
                                                <button onClick={() => removeFile(i)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#f43f5e', fontWeight: 700 }}>✕</button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <motion.button
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleUploadAssignment}
                                    disabled={uploading || asnForm.files.length === 0}
                                    style={{
                                        width: '100%', padding: '14px', borderRadius: 16, border: 'none',
                                        background: uploading || asnForm.files.length === 0 ? '#94a3b8' : 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                                        color: 'white', fontSize: 14, fontWeight: 800,
                                        cursor: uploading || asnForm.files.length === 0 ? 'not-allowed' : 'pointer',
                                        boxShadow: asnForm.files.length > 0 ? '0 6px 20px rgba(124,58,237,0.3)' : 'none',
                                    }}
                                >
                                    {uploading ? '⏳ Submitting to Teacher...' : `📤 Hand In${asnForm.files.length > 0 ? ` (${asnForm.files.length})` : ''}`}
                                </motion.button>
                            </div>

                            {/* Submissions History */}
                            <div style={cardS}>
                                {sectionTitle('📋', 'My Submissions')}
                                {asnLoading ? (
                                    <div style={{ textAlign: 'center', padding: '30px 0' }}>
                                        <div style={{ width: 32, height: 32, margin: '0 auto 12px', border: '3px solid rgba(124,58,237,0.2)', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                                    </div>
                                ) : assignmentList.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {assignmentList.map((a, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, background: isDark ? 'rgba(255,255,255,0.04)' : '#f8f7ff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(124,58,237,0.07)'}` }}>
                                                <div style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(6,182,212,0.15))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                                                    {getFileIcon(a.mimeType, a.fileName)}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontWeight: 800, fontSize: 13, color: isDark ? '#ede9fe' : '#1a1035', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {a.topic || '—'}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                                                        <span style={{ fontSize: 10, color: '#94a3b8' }}>{a.date ? new Date(a.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}</span>
                                                        <span style={{ fontSize: 10, color: '#94a3b8' }}>{formatSize(a.fileSize)}</span>
                                                    </div>
                                                </div>
                                                <a
                                                    href={a.fileUrl} target="_blank" rel="noopener noreferrer"
                                                    style={{ fontSize: 11, fontWeight: 800, padding: '6px 12px', borderRadius: 10, background: 'rgba(16, 185, 129, 0.1)', color: '#059669', textDecoration: 'none' }}
                                                >
                                                    View
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                ) : emptyState('📎', 'No submissions yet', 'Your assignments will appear here.')}
                            </div>
                        </div>
                    )}

                    {/* ── Results ── */}
                    {activeTab === 'results' && (
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
                            ) : emptyState('🏆', 'No results yet', 'Your exam results will appear here.')}
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
