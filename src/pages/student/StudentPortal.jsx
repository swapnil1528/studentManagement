/**
 * StudentPortal — Student-facing dashboard.
 * Tabs: Attendance (check-in/out), Attendance View, Logs, Notices, LMS, Results, Assignments.
 * Uses geolocation for attendance marking.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getStudentPortalData, markStudentAttendance, uploadAssignment, getAssignments } from '../../services/api';
import { apiCall } from '../../services/api';
import { showToast } from '../../components/ui/Toast';
import { setLoading } from '../../components/ui/LoadingBar';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import PortalLayout from '../../components/layout/PortalLayout';
import AttendanceView from '../../components/AttendanceView';
import CameraCapture from '../../components/CameraCapture';

// Detect mobile device
const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        || window.innerWidth <= 768;
};

const TABS = [
    { id: 'attendance', label: 'Attendance', emoji: '📍' },
    { id: 'attview', label: 'Attendance View', emoji: '📊' },
    { id: 'assignments', label: 'Assignments', emoji: '📎' },
    { id: 'logs', label: 'Logs', emoji: '📋' },
    { id: 'notices', label: 'Notices', emoji: '📢' },
    { id: 'lms', label: 'LMS', emoji: '📚' },
    { id: 'results', label: 'Results', emoji: '🏆' },
];

// Format file size
const formatSize = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export default function StudentPortal({ portalData, onReload }) {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('attendance');
    const [data, setData] = useState(null);

    // Assignment state
    const [assignmentList, setAssignmentList] = useState([]);
    const [asnForm, setAsnForm] = useState({ topic: '', course: '', files: [] });
    const [uploading, setUploading] = useState(false);
    const [asnTopics, setAsnTopics] = useState([]);
    const [asnCourses, setAsnCourses] = useState([]);

    // Check-in constraints
    const [mobileAllowed, setMobileAllowed] = useState(true);
    const [cameraRequired, setCameraRequired] = useState(false);
    const [mobileCheckDone, setMobileCheckDone] = useState(false);

    // Initial load: settings and history
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        // Load Settings
        const settings = await apiCall('getSettings', {});
        if (settings?.success) {
            setMobileAllowed(settings.mobileCheckIn);
            setCameraRequired(settings.studentCameraCheckIn);
        }
        setMobileCheckDone(true);

        const result = await getStudentPortalData(user?.studentId || user?.userId);
        if (result && !result.error) setData(result);
        setLoading(false);
    };

    // Load assignments when tab is selected
    useEffect(() => {
        if (activeTab === 'assignments') loadAssignments();
    }, [activeTab]);

    const loadAssignments = async () => {
        setLoading(true); // Use global loading for assignments too
        const result = await getAssignments(user?.studentId || user?.userId);
        if (result?.success) {
            setAssignmentList(result.assignments || []);
            if (result.topics?.length > 0) setAsnTopics(result.topics);
            if (result.courses?.length > 0) setAsnCourses(result.courses);
        }
        setLoading(false);
    };

    const profile = data?.profile || {};
    const att = data?.attendance || {};
    const topics = asnTopics.length > 0 ? asnTopics : (data?.topics || []);
    const studentCourses = asnCourses.length > 0 ? asnCourses : (data?.courses || []);

    // Check if attendance is allowed on this device
    const isMobile = isMobileDevice();
    const canMarkAttendance = !isMobile || mobileAllowed;

    // Determine attendance button state
    const getAttStatus = () => {
        if (att.todayStatus === 'Check-In') return { class: 'status-checkin', label: '✓ Checked In', showOut: true };
        if (att.todayStatus === 'Check-Out') return { class: 'status-checkout', label: '✗ Checked Out', showOut: false };
        return { class: 'status-none', label: '⏳ Not Marked', showOut: false };
    };
    const attStatus = getAttStatus();

    // Camera state
    const [showCamera, setShowCamera] = useState(false);
    const [attTypePending, setAttTypePending] = useState('');

    const initiateAttendance = (type) => {
        const mobile = isMobileDevice();
        if (mobile && !mobileAllowed) {
            alert('❌ Mobile check-in is currently disabled by the admin. Please use a desktop/laptop device.');
            return;
        }

        if (cameraRequired) {
            setAttTypePending(type);
            setShowCamera(true);
        } else {
            handleAttendance(type, ""); // No photo required
        }
    };

    // Handle attendance marking
    const handleAttendance = async (type, photoBase64) => {
        const mobile = isMobileDevice();
        setShowCamera(false);
        showToast(`Processing ${type}...`);

        // Pass device flag so backend can also enforce
        const result = await apiCall('markStudentAtt', {
            id: user?.studentId || user?.userId,
            type,
            lat: 0,
            lng: 0,
            photo: photoBase64,
            device: mobile ? 'mobile' : 'desktop'
        });
        if (result?.success) {
            showToast(`${type} Successful!`);
            loadData();
        } else {
            alert(result?.error || 'Failed');
        }
    };

    // Handle file selection for assignment
    const handleFileSelect = (e) => {
        const selected = Array.from(e.target.files);
        setAsnForm(prev => ({ ...prev, files: [...prev.files, ...selected] }));
    };

    const removeFile = (index) => {
        setAsnForm(prev => ({
            ...prev,
            files: prev.files.filter((_, i) => i !== index)
        }));
    };

    // Upload all selected files
    const handleUploadAssignment = async () => {
        if (!asnForm.topic) {
            alert('Please select a topic');
            return;
        }
        if (asnForm.files.length === 0) {
            alert('Please select at least one file');
            return;
        }

        setUploading(true);
        let successCount = 0;

        for (const file of asnForm.files) {
            try {
                const base64 = await fileToBase64(file);
                const result = await uploadAssignment({
                    studentId: user?.studentId || user?.userId,
                    course: asnForm.course,
                    topic: asnForm.topic,
                    fileName: file.name,
                    fileData: base64,
                    mimeType: file.type
                });
                if (result?.success) successCount++;
            } catch (err) {
                console.error('Upload error:', err);
            }
        }

        if (successCount > 0) {
            showToast(`${successCount} file(s) uploaded successfully!`);
            setAsnForm({ topic: '', course: '', files: [] });
            loadAssignments();
        } else {
            alert('Upload failed. Please try again.');
        }
        setUploading(false);
    };

    // Convert file to base64
    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    // File type icon
    const getFileIcon = (mimeType, fileName) => {
        if (!mimeType && !fileName) return '📄';
        const ext = fileName?.split('.').pop()?.toLowerCase() || '';
        if (mimeType?.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return '🖼️';
        if (mimeType?.includes('pdf') || ext === 'pdf') return '📕';
        if (mimeType?.includes('word') || ['doc', 'docx'].includes(ext)) return '📘';
        if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet') || ['xls', 'xlsx', 'csv'].includes(ext)) return '📗';
        if (mimeType?.includes('powerpoint') || mimeType?.includes('presentation') || ['ppt', 'pptx'].includes(ext)) return '📙';
        if (mimeType?.includes('video') || ['mp4', 'avi', 'mkv', 'mov'].includes(ext)) return '🎬';
        if (mimeType?.includes('audio') || ['mp3', 'wav', 'ogg'].includes(ext)) return '🎵';
        if (mimeType?.includes('zip') || ['zip', 'rar', '7z', 'tar'].includes(ext)) return '📦';
        return '📄';
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
            hasFace={true}
            onFaceReg={() => { }}
            onLogout={logout}
        >
            {/* === Attendance Tab === */}
            {activeTab === 'attendance' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Mark Attendance Card */}
                    <div className="card text-center">
                        <h3 className="font-bold text-lg mb-4">Mark Attendance</h3>

                        {/* Mobile restriction banner */}
                        {isMobile && !mobileAllowed && mobileCheckDone && (
                            <div className="p-3 mb-4 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                <div className="font-bold text-red-600 mb-1">🖥️ Desktop Only</div>
                                <p className="text-red-500 text-xs">
                                    Mobile check-in is disabled by admin. Please use a desktop device.
                                </p>
                            </div>
                        )}

                        {isMobile && mobileAllowed && mobileCheckDone && (
                            <div className="p-2 mb-3 rounded-lg text-xs" style={{ background: 'rgba(16,185,129,0.08)' }}>
                                <span className="text-green-600">📱 Mobile check-in enabled</span>
                            </div>
                        )}

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
                            {/* Disable buttons completely if not allowed */}
                            {attStatus.showOut && (
                                <button
                                    className="btn bg-red-600 w-full mb-3 py-3 font-bold text-lg"
                                    onClick={() => initiateAttendance('Check-Out')}
                                    disabled={!canMarkAttendance}
                                >
                                    <i className="fas fa-sign-out-alt mr-2" /> Check Out {cameraRequired ? '(Camera)' : ''}
                                </button>
                            )}
                            {!attStatus.showOut && att.todayStatus !== 'Check-In' && (
                                <button
                                    className="btn bg-green-600 w-full mb-3 py-3 font-bold text-lg"
                                    onClick={() => initiateAttendance('Check-In')}
                                    disabled={!canMarkAttendance || att.todayStatus === 'Check-Out'}
                                >
                                    <i className="fas fa-sign-in-alt mr-2" /> Check In {cameraRequired ? '(Camera)' : ''}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Camera Modal */}
                    {showCamera && (
                        <Modal title={`Secure ${attTypePending}`} isOpen={showCamera} onClose={() => setShowCamera(false)}>
                            <div className="text-center mb-4 text-sm text-gray-500">
                                Please look at the camera to capture your attendance photo. A timestamp will be embedded.
                            </div>
                            <CameraCapture
                                onCapture={(b64) => handleAttendance(attTypePending, b64)}
                                onCancel={() => setShowCamera(false)}
                            />
                        </Modal>
                    )}
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

            {/* === Attendance View Tab === */}
            {activeTab === 'attview' && (
                <AttendanceView logs={att.allLogs || att.logs || []} type="student" />
            )}

            {/* === Assignments Tab === */}
            {activeTab === 'assignments' && (
                <div className="space-y-6">
                    {/* Upload Assignment Card */}
                    <div className="card">
                        <h3 className="font-bold text-lg mb-4">📎 Upload Assignment</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            {/* Course Selection */}
                            <div>
                                <label className="text-xs font-bold opacity-50 mb-1 block">Course</label>
                                <select
                                    className="inp"
                                    value={asnForm.course}
                                    onChange={(e) => {
                                        setAsnForm(p => ({ ...p, course: e.target.value, topic: '' }));
                                    }}
                                >
                                    <option value="">Select Course</option>
                                    {(data?.courses || []).map((c) => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            {/* Topic Selection (from Topic sheet) */}
                            <div>
                                <label className="text-xs font-bold opacity-50 mb-1 block">Select Topic</label>
                                <select
                                    className="inp"
                                    value={asnForm.topic}
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

                        {/* File Selection */}
                        <div className="mb-4">
                            <label className="text-xs font-bold opacity-50 mb-1 block">Select Files (All types supported)</label>
                            <input
                                type="file"
                                multiple
                                onChange={handleFileSelect}
                                className="text-sm block w-full border rounded-lg p-2"
                            />
                        </div>

                        {/* Selected files list */}
                        {asnForm.files.length > 0 && (
                            <div className="mb-4 p-3 rounded-lg" style={{ background: 'rgba(99,102,241,0.06)' }}>
                                <div className="text-xs font-bold opacity-50 mb-2">Selected Files ({asnForm.files.length})</div>
                                {asnForm.files.map((f, i) => (
                                    <div key={i} className="flex items-center justify-between py-1 px-2 mb-1 bg-white rounded border text-sm">
                                        <span className="flex items-center gap-2">
                                            <span>{getFileIcon(f.type, f.name)}</span>
                                            <span className="truncate max-w-[200px]">{f.name}</span>
                                            <span className="text-xs opacity-40">{formatSize(f.size)}</span>
                                        </span>
                                        <button
                                            className="text-red-400 hover:text-red-600 text-xs font-bold px-2"
                                            onClick={() => removeFile(i)}
                                        >✕</button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Upload button */}
                        <button
                            className="btn w-full"
                            onClick={handleUploadAssignment}
                            disabled={uploading || asnForm.files.length === 0}
                        >
                            {uploading ? '⏳ Uploading...' : `📤 Upload ${asnForm.files.length > 0 ? `(${asnForm.files.length} file${asnForm.files.length > 1 ? 's' : ''})` : ''}`}
                        </button>
                    </div>

                    {/* Assignment History */}
                    <div className="card">
                        <h3 className="font-bold text-lg mb-4">📋 Assignment History</h3>
                        {asnLoading ? (
                            <div className="text-center py-8">
                                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
                                <p className="text-gray-400 text-sm">Loading assignments...</p>
                            </div>
                        ) : assignmentList.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left border-b">
                                            <th className="pb-2 font-bold opacity-50">#</th>
                                            <th className="pb-2 font-bold opacity-50">Date</th>
                                            <th className="pb-2 font-bold opacity-50">Course</th>
                                            <th className="pb-2 font-bold opacity-50">Topic</th>
                                            <th className="pb-2 font-bold opacity-50">File</th>
                                            <th className="pb-2 font-bold opacity-50">Size</th>
                                            <th className="pb-2 font-bold opacity-50">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {assignmentList.map((a, i) => (
                                            <tr key={i} className="border-b hover:bg-gray-50 transition">
                                                <td className="py-3 opacity-40">{i + 1}</td>
                                                <td className="py-3 text-xs">
                                                    {a.date ? new Date(a.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                                </td>
                                                <td className="py-3">
                                                    <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
                                                        {a.course || '—'}
                                                    </span>
                                                </td>
                                                <td className="py-3 font-medium">{a.topic || '—'}</td>
                                                <td className="py-3">
                                                    <span className="flex items-center gap-1">
                                                        <span>{getFileIcon(a.mimeType, a.fileName)}</span>
                                                        <span className="truncate max-w-[150px]">{a.fileName || '—'}</span>
                                                    </span>
                                                </td>
                                                <td className="py-3 text-xs opacity-50">{formatSize(a.fileSize)}</td>
                                                <td className="py-3">
                                                    <a
                                                        href={a.fileUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 font-bold text-xs underline hover:text-blue-800"
                                                    >
                                                        📥 Download
                                                    </a>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <div className="text-4xl mb-2">📎</div>
                                <p className="text-gray-400 text-sm">No assignments uploaded yet.</p>
                                <p className="text-gray-300 text-xs mt-1">Upload your first assignment above!</p>
                            </div>
                        )}
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
