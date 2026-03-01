/**
 * Attendance — Admin attendance management page.
 * Three sub-views: Mark Attendance (manual), View Report (daily),
 * and Attendance Analysis (course/month/year filters with hours + stats).
 */

import { useState, useMemo } from 'react';
import { saveAttendance, getDailyAttendanceReport } from '../../services/api';
import { showToast } from '../../components/ui/Toast';
import Badge from '../../components/ui/Badge';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Attendance({ adminData, onReload }) {
    const [subTab, setSubTab] = useState('mark');
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

    // --- Analysis State ---
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const [analysisCourse, setAnalysisCourse] = useState('All');
    const [analysisMonth, setAnalysisMonth] = useState(currentMonth);
    const [analysisYear, setAnalysisYear] = useState(currentYear);
    const [analysisView, setAnalysisView] = useState('month'); // 'month' or 'year'

    // Get all attendance data from adminData (raw from Attendance sheet)
    // Each row: [Date, ID, Name, Course, Status, Batch, Loc, Dist]
    const allAttendance = useMemo(() => {
        // adminData has raw attendance data from the server
        // We need to parse from the returned data
        return adminData?._rawAttendance || [];
    }, [adminData]);

    // Load students for attendance marking
    const loadAttList = () => {
        const filtered = students.filter((s) => s.course === attCourse && s.batch === attBatch);
        if (filtered.length === 0) { alert('No Students'); return; }
        setAttList(filtered.map((s) => ({ ...s, present: true })));
        setShowAttBox(true);
    };

    const toggleAtt = (index) => {
        setAttList((prev) => prev.map((s, i) => i === index ? { ...s, present: !s.present } : s));
    };

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

    const loadReport = async () => {
        if (!repDate) return;
        setLoadingReport(true);
        const result = await getDailyAttendanceReport(repDate);
        setReportData(Array.isArray(result) ? result : []);
        setLoadingReport(false);
    };

    // --- Analysis Data Processing ---
    const analysisData = useMemo(() => {
        if (!allAttendance.length) return { dayRows: [], monthRows: [], totalPresent: 0, totalAbsent: 0, totalDays: 0, percentage: 0 };

        // Filter by course
        let filtered = allAttendance;
        if (analysisCourse !== 'All') {
            filtered = filtered.filter(r => r.course === analysisCourse);
        }

        if (analysisView === 'month') {
            // Filter by month + year
            const monthFiltered = filtered.filter(r => {
                const d = new Date(r.date);
                return d.getMonth() === analysisMonth && d.getFullYear() === analysisYear;
            });

            // Group by student + day
            const studentDayMap = {};
            monthFiltered.forEach(r => {
                const d = new Date(r.date);
                const day = d.getDate();
                const key = `${r.id}_${day}`;
                if (!studentDayMap[key]) {
                    studentDayMap[key] = {
                        id: r.id, name: r.name, course: r.course,
                        day, dateStr: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
                        checkIn: null, checkOut: null, status: r.status,
                        isPresent: false,
                    };
                }
                const status = String(r.status).toLowerCase();
                if (status.includes('check-in') || status.includes('present')) {
                    studentDayMap[key].isPresent = true;
                    studentDayMap[key].checkIn = d;
                }
                if (status.includes('check-out')) {
                    studentDayMap[key].checkOut = d;
                }
                if (status.includes('absent')) {
                    studentDayMap[key].isPresent = false;
                }
            });

            const dayRows = Object.values(studentDayMap).sort((a, b) => {
                if (a.day !== b.day) return a.day - b.day;
                return a.name.localeCompare(b.name);
            }).map(r => {
                // Calculate hours
                let hours = '--';
                if (r.checkIn && r.checkOut) {
                    const diff = (r.checkOut - r.checkIn) / (1000 * 60 * 60);
                    hours = diff.toFixed(1) + 'h';
                }
                return { ...r, hours };
            });

            const present = dayRows.filter(r => r.isPresent).length;
            const total = dayRows.length;
            const absent = total - present;
            const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

            return { dayRows, monthRows: [], totalPresent: present, totalAbsent: absent, totalDays: total, percentage };
        } else {
            // Year view — group by month
            const yearFiltered = filtered.filter(r => {
                const d = new Date(r.date);
                return d.getFullYear() === analysisYear;
            });

            const monthRows = MONTHS.map((name, idx) => {
                const mFiltered = yearFiltered.filter(r => new Date(r.date).getMonth() === idx);

                // Unique student-day combos
                const dayMap = {};
                mFiltered.forEach(r => {
                    const day = new Date(r.date).getDate();
                    const key = `${r.id}_${day}`;
                    if (!dayMap[key]) dayMap[key] = { isPresent: false, checkIn: null, checkOut: null };
                    const status = String(r.status).toLowerCase();
                    if (status.includes('check-in') || status.includes('present')) dayMap[key].isPresent = true;
                    if (status.includes('check-in')) dayMap[key].checkIn = new Date(r.date);
                    if (status.includes('check-out')) dayMap[key].checkOut = new Date(r.date);
                });

                const entries = Object.values(dayMap);
                const present = entries.filter(e => e.isPresent).length;
                const total = entries.length;
                const absent = total - present;
                const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

                // Average hours
                let totalHours = 0, hoursCount = 0;
                entries.forEach(e => {
                    if (e.checkIn && e.checkOut) {
                        totalHours += (e.checkOut - e.checkIn) / (1000 * 60 * 60);
                        hoursCount++;
                    }
                });
                const avgHours = hoursCount > 0 ? (totalHours / hoursCount).toFixed(1) : '--';

                return { name, month: idx, present, absent, total, percentage, avgHours };
            });

            const totalPresent = monthRows.reduce((s, m) => s + m.present, 0);
            const totalDays = monthRows.reduce((s, m) => s + m.total, 0);
            const totalAbsent = totalDays - totalPresent;
            const percentage = totalDays > 0 ? Math.round((totalPresent / totalDays) * 100) : 0;

            return { dayRows: [], monthRows, totalPresent, totalAbsent, totalDays, percentage };
        }
    }, [allAttendance, analysisCourse, analysisMonth, analysisYear, analysisView]);

    const getPercColor = (p) => p >= 75 ? '#10b981' : p >= 50 ? '#f59e0b' : '#ef4444';

    // Get unique courses from attendance data
    const availableCourses = useMemo(() => {
        const courses = [...new Set(allAttendance.map(r => r.course).filter(Boolean))];
        return ['All', ...courses];
    }, [allAttendance]);

    const availableYears = useMemo(() => {
        const years = [...new Set(allAttendance.map(r => new Date(r.date).getFullYear()))];
        if (!years.includes(currentYear)) years.push(currentYear);
        return years.sort((a, b) => b - a);
    }, [allAttendance]);

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Attendance</h1>

            {/* Sub-tabs */}
            <div className="flex gap-4 border-b mb-6" style={{ borderColor: 'rgba(99,102,241,0.2)' }}>
                {[
                    { id: 'mark', label: '📝 Mark Attendance' },
                    { id: 'view', label: '📋 Daily Report' },
                    { id: 'analysis', label: '📊 Analysis' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        className={`px-4 py-2 font-semibold text-sm transition-all ${subTab === tab.id ? 'border-b-2 font-bold' : 'opacity-50 hover:opacity-80'}`}
                        style={{ borderColor: subTab === tab.id ? '#6366f1' : 'transparent', color: subTab === tab.id ? '#6366f1' : undefined }}
                        onClick={() => setSubTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* === Mark Attendance === */}
            {subTab === 'mark' && (
                <div>
                    <div className="card mb-4 flex flex-wrap gap-4 p-4">
                        <select className="inp" style={{ width: '180px', marginBottom: 0 }} value={attCourse} onChange={(e) => setAttCourse(e.target.value)}>
                            <option value="">Select Course</option>
                            {(dropdowns.courses || []).map((c) => <option key={c}>{c}</option>)}
                        </select>
                        <select className="inp" style={{ width: '160px', marginBottom: 0 }} value={attBatch} onChange={(e) => setAttBatch(e.target.value)}>
                            <option>08-10 AM</option>
                            <option>10-12 PM</option>
                            <option>04-06 PM</option>
                        </select>
                        <input className="inp" style={{ width: '180px', marginBottom: 0 }} type="date" value={attDate} onChange={(e) => setAttDate(e.target.value)} />
                        <button className="btn" onClick={loadAttList}>Load Students</button>
                    </div>

                    {showAttBox && (
                        <div className="card">
                            <table className="w-full mb-4">
                                <thead className="t-head">
                                    <tr><th>Name</th><th>Status</th></tr>
                                </thead>
                                <tbody>
                                    {attList.map((s, i) => (
                                        <tr key={s.id} className="t-row">
                                            <td className="font-bold">{s.name}</td>
                                            <td>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="checkbox" checked={s.present} onChange={() => toggleAtt(i)} className="w-5 h-5" />
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

            {/* === Daily Report === */}
            {subTab === 'view' && (
                <div>
                    <div className="card mb-4 flex gap-4 p-4 items-center">
                        <label className="font-bold text-sm">Select Date:</label>
                        <input className="inp" style={{ width: '200px', marginBottom: 0 }} type="date" value={repDate} onChange={(e) => setRepDate(e.target.value)} />
                        <button className="btn" onClick={loadReport}>Get Report</button>
                    </div>

                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <table className="w-full text-left">
                            <thead className="t-head">
                                <tr><th>ID</th><th>Name</th><th>Check-In</th><th>Check-Out</th><th>Hours</th><th>Status</th></tr>
                            </thead>
                            <tbody>
                                {loadingReport ? (
                                    <tr><td colSpan={6} className="p-4 text-center">Loading...</td></tr>
                                ) : reportData.length > 0 ? (
                                    reportData.map((r, i) => {
                                        // Calculate hours
                                        let hours = '--';
                                        if (r.in !== '--:--' && r.out !== '--:--') {
                                            try {
                                                const parseTime = (t) => {
                                                    const parts = t.match(/(\d+):(\d+)\s?(AM|PM)?/i);
                                                    if (!parts) return null;
                                                    let h = parseInt(parts[1]), m = parseInt(parts[2]);
                                                    if (parts[3]?.toUpperCase() === 'PM' && h !== 12) h += 12;
                                                    if (parts[3]?.toUpperCase() === 'AM' && h === 12) h = 0;
                                                    return h * 60 + m;
                                                };
                                                const inMin = parseTime(r.in);
                                                const outMin = parseTime(r.out);
                                                if (inMin !== null && outMin !== null) {
                                                    const diff = (outMin - inMin) / 60;
                                                    hours = diff > 0 ? diff.toFixed(1) + 'h' : '--';
                                                }
                                            } catch { hours = '--'; }
                                        }
                                        return (
                                            <tr key={i} className="t-row">
                                                <td>{r.id}</td>
                                                <td className="font-bold">{r.name}</td>
                                                <td style={{ color: '#10b981', fontWeight: 600 }}>{r.in}</td>
                                                <td style={{ color: '#ef4444', fontWeight: 600 }}>{r.out}</td>
                                                <td className="font-mono font-bold" style={{ color: '#6366f1' }}>{hours}</td>
                                                <td><Badge text={r.status} variant="blue" /></td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr><td colSpan={6} className="p-4 text-center opacity-40">Select a date to view logs</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* === Analysis Tab === */}
            {subTab === 'analysis' && (
                <div>
                    {/* Filters */}
                    <div className="card mb-4">
                        <div className="flex flex-wrap gap-3 items-center justify-between">
                            <div className="flex gap-2">
                                <button
                                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${analysisView === 'month' ? 'text-white' : 'opacity-50'}`}
                                    style={{ background: analysisView === 'month' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent' }}
                                    onClick={() => setAnalysisView('month')}
                                >
                                    📅 Month View
                                </button>
                                <button
                                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${analysisView === 'year' ? 'text-white' : 'opacity-50'}`}
                                    style={{ background: analysisView === 'year' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent' }}
                                    onClick={() => setAnalysisView('year')}
                                >
                                    📊 Year View
                                </button>
                            </div>
                            <div className="flex gap-2 items-center flex-wrap">
                                <select className="inp" style={{ width: 'auto', marginBottom: 0 }} value={analysisCourse} onChange={(e) => setAnalysisCourse(e.target.value)}>
                                    {availableCourses.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                {analysisView === 'month' && (
                                    <select className="inp" style={{ width: 'auto', marginBottom: 0 }} value={analysisMonth} onChange={(e) => setAnalysisMonth(Number(e.target.value))}>
                                        {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                                    </select>
                                )}
                                <select className="inp" style={{ width: 'auto', marginBottom: 0 }} value={analysisYear} onChange={(e) => setAnalysisYear(Number(e.target.value))}>
                                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                        <div className="stat-card">
                            <div>
                                <div className="text-xs font-bold opacity-50">Total Records</div>
                                <div className="text-2xl font-bold" style={{ color: '#6366f1' }}>{analysisData.totalDays}</div>
                            </div>
                            <div className="text-3xl opacity-20">📋</div>
                        </div>
                        <div className="stat-card">
                            <div>
                                <div className="text-xs font-bold opacity-50">Present</div>
                                <div className="text-2xl font-bold" style={{ color: '#10b981' }}>{analysisData.totalPresent}</div>
                            </div>
                            <div className="text-3xl opacity-20">✅</div>
                        </div>
                        <div className="stat-card">
                            <div>
                                <div className="text-xs font-bold opacity-50">Absent</div>
                                <div className="text-2xl font-bold" style={{ color: '#ef4444' }}>{analysisData.totalAbsent}</div>
                            </div>
                            <div className="text-3xl opacity-20">❌</div>
                        </div>
                        <div className="stat-card">
                            <div>
                                <div className="text-xs font-bold opacity-50">Percentage</div>
                                <div className="text-2xl font-bold" style={{ color: getPercColor(analysisData.percentage) }}>
                                    {analysisData.percentage}%
                                </div>
                            </div>
                            <div className="text-3xl opacity-20">📈</div>
                        </div>
                    </div>

                    {/* Analysis Table */}
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        {analysisView === 'month' ? (
                            <table className="w-full">
                                <thead>
                                    <tr className="t-head">
                                        <th>#</th>
                                        <th>Date</th>
                                        <th>Student ID</th>
                                        <th>Name</th>
                                        <th>Course</th>
                                        <th>Status</th>
                                        <th>Hours</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {analysisData.dayRows.length > 0 ? (
                                        analysisData.dayRows.map((r, i) => (
                                            <tr key={i} className="t-row">
                                                <td className="font-mono text-sm opacity-50">{i + 1}</td>
                                                <td className="font-semibold">{r.dateStr}</td>
                                                <td className="font-mono text-sm">{r.id}</td>
                                                <td className="font-bold">{r.name}</td>
                                                <td className="text-sm">{r.course}</td>
                                                <td>
                                                    <Badge text={r.isPresent ? 'Present' : 'Absent'} variant={r.isPresent ? 'green' : 'red'} />
                                                </td>
                                                <td className="font-mono font-bold" style={{ color: r.hours !== '--' ? '#6366f1' : '#94a3b8' }}>
                                                    {r.hours}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={7} className="text-center py-8 opacity-40">
                                                No attendance data for {MONTHS[analysisMonth]} {analysisYear}
                                                {analysisCourse !== 'All' ? ` (${analysisCourse})` : ''}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        ) : (
                            <table className="w-full">
                                <thead>
                                    <tr className="t-head">
                                        <th>Month</th>
                                        <th>Total</th>
                                        <th>Present</th>
                                        <th>Absent</th>
                                        <th>Avg Hours</th>
                                        <th>Percentage</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {analysisData.monthRows.map((m, i) => (
                                        <tr key={i} className="t-row" style={{ opacity: m.total === 0 ? 0.35 : 1 }}>
                                            <td className="font-semibold">{m.name} {analysisYear}</td>
                                            <td>{m.total}</td>
                                            <td style={{ color: '#10b981', fontWeight: 600 }}>{m.present}</td>
                                            <td style={{ color: '#ef4444', fontWeight: 600 }}>{m.absent}</td>
                                            <td className="font-mono" style={{ color: '#6366f1', fontWeight: 600 }}>{m.avgHours}{m.avgHours !== '--' ? 'h' : ''}</td>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <div className="progress-bar" style={{ width: '80px', height: '6px', marginTop: 0 }}>
                                                        <div className="progress-fill" style={{ width: `${m.percentage}%` }} />
                                                    </div>
                                                    <span className="font-bold text-sm" style={{ color: getPercColor(m.percentage) }}>
                                                        {m.percentage}%
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="t-row" style={{ fontWeight: 700 }}>
                                        <td className="font-bold" style={{ color: '#6366f1' }}>TOTAL</td>
                                        <td className="font-bold">{analysisData.totalDays}</td>
                                        <td className="font-bold" style={{ color: '#10b981' }}>{analysisData.totalPresent}</td>
                                        <td className="font-bold" style={{ color: '#ef4444' }}>{analysisData.totalAbsent}</td>
                                        <td>--</td>
                                        <td>
                                            <span className="font-bold text-lg" style={{ color: getPercColor(analysisData.percentage) }}>
                                                {analysisData.percentage}%
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
