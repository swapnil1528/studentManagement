import React, { useState, useMemo, useEffect } from 'react';
import { getAllAcademicTrackerLogs } from '../../services/api';
import { showToast } from '../../components/ui/Toast';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';

export default function AcademicTrackerAdmin({ adminData, user, onReload }) {
    const initialLogs = adminData?.academicLogs || [];
    const branches = adminData?.dropdowns?.branches || [];

    const [logs, setLogs] = useState(initialLogs);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'
    const [selectedLog, setSelectedLog] = useState(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBranch, setSelectedBranch] = useState(
        (user?.role === 'admin' || !user?.branch || user?.branch === 'All') ? 'All' : user.branch
    );
    const [datePreset, setDatePreset] = useState('all'); // 'all' | 'today' | 'yesterday' | 'week' | 'custom'
    const [customDate, setCustomDate] = useState('');
    const [selectedStandard, setSelectedStandard] = useState('All');
    const [selectedFaculty, setSelectedFaculty] = useState('All');
    const [selectedMode, setSelectedMode] = useState('All');

    // Keep state in sync when adminData changes
    useEffect(() => {
        if (adminData?.academicLogs) {
            setLogs(adminData.academicLogs);
        }
    }, [adminData?.academicLogs]);

    // Manual Refresh from Google Sheets
    const handleRefresh = async () => {
        setLoading(true);
        try {
            const res = await getAllAcademicTrackerLogs(selectedBranch, customDate);
            if (res && res.success && Array.isArray(res.logs)) {
                setLogs(res.logs);
                showToast(`Refreshed ${res.logs.length} academic logs! 📚`);
            } else if (onReload) {
                onReload();
            }
        } catch (err) {
            console.error('Failed to reload academic tracker logs:', err);
            showToast('Failed to refresh data from server');
        } finally {
            setLoading(false);
        }
    };

    // Calculate dates for presets
    const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
    const yesterdayStr = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return d.toISOString().split('T')[0];
    }, []);

    // Extract dynamic dropdown options from current data
    const standardOptions = useMemo(() => {
        const set = new Set();
        logs.forEach(l => { if (l.standard) set.add(l.standard); });
        return ['All', ...Array.from(set).sort()];
    }, [logs]);

    const facultyOptions = useMemo(() => {
        const set = new Set();
        logs.forEach(l => { if (l.empName) set.add(l.empName); });
        return ['All', ...Array.from(set).sort()];
    }, [logs]);

    const modeOptions = ['All', 'Theory', 'Practical', 'Test', 'Revision', 'Doubt Solving'];

    // Filtered logs
    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            // Branch filter
            if (selectedBranch !== 'All' && log.branch && log.branch.toLowerCase() !== selectedBranch.toLowerCase()) {
                return false;
            }

            // Standard filter
            if (selectedStandard !== 'All' && log.standard !== selectedStandard) {
                return false;
            }

            // Faculty filter
            if (selectedFaculty !== 'All' && log.empName !== selectedFaculty) {
                return false;
            }

            // Mode filter
            if (selectedMode !== 'All' && log.teachingMode !== selectedMode) {
                return false;
            }

            // Date preset filter
            const logDate = String(log.date || '').substring(0, 10);
            if (datePreset === 'today' && logDate !== todayStr) return false;
            if (datePreset === 'yesterday' && logDate !== yesterdayStr) return false;
            if (datePreset === 'week') {
                const now = new Date();
                const past7 = new Date();
                past7.setDate(now.getDate() - 7);
                const lDate = new Date(logDate);
                if (isNaN(lDate.getTime()) || lDate < past7) return false;
            }
            if (datePreset === 'custom' && customDate && logDate !== customDate) return false;

            // Search filter
            if (searchTerm.trim()) {
                const q = searchTerm.toLowerCase();
                const matchTopic = (log.topic || '').toLowerCase().includes(q);
                const matchSubject = (log.subject || '').toLowerCase().includes(q);
                const matchStandard = (log.standard || '').toLowerCase().includes(q);
                const matchFaculty = (log.empName || '').toLowerCase().includes(q);
                const matchEmpId = (log.empId || '').toLowerCase().includes(q);
                const matchBatch = (log.batch || '').toLowerCase().includes(q);
                const matchHomework = (log.homework || '').toLowerCase().includes(q);
                const matchRemarks = (log.remarks || '').toLowerCase().includes(q);
                if (!matchTopic && !matchSubject && !matchStandard && !matchFaculty && !matchEmpId && !matchBatch && !matchHomework && !matchRemarks) {
                    return false;
                }
            }

            return true;
        });
    }, [logs, selectedBranch, selectedStandard, selectedFaculty, selectedMode, datePreset, customDate, searchTerm, todayStr, yesterdayStr]);

    // Statistics Cards calculation
    const stats = useMemo(() => {
        const totalLectures = filteredLogs.length;
        let totalPresent = 0;
        let totalStudents = 0;
        const activeFaculty = new Set();
        const activeStandards = new Set();

        filteredLogs.forEach(l => {
            const p = Number(l.present) || 0;
            const a = Number(l.absent) || 0;
            const t = Number(l.total) || (p + a);
            totalPresent += p;
            totalStudents += t;
            if (l.empId || l.empName) activeFaculty.add(l.empName || l.empId);
            if (l.standard) activeStandards.add(l.standard);
        });

        const avgRate = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;

        return {
            totalLectures,
            totalPresent,
            totalStudents,
            avgRate,
            facultyCount: activeFaculty.size,
            standardCount: activeStandards.size
        };
    }, [filteredLogs]);

    // Export to CSV
    const exportCSV = () => {
        if (filteredLogs.length === 0) {
            alert('No academic logs to export');
            return;
        }

        const headers = [
            'Date', 'Time', 'Faculty ID', 'Faculty Name', 'Branch',
            'Standard', 'Subject', 'Topic Covered', 'Batch', 'Teaching Mode',
            'Present', 'Absent', 'Total', 'Attendance Rate', 'Homework', 'Absent Students', 'Remarks'
        ];

        const rows = filteredLogs.map(l => [
            `"${l.date || ''}"`,
            `"${l.timestamp || ''}"`,
            `"${l.empId || ''}"`,
            `"${(l.empName || '').replace(/"/g, '""')}"`,
            `"${l.branch || ''}"`,
            `"${l.standard || ''}"`,
            `"${(l.subject || '').replace(/"/g, '""')}"`,
            `"${(l.topic || '').replace(/"/g, '""')}"`,
            `"${(l.batch || '').replace(/"/g, '""')}"`,
            `"${l.teachingMode || ''}"`,
            l.present ?? 0,
            l.absent ?? 0,
            l.total ?? 0,
            `"${l.attRate || ''}"`,
            `"${(l.homework || '').replace(/"/g, '""')}"`,
            `"${(l.absentStudents || '').replace(/"/g, '""')}"`,
            `"${(l.remarks || '').replace(/"/g, '""')}"`
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `Academic_Tracker_Report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            {/* Header Title */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <div className="flex items-center space-x-2.5">
                        <span className="text-2xl">📚</span>
                        <h2 className="text-xl font-black text-gray-800">
                            Academic & Syllabus Tracker
                        </h2>
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200">
                            Sheet: AcadmicTracker
                        </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        Review daily lectures taken by faculty, syllabus coverage, homework assigned, and student attendance counts.
                    </p>
                </div>

                <div className="flex items-center space-x-2">
                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={loading}
                        className="btn bg-gray-100 hover:bg-gray-200 text-gray-700 px-3.5 py-2 text-xs flex items-center space-x-1.5 transition-all"
                    >
                        <span>{loading ? '⏳' : '🔄'}</span>
                        <span>{loading ? 'Loading...' : 'Refresh'}</span>
                    </button>
                    <button
                        type="button"
                        onClick={exportCSV}
                        className="btn bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-xs flex items-center space-x-1.5 shadow-md shadow-indigo-500/20 transition-all"
                    >
                        <span>📥</span>
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            {/* Stat Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-indigo-500">
                    <span className="text-xs font-bold text-gray-400 uppercase">Lectures Logged</span>
                    <div className="text-2xl font-black text-gray-800 mt-1">{stats.totalLectures}</div>
                    <span className="text-[11px] text-indigo-600 font-semibold">{stats.standardCount} Standards covered</span>
                </div>

                <div className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-emerald-500">
                    <span className="text-xs font-bold text-gray-400 uppercase">Students Present</span>
                    <div className="text-2xl font-black text-emerald-600 mt-1">{stats.totalPresent}</div>
                    <span className="text-[11px] text-gray-500">Out of {stats.totalStudents} total recorded</span>
                </div>

                <div className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-purple-500">
                    <span className="text-xs font-bold text-gray-400 uppercase">Avg Attendance Rate</span>
                    <div className="text-2xl font-black text-purple-600 mt-1">{stats.avgRate}%</div>
                    <span className="text-[11px] text-purple-500 font-medium">Daily lecture attendance</span>
                </div>

                <div className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-amber-500">
                    <span className="text-xs font-bold text-gray-400 uppercase">Active Faculty</span>
                    <div className="text-2xl font-black text-amber-600 mt-1">{stats.facultyCount}</div>
                    <span className="text-[11px] text-amber-600 font-medium">Submitting syllabus tracking</span>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
                {/* Search & View Mode Switcher */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="relative w-full sm:w-96">
                        <span className="absolute left-3.5 top-2.5 text-gray-400 text-xs">🔍</span>
                        <input
                            type="text"
                            placeholder="Search topic, subject, standard, faculty, batch..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="inp pl-9 w-full text-xs h-9"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 text-xs font-bold"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    <div className="flex items-center space-x-2 self-end sm:self-auto">
                        <div className="bg-gray-100 p-1 rounded-xl flex items-center text-xs">
                            <button
                                type="button"
                                onClick={() => setViewMode('table')}
                                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                                    viewMode === 'table' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-800'
                                }`}
                            >
                                📋 Table
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('cards')}
                                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                                    viewMode === 'cards' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-800'
                                }`}
                            >
                                🗂️ Cards
                            </button>
                        </div>
                    </div>
                </div>

                {/* Dropdown Filters Row */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
                    {/* Branch */}
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 mb-1">Branch</label>
                        <select
                            value={selectedBranch}
                            onChange={(e) => setSelectedBranch(e.target.value)}
                            className="inp text-xs h-9 w-full"
                        >
                            <option value="All">All Branches</option>
                            {branches.map((b, i) => (
                                <option key={i} value={b}>{b}</option>
                            ))}
                        </select>
                    </div>

                    {/* Date Preset */}
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 mb-1">Date</label>
                        <select
                            value={datePreset}
                            onChange={(e) => setDatePreset(e.target.value)}
                            className="inp text-xs h-9 w-full"
                        >
                            <option value="all">All Dates</option>
                            <option value="today">Today ({todayStr})</option>
                            <option value="yesterday">Yesterday</option>
                            <option value="week">Past 7 Days</option>
                            <option value="custom">Custom Date</option>
                        </select>
                    </div>

                    {/* Custom Date Input (if selected) */}
                    {datePreset === 'custom' ? (
                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 mb-1">Pick Date</label>
                            <input
                                type="date"
                                value={customDate}
                                onChange={(e) => setCustomDate(e.target.value)}
                                className="inp text-xs h-9 w-full"
                            />
                        </div>
                    ) : (
                        /* Standard Filter */
                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 mb-1">Standard / Class</label>
                            <select
                                value={selectedStandard}
                                onChange={(e) => setSelectedStandard(e.target.value)}
                                className="inp text-xs h-9 w-full"
                            >
                                {standardOptions.map((opt, i) => (
                                    <option key={i} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Faculty / Employee */}
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 mb-1">Faculty</label>
                        <select
                            value={selectedFaculty}
                            onChange={(e) => setSelectedFaculty(e.target.value)}
                            className="inp text-xs h-9 w-full"
                        >
                            {facultyOptions.map((opt, i) => (
                                <option key={i} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>

                    {/* Teaching Mode */}
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 mb-1">Teaching Mode</label>
                        <select
                            value={selectedMode}
                            onChange={(e) => setSelectedMode(e.target.value)}
                            className="inp text-xs h-9 w-full"
                        >
                            {modeOptions.map((opt, i) => (
                                <option key={i} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Content Area: Table vs Cards */}
            {filteredLogs.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
                    <div className="text-4xl mb-3">🔍</div>
                    <h3 className="text-base font-bold text-gray-700">No Academic Tracking Records Found</h3>
                    <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                        No lecture logs match your selected filter criteria. When employees submit their daily academic report after check-out, it will appear here.
                    </p>
                </div>
            ) : viewMode === 'table' ? (
                /* ─── 1. TABLE VIEW ─── */
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] tracking-wider border-b border-gray-200">
                                <tr>
                                    <th className="p-3.5">Date & Faculty</th>
                                    <th className="p-3.5">Class & Subject</th>
                                    <th className="p-3.5">Topic Covered</th>
                                    <th className="p-3.5">Mode & Batch</th>
                                    <th className="p-3.5 text-center">Attendance</th>
                                    <th className="p-3.5">Homework & Notes</th>
                                    <th className="p-3.5 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredLogs.map((log, index) => {
                                    const pres = Number(log.present) || 0;
                                    const abs = Number(log.absent) || 0;
                                    const tot = Number(log.total) || (pres + abs);
                                    const pct = tot > 0 ? Math.round((pres / tot) * 100) : 0;

                                    return (
                                        <tr key={index} className="hover:bg-indigo-50/40 transition-colors">
                                            {/* Date & Faculty */}
                                            <td className="p-3.5 whitespace-nowrap">
                                                <div className="font-bold text-gray-800">{log.empName || 'Faculty'}</div>
                                                <div className="text-[10px] font-mono text-gray-400">
                                                    #{log.empId || '---'}{log.branch ? ` • ${log.branch}` : ''}
                                                </div>
                                                <div className="text-[10px] font-semibold text-indigo-600 mt-0.5">
                                                    📅 {log.date || ''}
                                                </div>
                                            </td>

                                            {/* Standard & Subject */}
                                            <td className="p-3.5">
                                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black bg-purple-100 text-purple-700">
                                                    {log.standard || 'Std'}
                                                </span>
                                                <div className="font-bold text-gray-800 text-xs mt-1">
                                                    {log.subject || 'Subject'}
                                                </div>
                                            </td>

                                            {/* Topic Covered */}
                                            <td className="p-3.5 max-w-xs">
                                                <p className="text-gray-700 font-medium line-clamp-2">
                                                    {log.topic || 'No topic details'}
                                                </p>
                                            </td>

                                            {/* Mode & Batch */}
                                            <td className="p-3.5 whitespace-nowrap">
                                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700">
                                                    {log.teachingMode || 'Theory'}
                                                </span>
                                                <div className="text-[10px] text-gray-400 mt-1 max-w-[140px] truncate">
                                                    🕒 {log.batch || 'Regular'}
                                                </div>
                                            </td>

                                            {/* Attendance Breakdown */}
                                            <td className="p-3.5 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center space-x-1.5 text-xs font-bold">
                                                    <span className="text-emerald-600">🟢 {pres}</span>
                                                    <span className="text-gray-300">/</span>
                                                    <span className="text-rose-600">🔴 {abs}</span>
                                                </div>
                                                <div className="text-[10px] text-gray-500 font-medium mt-0.5">
                                                    {tot} students ({pct}%)
                                                </div>
                                                {/* Mini progress bar */}
                                                <div className="w-16 h-1.5 bg-gray-100 rounded-full mx-auto mt-1 overflow-hidden">
                                                    <div
                                                        className={`h-full ${pct >= 75 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                                        style={{ width: `${Math.min(100, pct)}%` }}
                                                    />
                                                </div>
                                            </td>

                                            {/* Homework & Notes */}
                                            <td className="p-3.5 max-w-xs">
                                                {log.homework ? (
                                                    <div className="text-[11px] text-amber-700 bg-amber-50 p-1.5 rounded border border-amber-200 line-clamp-2 mb-1">
                                                        <span className="font-bold">HW: </span>{log.homework}
                                                    </div>
                                                ) : null}
                                                {log.remarks ? (
                                                    <div className="text-[10px] text-gray-500 italic line-clamp-1">
                                                        "{log.remarks}"
                                                    </div>
                                                ) : null}
                                                {!log.homework && !log.remarks && (
                                                    <span className="text-gray-300 text-[10px]">—</span>
                                                )}
                                            </td>

                                            {/* Action View Detail */}
                                            <td className="p-3.5 text-right whitespace-nowrap">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedLog(log)}
                                                    className="btn bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs px-2.5 py-1 font-bold rounded-lg transition-all"
                                                >
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* ─── 2. CARDS VIEW ─── */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredLogs.map((log, index) => {
                        const pres = Number(log.present) || 0;
                        const abs = Number(log.absent) || 0;
                        const tot = Number(log.total) || (pres + abs);
                        const pct = tot > 0 ? Math.round((pres / tot) * 100) : 0;

                        return (
                            <div
                                key={index}
                                onClick={() => setSelectedLog(log)}
                                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:border-indigo-300 transition-all cursor-pointer space-y-3"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-purple-100 text-purple-700">
                                        {log.standard || 'Std'}
                                    </span>
                                    <span className="text-[11px] font-mono text-gray-400">
                                        📅 {log.date || ''}
                                    </span>
                                </div>

                                <div>
                                    <h4 className="text-sm font-black text-gray-800">{log.subject}</h4>
                                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                        <span className="font-bold text-gray-700">Topic: </span>
                                        {log.topic || 'No topic'}
                                    </p>
                                </div>

                                <div className="bg-gray-50 rounded-xl p-2.5 flex items-center justify-between text-xs">
                                    <div>
                                        <span className="text-gray-400 text-[10px]">Faculty</span>
                                        <div className="font-bold text-gray-800">{log.empName || 'Faculty'}</div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-gray-400 text-[10px]">Attendance</span>
                                        <div className="font-extrabold text-emerald-600">
                                            {pres} / {tot} ({pct}%)
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-gray-100">
                                    <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-semibold">
                                        {log.teachingMode || 'Theory'}
                                    </span>
                                    <span className="text-indigo-600 font-bold hover:underline">
                                        View Full Report →
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Detail Modal */}
            {selectedLog && (
                <Modal
                    title={`Academic Lecture Report: ${selectedLog.standard || ''} - ${selectedLog.subject || ''}`}
                    isOpen={!!selectedLog}
                    onClose={() => setSelectedLog(null)}
                >
                    <div className="space-y-4 text-xs font-sans">
                        {/* Header Badge Strip */}
                        <div className="bg-indigo-50 border border-indigo-100 p-3.5 rounded-xl flex items-center justify-between">
                            <div>
                                <span className="text-[10px] text-indigo-500 uppercase font-black">Standard & Subject</span>
                                <h3 className="text-sm font-black text-indigo-900 mt-0.5">
                                    {selectedLog.standard} • {selectedLog.subject}
                                </h3>
                            </div>
                            <span className="text-xs font-mono font-bold bg-white px-3 py-1 rounded-lg text-indigo-600 shadow-sm">
                                {selectedLog.date}
                            </span>
                        </div>

                        {/* Faculty & Batch Details */}
                        <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl">
                            <div>
                                <span className="text-[10px] text-gray-400 uppercase font-bold">Faculty Name</span>
                                <div className="font-bold text-gray-800 mt-0.5">{selectedLog.empName || 'Faculty'}</div>
                                <div className="text-[10px] font-mono text-gray-500">ID: #{selectedLog.empId || '---'}</div>
                            </div>
                            <div>
                                <span className="text-[10px] text-gray-400 uppercase font-bold">Branch & Batch</span>
                                <div className="font-bold text-gray-800 mt-0.5">{selectedLog.branch || 'Main'}</div>
                                <div className="text-[10px] text-gray-500">{selectedLog.batch || 'Regular'}</div>
                            </div>
                        </div>

                        {/* Topic Covered */}
                        <div>
                            <span className="text-[10px] text-gray-400 uppercase font-bold">Syllabus / Topic Covered</span>
                            <div className="bg-white border border-gray-200 p-3 rounded-xl mt-1 text-gray-800 font-medium leading-relaxed">
                                {selectedLog.topic || 'No topic details logged.'}
                            </div>
                        </div>

                        {/* Attendance Box */}
                        <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-2">
                            <span className="text-[10px] text-gray-400 uppercase font-bold">Student Attendance Breakdown</span>
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                                    <div className="text-lg font-black text-emerald-600">{selectedLog.present ?? 0}</div>
                                    <div className="text-[10px] font-bold text-emerald-800">Present</div>
                                </div>
                                <div className="bg-rose-50 border border-rose-200 p-2 rounded-lg">
                                    <div className="text-lg font-black text-rose-600">{selectedLog.absent ?? 0}</div>
                                    <div className="text-[10px] font-bold text-rose-800">Absent</div>
                                </div>
                                <div className="bg-indigo-50 border border-indigo-200 p-2 rounded-lg">
                                    <div className="text-lg font-black text-indigo-600">{selectedLog.total ?? 0}</div>
                                    <div className="text-[10px] font-bold text-indigo-800">{selectedLog.attRate || '0%'} Rate</div>
                                </div>
                            </div>
                        </div>

                        {/* Absent Students if noted */}
                        {selectedLog.absentStudents && (
                            <div>
                                <span className="text-[10px] text-rose-500 uppercase font-bold">Absent Students Noted</span>
                                <div className="bg-rose-50 border border-rose-100 p-2.5 rounded-xl mt-1 text-rose-800 font-semibold">
                                    {selectedLog.absentStudents}
                                </div>
                            </div>
                        )}

                        {/* Homework */}
                        {selectedLog.homework && (
                            <div>
                                <span className="text-[10px] text-amber-600 uppercase font-bold">Homework / Assignment Given</span>
                                <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl mt-1 text-amber-800 font-medium">
                                    {selectedLog.homework}
                                </div>
                            </div>
                        )}

                        {/* Remarks */}
                        {selectedLog.remarks && (
                            <div>
                                <span className="text-[10px] text-gray-400 uppercase font-bold">Faculty Remarks</span>
                                <div className="bg-gray-100 p-2.5 rounded-xl mt-1 text-gray-700 italic">
                                    "{selectedLog.remarks}"
                                </div>
                            </div>
                        )}

                        <div className="pt-2 text-right">
                            <button
                                type="button"
                                onClick={() => setSelectedLog(null)}
                                className="btn bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 text-xs"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
