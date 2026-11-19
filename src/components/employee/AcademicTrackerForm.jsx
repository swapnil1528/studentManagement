import React, { useState } from 'react';
import { saveAcademicTracker } from '../../services/api';
import { showToast } from '../ui/Toast';

const POPULAR_STANDARDS = [
    '10th Std',
    '9th Std',
    '8th Std',
    '7th Std',
    '6th Std',
    '5th Std',
    '11th Science',
    '11th Commerce',
    '11th Arts',
    '12th Science',
    '12th Commerce',
    '12th Arts',
    'MS-CIT',
    'Tally Prime',
    'Advance Excel',
    'Python Programming',
    'Web Development',
    'Graphic Design',
    'Basic Computer',
    'Other / Custom'
];

const SUGGESTED_SUBJECTS = [
    'Mathematics',
    'Science',
    'English',
    'Accounts',
    'Computer',
    'Physics',
    'Chemistry',
    'Social Studies',
    'Marathi',
    'Hindi'
];

const BATCH_OPTIONS = [
    'Morning Batch (08:00 AM - 10:00 AM)',
    'Morning Batch (10:00 AM - 12:00 PM)',
    'Afternoon Batch (12:00 PM - 02:00 PM)',
    'Afternoon Batch (02:00 PM - 04:00 PM)',
    'Evening Batch (04:00 PM - 06:00 PM)',
    'Evening Batch (06:00 PM - 08:00 PM)',
    'Batch 1',
    'Batch 2',
    'Batch 3',
    'Division A',
    'Division B',
    'Weekend Special'
];

const TEACHING_MODES = [
    { id: 'Theory', label: '📖 Theory Lecture' },
    { id: 'Practical', label: '💻 Practical / Lab' },
    { id: 'Test', label: '📝 Class Test / Quiz' },
    { id: 'Revision', label: '🔄 Revision Session' },
    { id: 'Doubt Solving', label: '❓ Doubt Solving' }
];

export default function AcademicTrackerForm({
    user,
    todayStatus = 'None',
    isMobile = false,
    onGoToAttendance,
    recentLogs = [],
    onReload
}) {
    const isCheckOutDone = todayStatus === 'Check-Out';

    // Form fields
    const todayDate = new Date().toISOString().split('T')[0];
    const [selectedStandard, setSelectedStandard] = useState('10th Std');
    const [customStandard, setCustomStandard] = useState('');
    const [subject, setSubject] = useState('');
    const [topic, setTopic] = useState('');
    const [batch, setBatch] = useState(BATCH_OPTIONS[0]);
    const [teachingMode, setTeachingMode] = useState('Theory');
    const [presentCount, setPresentCount] = useState('');
    const [absentCount, setAbsentCount] = useState('');
    const [homework, setHomework] = useState('');
    const [absentStudents, setAbsentStudents] = useState('');
    const [remarks, setRemarks] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const presNum = Number(presentCount) || 0;
    const absNum = Number(absentCount) || 0;
    const totalStudents = presNum + absNum;
    const attendancePerc = totalStudents > 0 ? Math.round((presNum / totalStudents) * 100) : 0;

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setSuccessMessage('');
        setErrorMessage('');

        if (!isCheckOutDone) {
            setErrorMessage('Check-out must be completed before you can submit an academic tracking report.');
            return;
        }

        const finalStandard = selectedStandard === 'Other / Custom' ? customStandard.trim() : selectedStandard;
        if (!finalStandard) {
            setErrorMessage('Please select or enter the Standard / Class.');
            return;
        }
        if (!subject.trim()) {
            setErrorMessage('Please enter the Subject Name.');
            return;
        }
        if (!topic.trim()) {
            setErrorMessage('Please enter the Topic Name or syllabus covered.');
            return;
        }
        if (presentCount === '' && absentCount === '') {
            setErrorMessage('Please enter the number of present and absent students.');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                empId: user?.userId || user?.studentId || 'EMP-UNKNOWN',
                empName: user?.name || user?.username || 'Employee',
                branch: user?.branch || 'Main',
                date: todayDate,
                standard: finalStandard,
                subject: subject.trim(),
                topic: topic.trim(),
                batch,
                teachingMode,
                present: presNum,
                absent: absNum,
                total: totalStudents,
                homework: homework.trim(),
                absentStudents: absentStudents.trim(),
                remarks: remarks.trim()
            };

            const res = await saveAcademicTracker(payload);
            if (res && res.success !== false && !res.error) {
                setSuccessMessage('Academic tracking record saved successfully to AcadmicTracker sheet! ✅');
                showToast('Academic report submitted successfully! 📚');
                // Reset form fields
                setTopic('');
                setPresentCount('');
                setAbsentCount('');
                setHomework('');
                setAbsentStudents('');
                setRemarks('');
                if (onReload) onReload();
            } else {
                setErrorMessage(res?.error || 'Failed to save academic tracking record');
            }
        } catch (err) {
            console.error('Academic Tracker Submit Error:', err);
            setErrorMessage(err.message || 'Network error while saving academic tracking');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─────────────────────────────────────────────────────────────
    // 1. LOCKED VIEW (When Check-Out has NOT been completed)
    // ─────────────────────────────────────────────────────────────
    if (!isCheckOutDone) {
        return (
            <div className={`${isMobile ? 'p-4' : 'max-w-4xl mx-auto my-4'}`}>
                <div className="bg-[#131B2E] border-2 border-dashed border-[#F59E0B]/40 rounded-[26px] p-6 text-center space-y-4 shadow-xl">
                    <div className="w-20 h-20 mx-auto rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/30 flex items-center justify-center text-4xl shadow-lg shadow-amber-500/10">
                        🔒
                    </div>

                    <div>
                        <span className="inline-block text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 mb-2">
                            Check-Out Required First
                        </span>
                        <h3 className="text-xl font-black text-white">
                            Academic Tracker is Locked
                        </h3>
                        <p className="text-xs text-[#94A3B8] max-w-md mx-auto mt-2 leading-relaxed">
                            As per daily academic policy, you must complete your shift{' '}
                            <span className="font-bold text-white">Check-Out</span> before submitting the daily lecture, attendance, and syllabus tracking report.
                        </p>
                    </div>

                    {/* Current Status Pill */}
                    <div className="bg-[#0B0F19] border border-[#1F293D] rounded-xl p-3 max-w-sm mx-auto flex items-center justify-between text-xs">
                        <span className="text-[#94A3B8]">Your Today Status:</span>
                        <span className={`font-bold px-2.5 py-1 rounded-lg ${
                            todayStatus === 'Check-In'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-slate-700/40 text-slate-300'
                        }`}>
                            {todayStatus === 'Check-In' ? '🏢 Currently Checked In (On Shift)' : '⏳ Not Checked In'}
                        </span>
                    </div>

                    {onGoToAttendance && (
                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={onGoToAttendance}
                                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] font-extrabold text-xs text-white shadow-lg shadow-amber-500/25 active:scale-95 transition-all inline-flex items-center space-x-2"
                            >
                                <span>📍</span>
                                <span>Go to Attendance & Mark Check-Out</span>
                            </button>
                        </div>
                    )}

                    {/* Feature Preview Pill List */}
                    <div className="pt-4 border-t border-[#1F293D] text-left">
                        <h4 className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-2">
                            What you will submit after Check-Out:
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-[#94A3B8]">
                            <div className="bg-[#0B0F19] p-2.5 rounded-xl border border-[#1F293D] flex items-center space-x-1.5">
                                <span>🎓</span>
                                <span className="truncate">Standard / Class</span>
                            </div>
                            <div className="bg-[#0B0F19] p-2.5 rounded-xl border border-[#1F293D] flex items-center space-x-1.5">
                                <span>📚</span>
                                <span className="truncate">Subject & Topic</span>
                            </div>
                            <div className="bg-[#0B0F19] p-2.5 rounded-xl border border-[#1F293D] flex items-center space-x-1.5">
                                <span>👥</span>
                                <span className="truncate">Present & Absent</span>
                            </div>
                            <div className="bg-[#0B0F19] p-2.5 rounded-xl border border-[#1F293D] flex items-center space-x-1.5">
                                <span>📝</span>
                                <span className="truncate">Homework & Remarks</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Previous Logs Section if any */}
                {recentLogs && recentLogs.length > 0 && (
                    <div className="mt-6">
                        <h4 className="text-sm font-bold text-white mb-3 flex items-center space-x-2">
                            <span>📋</span>
                            <span>Previous Academic Submissions ({recentLogs.length})</span>
                        </h4>
                        <div className="space-y-2.5">
                            {recentLogs.slice(0, 5).map((log, idx) => (
                                <AcademicLogCard key={idx} log={log} isMobile={isMobile} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────
    // 2. UNLOCKED VIEW (Check-Out Done)
    // ─────────────────────────────────────────────────────────────
    return (
        <div className={`${isMobile ? 'p-4 space-y-5' : 'max-w-5xl mx-auto my-4 space-y-6 font-sans'}`}>
            {/* Header banner */}
            <div className="bg-gradient-to-r from-[#1E1B4B] via-[#0F172A] to-[#131B2E] border border-[#8B5CF6]/40 rounded-[24px] p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] flex items-center justify-center text-2xl shadow-md shadow-purple-500/25">
                        📚
                    </div>
                    <div>
                        <div className="flex items-center space-x-2">
                            <h2 className="text-base sm:text-lg font-black text-white">
                                Daily Academic Tracker
                            </h2>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                🔓 UNLOCKED
                            </span>
                        </div>
                        <p className="text-xs text-[#94A3B8] mt-0.5">
                            Shift ended successfully. Log your lectures, attendance, and syllabus covered today.
                        </p>
                    </div>
                </div>

                <div className="text-right text-xs text-[#94A3B8] hidden sm:block">
                    <span className="font-bold text-white">{user?.name || user?.username}</span>
                    <div className="text-[11px] text-[#818CF8]">Branch: {user?.branch || 'Main'}</div>
                </div>
            </div>

            {/* Success & Error alerts */}
            {successMessage && (
                <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-between animate-fadeIn">
                    <div className="flex items-center space-x-2">
                        <span>✅</span>
                        <span>{successMessage}</span>
                    </div>
                    <button type="button" onClick={() => setSuccessMessage('')} className="text-emerald-400 hover:text-white">✕</button>
                </div>
            )}
            {errorMessage && (
                <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center justify-between animate-fadeIn">
                    <div className="flex items-center space-x-2">
                        <span>⚠️</span>
                        <span>{errorMessage}</span>
                    </div>
                    <button type="button" onClick={() => setErrorMessage('')} className="text-rose-400 hover:text-white">✕</button>
                </div>
            )}

            {/* Main Form */}
            <form onSubmit={handleSubmit} className="bg-[#131B2E] border border-[#1F293D] rounded-[26px] p-5 sm:p-7 shadow-xl space-y-6">
                <div className="border-b border-[#1F293D] pb-3 flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-white flex items-center space-x-2">
                        <span>✍️</span>
                        <span>Lecture & Class Details</span>
                    </h3>
                    <span className="text-[11px] font-mono text-[#818CF8]">Date: {todayDate}</span>
                </div>

                {/* Section 1: Standard & Batch */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Standard / Class */}
                    <div>
                        <label className="block text-xs font-bold text-[#94A3B8] mb-1.5">
                            Standard / Course <span className="text-rose-400">*</span>
                        </label>
                        <select
                            value={selectedStandard}
                            onChange={(e) => setSelectedStandard(e.target.value)}
                            className="w-full h-11 px-3.5 rounded-xl bg-[#0B0F19] border border-[#1F293D] text-white text-xs font-semibold focus:outline-none focus:border-[#8B5CF6] transition-all"
                        >
                            {POPULAR_STANDARDS.map((std) => (
                                <option key={std} value={std} className="bg-[#0B0F19] text-white">
                                    {std}
                                </option>
                            ))}
                        </select>

                        {selectedStandard === 'Other / Custom' && (
                            <input
                                type="text"
                                placeholder="Type your Standard / Class name..."
                                value={customStandard}
                                onChange={(e) => setCustomStandard(e.target.value)}
                                className="w-full h-10 mt-2 px-3.5 rounded-xl bg-[#0B0F19] border border-[#8B5CF6]/50 text-white text-xs focus:outline-none focus:border-[#8B5CF6]"
                            />
                        )}
                    </div>

                    {/* Batch / Timing */}
                    <div>
                        <label className="block text-xs font-bold text-[#94A3B8] mb-1.5">
                            Batch / Timing
                        </label>
                        <select
                            value={batch}
                            onChange={(e) => setBatch(e.target.value)}
                            className="w-full h-11 px-3.5 rounded-xl bg-[#0B0F19] border border-[#1F293D] text-white text-xs font-semibold focus:outline-none focus:border-[#8B5CF6] transition-all"
                        >
                            {BATCH_OPTIONS.map((b) => (
                                <option key={b} value={b} className="bg-[#0B0F19] text-white">
                                    {b}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Section 2: Subject & Suggested Chips */}
                <div>
                    <label className="block text-xs font-bold text-[#94A3B8] mb-1.5">
                        Subject Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                        type="text"
                        placeholder="e.g. Mathematics, Science, English, Accounts, Excel..."
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl bg-[#0B0F19] border border-[#1F293D] text-white text-xs font-semibold focus:outline-none focus:border-[#8B5CF6] transition-all"
                    />

                    {/* Quick suggestion tags */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="text-[10px] text-[#64748B] self-center mr-1">Quick Select:</span>
                        {SUGGESTED_SUBJECTS.map((sub) => (
                            <button
                                key={sub}
                                type="button"
                                onClick={() => setSubject(sub)}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all ${
                                    subject === sub
                                        ? 'bg-[#8B5CF6] border-[#8B5CF6] text-white'
                                        : 'bg-[#0B0F19] border-[#1F293D] text-[#94A3B8] hover:text-white hover:border-[#8B5CF6]/50'
                                }`}
                            >
                                {sub}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Section 3: Topic / Syllabus Covered */}
                <div>
                    <label className="block text-xs font-bold text-[#94A3B8] mb-1.5">
                        Topic Name / Syllabus Covered <span className="text-rose-400">*</span>
                    </label>
                    <textarea
                        rows={2}
                        placeholder="e.g. Chapter 4 Quadratic Equations (Exercise 4.2 Q 1 to 5 completed)..."
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        className="w-full p-3 rounded-xl bg-[#0B0F19] border border-[#1F293D] text-white text-xs font-medium focus:outline-none focus:border-[#8B5CF6] transition-all resize-none"
                    />
                </div>

                {/* Section 4: Teaching Mode Pills */}
                <div>
                    <label className="block text-xs font-bold text-[#94A3B8] mb-1.5">
                        Teaching Mode / Activity
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {TEACHING_MODES.map((mode) => (
                            <button
                                key={mode.id}
                                type="button"
                                onClick={() => setTeachingMode(mode.id)}
                                className={`p-2.5 rounded-xl text-xs font-bold border text-center transition-all ${
                                    teachingMode === mode.id
                                        ? 'bg-[#8B5CF6] border-[#8B5CF6] text-white shadow-md shadow-purple-500/20'
                                        : 'bg-[#0B0F19] border-[#1F293D] text-[#94A3B8] hover:text-white'
                                }`}
                            >
                                {mode.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Section 5: Attendance Counts (Present vs Absent) */}
                <div className="bg-[#0B0F19] border border-[#1F293D] rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-extrabold text-white flex items-center space-x-1.5">
                            <span>👥</span>
                            <span>Student Attendance for This Lecture</span>
                        </label>

                        {totalStudents > 0 && (
                            <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-lg bg-[#8B5CF6]/20 text-[#A78BFA] border border-[#8B5CF6]/30">
                                Total: {totalStudents} • {attendancePerc}% Present
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Present */}
                        <div className="bg-[#131B2E] border border-emerald-500/30 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-bold text-emerald-400">Present Students Count</span>
                                <span className="text-sm">🟢</span>
                            </div>
                            <input
                                type="number"
                                min="0"
                                placeholder="e.g. 25"
                                value={presentCount}
                                onChange={(e) => setPresentCount(e.target.value)}
                                className="w-full h-10 px-3 rounded-lg bg-[#0B0F19] border border-emerald-500/40 text-emerald-300 font-extrabold text-sm focus:outline-none focus:border-emerald-400"
                            />
                        </div>

                        {/* Absent */}
                        <div className="bg-[#131B2E] border border-rose-500/30 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-bold text-rose-400">Absent Students Count</span>
                                <span className="text-sm">🔴</span>
                            </div>
                            <input
                                type="number"
                                min="0"
                                placeholder="e.g. 3"
                                value={absentCount}
                                onChange={(e) => setAbsentCount(e.target.value)}
                                className="w-full h-10 px-3 rounded-lg bg-[#0B0F19] border border-rose-500/40 text-rose-300 font-extrabold text-sm focus:outline-none focus:border-rose-400"
                            />
                        </div>
                    </div>
                </div>

                {/* Section 6: Additional Valuable Suggestions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    {/* Homework Given */}
                    <div>
                        <label className="block text-xs font-bold text-[#94A3B8] mb-1.5">
                            Homework / Assignment Given (Optional)
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Solve Ex 4.2 Q 6 to 10; Read Chapter 5"
                            value={homework}
                            onChange={(e) => setHomework(e.target.value)}
                            className="w-full h-11 px-3.5 rounded-xl bg-[#0B0F19] border border-[#1F293D] text-white text-xs focus:outline-none focus:border-[#8B5CF6]"
                        />
                    </div>

                    {/* Absent Students Names / Roll Nos */}
                    <div>
                        <label className="block text-xs font-bold text-[#94A3B8] mb-1.5">
                            Absent Students Roll / Names (Optional)
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Roll 5, 12, 19 or Rohan, Pooja"
                            value={absentStudents}
                            onChange={(e) => setAbsentStudents(e.target.value)}
                            className="w-full h-11 px-3.5 rounded-xl bg-[#0B0F19] border border-[#1F293D] text-white text-xs focus:outline-none focus:border-[#8B5CF6]"
                        />
                    </div>
                </div>

                {/* Remarks */}
                <div>
                    <label className="block text-xs font-bold text-[#94A3B8] mb-1.5">
                        Faculty Remarks / Notes (Optional)
                    </label>
                    <input
                        type="text"
                        placeholder="e.g. Good student engagement; revision planned for Friday"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl bg-[#0B0F19] border border-[#1F293D] text-white text-xs focus:outline-none focus:border-[#8B5CF6]"
                    />
                </div>

                {/* Submit button */}
                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#8B5CF6] via-[#7C3AED] to-[#6D28D9] font-extrabold text-sm text-white shadow-xl shadow-purple-500/25 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer"
                    >
                        <span>{isSubmitting ? '⏳' : '📤'}</span>
                        <span>{isSubmitting ? 'Saving to AcadmicTracker Sheet...' : 'Submit Academic Report'}</span>
                    </button>
                    <p className="text-[11px] text-center text-[#64748B] mt-2">
                        Data will be saved directly into Google Sheet: <span className="text-[#818CF8] font-bold">AcadmicTracker</span>
                    </p>
                </div>
            </form>

            {/* Section 7: Recent Logged Classes History */}
            {recentLogs && recentLogs.length > 0 && (
                <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between px-1">
                        <h4 className="text-sm font-extrabold text-white flex items-center space-x-2">
                            <span>📋</span>
                            <span>My Academic Submission History ({recentLogs.length})</span>
                        </h4>
                        <span className="text-[11px] text-[#94A3B8]">Saved in AcadmicTracker</span>
                    </div>

                    <div className="space-y-2.5">
                        {recentLogs.map((log, idx) => (
                            <AcademicLogCard key={idx} log={log} isMobile={isMobile} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// Subcomponent: Individual Card for a logged lecture
function AcademicLogCard({ log, isMobile }) {
    return (
        <div className="bg-[#131B2E] border border-[#1F293D] rounded-2xl p-4 transition-all hover:border-[#8B5CF6]/40 space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <span className="text-xs font-black text-white px-2.5 py-1 rounded-lg bg-[#8B5CF6]/20 text-[#A78BFA] border border-[#8B5CF6]/30">
                        {log.standard || 'General'}
                    </span>
                    <span className="text-sm font-bold text-white">
                        {log.subject || 'Subject'}
                    </span>
                </div>
                <span className="text-[11px] font-mono text-[#94A3B8]">
                    {log.date || ''}
                </span>
            </div>

            <p className="text-xs text-[#CBD5E1] font-medium leading-relaxed">
                <span className="text-[#94A3B8]">Topic: </span>
                {log.topic || 'No topic'}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#1F293D] text-[11px] text-[#94A3B8]">
                <div className="flex items-center space-x-3">
                    <span className="text-emerald-400 font-bold">🟢 Present: {log.present ?? 0}</span>
                    <span className="text-rose-400 font-bold">🔴 Absent: {log.absent ?? 0}</span>
                    {log.total > 0 && <span className="text-[#818CF8]">Total: {log.total}</span>}
                </div>

                <div className="flex items-center space-x-2">
                    {log.teachingMode && (
                        <span className="px-2 py-0.5 rounded-md bg-[#0B0F19] border border-[#1F293D] text-[10px] text-white">
                            {log.teachingMode}
                        </span>
                    )}
                    {log.batch && (
                        <span className="px-2 py-0.5 rounded-md bg-[#0B0F19] border border-[#1F293D] text-[10px] text-[#94A3B8] max-w-[150px] truncate">
                            {log.batch}
                        </span>
                    )}
                </div>
            </div>

            {log.homework && (
                <div className="text-[11px] text-amber-300/90 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                    <span className="font-bold">Homework: </span>{log.homework}
                </div>
            )}
            {log.remarks && (
                <div className="text-[11px] text-[#94A3B8] italic">
                    "{log.remarks}"
                </div>
            )}
        </div>
    );
}

