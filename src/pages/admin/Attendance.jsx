/**
 * Attendance — Admin attendance management page.
 * Two sub-views: Mark Attendance (manual) and View Report.
 */

import { useState } from 'react';
import { saveAttendance, getDailyAttendanceReport } from '../../services/api';
import { showToast } from '../../components/ui/Toast';
import Badge from '../../components/ui/Badge';

export default function Attendance({ adminData, onReload }) {
    const [subTab, setSubTab] = useState('mark'); // 'mark' or 'view'
    const [saving, setSaving] = useState(false);
    const students = adminData?.activeStudents || [];
    const dropdowns = adminData?.dropdowns || {};

    // --- Mark Attendance State ---
    const [attCourse, setAttCourse] = useState('');
    const [attBatch, setAttBatch] = useState('08-10 AM');
    const [attDate, setAttDate] = useState('');
    const [attList, setAttList] = useState([]);
    const [showAttBox, setShowAttBox] = useState(false);

    // --- Report State ---
    const [repDate, setRepDate] = useState('');
    const [reportData, setReportData] = useState([]);
    const [loadingReport, setLoadingReport] = useState(false);

    // Load students for attendance marking
    const loadAttList = () => {
        const filtered = students.filter((s) => s.course === attCourse && s.batch === attBatch);
        if (filtered.length === 0) { alert('No Students'); return; }
        setAttList(filtered.map((s) => ({ ...s, present: true })));
        setShowAttBox(true);
    };

    // Toggle attendance for a student
    const toggleAtt = (index) => {
        setAttList((prev) => prev.map((s, i) => i === index ? { ...s, present: !s.present } : s));
    };

    // Save manual attendance
    const handleSaveAtt = async () => {
        if (!attDate) { alert('Select Date'); return; }
        setSaving(true);
        const records = attList.map((s) => ({
            date: attDate, id: s.id, name: s.name,
            course: attCourse, batch: attBatch,
            status: s.present ? 'Present' : 'Absent',
        }));
        const result = await saveAttendance(records);
        if (result?.success) {
            showToast('Attendance Saved');
            setShowAttBox(false);
        }
        setSaving(false);
    };

    // Load attendance report
    const loadReport = async () => {
        if (!repDate) return;
        setLoadingReport(true);
        const result = await getDailyAttendanceReport(repDate);
        setReportData(Array.isArray(result) ? result : []);
        setLoadingReport(false);
    };

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Attendance</h1>

            {/* Sub-tabs */}
            <div className="flex gap-4 border-b mb-6">
                <button
                    className={`px-4 py-2 ${subTab === 'mark' ? 'border-b-2 border-blue-600 font-bold text-blue-600' : 'text-gray-500 hover:text-blue-600'}`}
                    onClick={() => setSubTab('mark')}
                >
                    Mark Attendance
                </button>
                <button
                    className={`px-4 py-2 ${subTab === 'view' ? 'border-b-2 border-blue-600 font-bold text-blue-600' : 'text-gray-500 hover:text-blue-600'}`}
                    onClick={() => setSubTab('view')}
                >
                    View Report
                </button>
            </div>

            {/* === Mark Attendance === */}
            {subTab === 'mark' && (
                <div>
                    {/* Filters */}
                    <div className="card mb-4 flex flex-wrap gap-4 bg-purple-50 p-4">
                        <select className="inp w-48 mb-0" value={attCourse} onChange={(e) => setAttCourse(e.target.value)}>
                            <option value="">Select Course</option>
                            {(dropdowns.courses || []).map((c) => <option key={c}>{c}</option>)}
                        </select>
                        <select className="inp w-48 mb-0" value={attBatch} onChange={(e) => setAttBatch(e.target.value)}>
                            <option>08-10 AM</option>
                            <option>10-12 PM</option>
                            <option>04-06 PM</option>
                        </select>
                        <input className="inp w-48 mb-0" type="date" value={attDate} onChange={(e) => setAttDate(e.target.value)} />
                        <button className="btn" onClick={loadAttList}>Load Students</button>
                    </div>

                    {/* Attendance List */}
                    {showAttBox && (
                        <div className="card">
                            <table className="w-full mb-4">
                                <thead className="t-head">
                                    <tr><th>Name</th><th>Status</th></tr>
                                </thead>
                                <tbody>
                                    {attList.map((s, i) => (
                                        <tr key={s.id}>
                                            <td className="p-3 font-bold">{s.name}</td>
                                            <td>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={s.present}
                                                        onChange={() => toggleAtt(i)}
                                                        className="w-5 h-5"
                                                    />
                                                    {s.present ? 'Present' : 'Absent'}
                                                </label>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <button className="btn w-full" onClick={handleSaveAtt} disabled={saving}>
                                {saving ? 'Saving...' : 'Save Manual Attendance'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* === View Report === */}
            {subTab === 'view' && (
                <div>
                    <div className="card mb-4 flex gap-4 bg-blue-50 p-4 items-center">
                        <label className="font-bold text-sm">Select Date:</label>
                        <input className="inp w-48 mb-0" type="date" value={repDate} onChange={(e) => setRepDate(e.target.value)} />
                        <button className="btn" onClick={loadReport}>Get Report</button>
                    </div>

                    <div className="card p-0 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="t-head">
                                <tr><th>ID</th><th>Name</th><th>Check-In</th><th>Check-Out</th><th>Status</th></tr>
                            </thead>
                            <tbody>
                                {loadingReport ? (
                                    <tr><td colSpan={5} className="p-4 text-center">Loading...</td></tr>
                                ) : reportData.length > 0 ? (
                                    reportData.map((r, i) => (
                                        <tr key={i} className="t-row">
                                            <td>{r.id}</td>
                                            <td className="font-bold">{r.name}</td>
                                            <td className="text-green-600">{r.in}</td>
                                            <td className="text-red-600">{r.out}</td>
                                            <td><Badge text={r.status} variant="blue" /></td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan={5} className="p-4 text-center text-gray-400">Select a date to view logs</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
