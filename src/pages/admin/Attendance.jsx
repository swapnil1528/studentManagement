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

export default function Attendance({ adminData, user, onReload }) {
    const [subTab, setSubTab] = useState('mark');
    const [saving, setSaving] = useState(false);
    const students = adminData?.activeStudents || [];
    const dropdowns = adminData?.dropdowns || {};

    // Build a photo map: studentId -> photoUrl
    // Admissions data reliably contains photos (index 12)
    // activeStudents may also have a photo property
    const photoMap = useMemo(() => {
        const map = {};
        // From activeStudents
        (adminData?.activeStudents || []).forEach(s => {
            const id = s.id || s.studentId || s[0];
            const photo = s.photo || s.photoUrl || s.profilePic || '';
            if (id && photo && photo.length > 10) map[String(id)] = photo;
        });
        // From admissions (index 2=studId, 12=photo)
        (adminData?.admissions || []).forEach(r => {
            const id = String(r[2] || '');
            const photo = r[12] || '';
            if (id && photo && photo.length > 10) map[id] = photo;
        });
        // From registrations (index 2=studId, 11=photo)
        (adminData?.registrations || []).forEach(r => {
            const id = String(r[2] || '');
            const photo = r[11] || '';
            if (id && photo && photo.length > 10) map[id] = photo;
        });
        return map;
    }, [adminData]);

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
    // --- Analysis: Cross-tabulation (Students × Dates) ---
    const analysisData = useMemo(() => {
        if (!allAttendance.length) return { students: [], daysInMonth: 0, monthRows: [], totalPresent: 0, totalAbsent: 0, totalDays: 0, percentage: 0 };

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

            // Days in selected month
            const daysInMonth = new Date(analysisYear, analysisMonth + 1, 0).getDate();

            // Build student → day → { isPresent, hours } map
            const studentMap = {};
            monthFiltered.forEach(r => {
                const d = new Date(r.date);
                const day = d.getDate();
                const id = r.id;

                if (!studentMap[id]) {
                    studentMap[id] = { id, name: r.name, course: r.course, days: {} };
                }

                if (!studentMap[id].days[day]) {
                    studentMap[id].days[day] = { isPresent: false, checkIn: null, checkOut: null };
                }

                const status = String(r.status).toLowerCase();
                if (status.includes('check-in') || status.includes('present')) {
                    studentMap[id].days[day].isPresent = true;
                    studentMap[id].days[day].checkIn = d;
                }
                if (status.includes('check-out')) {
                    studentMap[id].days[day].checkOut = d;
                }
                if (status.includes('absent')) {
                    studentMap[id].days[day].isPresent = false;
                }
            });

            // Convert to array and compute totals per student
            const students = Object.values(studentMap).sort((a, b) => a.name.localeCompare(b.name)).map(s => {
                let presentCount = 0, absentCount = 0, totalHours = 0;
                for (let d = 1; d <= daysInMonth; d++) {
                    const day = s.days[d];
                    if (day) {
                        if (day.isPresent) presentCount++;
                        else absentCount++;
                        if (day.checkIn && day.checkOut) {
                            totalHours += (day.checkOut - day.checkIn) / (1000 * 60 * 60);
                        }
                    }
                }
                const totalMarked = presentCount + absentCount;
                const percentage = totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : 0;
                return { ...s, presentCount, absentCount, totalHours: totalHours.toFixed(1), percentage };
            });

            const totalPresent = students.reduce((s, st) => s + st.presentCount, 0);
            const totalAbsent = students.reduce((s, st) => s + st.absentCount, 0);
            const totalDays = totalPresent + totalAbsent;
            const percentage = totalDays > 0 ? Math.round((totalPresent / totalDays) * 100) : 0;

            return { students, daysInMonth, monthRows: [], totalPresent, totalAbsent, totalDays, percentage };
        } else {
            // Year view — month-by-month summary
            const yearFiltered = filtered.filter(r => new Date(r.date).getFullYear() === analysisYear);

            const monthRows = MONTHS.map((name, idx) => {
                const mFiltered = yearFiltered.filter(r => new Date(r.date).getMonth() === idx);
                const dayMap = {};
                mFiltered.forEach(r => {
                    const key = `${r.id}_${new Date(r.date).getDate()}`;
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

                let totalHours = 0, hoursCount = 0;
                entries.forEach(e => { if (e.checkIn && e.checkOut) { totalHours += (e.checkOut - e.checkIn) / (1000 * 60 * 60); hoursCount++; } });
                const avgHours = hoursCount > 0 ? (totalHours / hoursCount).toFixed(1) : '--';

                return { name, month: idx, present, absent, total, percentage, avgHours };
            });

            const totalPresent = monthRows.reduce((s, m) => s + m.present, 0);
            const totalDays = monthRows.reduce((s, m) => s + m.total, 0);
            const totalAbsent = totalDays - totalPresent;
            const percentage = totalDays > 0 ? Math.round((totalPresent / totalDays) * 100) : 0;

            return { students: [], daysInMonth: 0, monthRows, totalPresent, totalAbsent, totalDays, percentage };
        }
    }, [allAttendance, analysisCourse, analysisMonth, analysisYear, analysisView]);

    const getPercColor = (p) => p >= 75 ? '#10b981' : p >= 50 ? '#f59e0b' : '#ef4444';

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
                                <thead className="t-head"><tr><th>Name</th><th>Status</th></tr></thead>
                                <tbody>
                                    {attList.map((s, i) => (
                                        <tr key={s.id} className="t-row">
                                            <td className="font-bold">
                                                <div className="flex items-center gap-3">
                                                    {photoMap[String(s.id)] ? (
                                                        <img src={photoMap[String(s.id)]} className="w-8 h-8 rounded-full border object-cover" alt="" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold border border-indigo-100">
                                                            {s.name.substring(0, 2).toUpperCase()}
                                                        </div>
                                                    )}
                                                    {s.name}
                                                </div>
                                            </td>
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
                                        const studentPhoto = photoMap[String(r.id)] || '';

                                        return (
                                            <tr key={i} className="t-row">
                                                <td>{r.id}</td>
                                                <td className="font-bold">
                                                    <div className="flex items-center gap-3">
                                                        {studentPhoto ? (
                                                            <img src={studentPhoto} className="w-8 h-8 rounded-full border object-cover" alt="" />
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold border border-indigo-100">
                                                                {r.name.substring(0, 2).toUpperCase()}
                                                            </div>
                                                        )}
                                                        {r.name}
                                                    </div>
                                                </td>
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

                    {/* Cross-Tabulation Table (Month View) or Year Summary */}
                    <div className="card" style={{ padding: 0, overflow: 'auto' }}>
                        {analysisView === 'month' ? (
                            analysisData.students.length > 0 ? (
                                <table className="w-full text-center" style={{ minWidth: `${analysisData.daysInMonth * 38 + 300}px` }}>
                                    <thead>
                                        <tr className="t-head">
                                            <th style={{ position: 'sticky', left: 0, zIndex: 2, minWidth: '40px', textAlign: 'center' }}>#</th>
                                            <th style={{ position: 'sticky', left: '40px', zIndex: 2, minWidth: '160px', textAlign: 'left' }}>Student Name</th>
                                            {Array.from({ length: analysisData.daysInMonth }, (_, i) => (
                                                <th key={i + 1} style={{ minWidth: '36px', fontSize: '11px', padding: '10px 4px' }}>
                                                    {i + 1}
                                                </th>
                                            ))}
                                            <th style={{ minWidth: '50px', fontSize: '11px' }}>P</th>
                                            <th style={{ minWidth: '50px', fontSize: '11px' }}>A</th>
                                            <th style={{ minWidth: '55px', fontSize: '11px' }}>Hours</th>
                                            <th style={{ minWidth: '55px', fontSize: '11px' }}>%</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {analysisData.students.map((student, idx) => {
                                            const studentPhoto = photoMap[String(student.id)] || '';
                                            return (
                                                <tr key={student.id} className="t-row">
                                                    <td style={{ position: 'sticky', left: 0, zIndex: 1, fontSize: '12px', padding: '8px 4px', background: 'var(--gz-card)' }} className="font-mono opacity-50">
                                                        {idx + 1}
                                                    </td>
                                                    <td style={{ position: 'sticky', left: '40px', zIndex: 1, textAlign: 'left', padding: '8px 10px', whiteSpace: 'nowrap', background: 'var(--gz-card)' }} className="font-semibold text-sm">
                                                        <div className="flex items-center gap-3">
                                                            {studentPhoto ? (
                                                                <img src={studentPhoto} className="w-8 h-8 rounded-full border object-cover" alt="" />
                                                            ) : (
                                                                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold border border-indigo-100 shrink-0">
                                                                    {student.name.substring(0, 2).toUpperCase()}
                                                                </div>
                                                            )}
                                                            <div>
                                                                {student.name}
                                                                <div className="text-[10px] opacity-40">{student.id}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {Array.from({ length: analysisData.daysInMonth }, (_, i) => {
                                                        const day = student.days[i + 1];
                                                        if (!day) {
                                                            return <td key={i + 1} style={{ padding: '8px 2px', fontSize: '11px' }} className="opacity-20">—</td>;
                                                        }
                                                        // Calculate hours for tooltip
                                                        let hrs = '';
                                                        if (day.checkIn && day.checkOut) {
                                                            hrs = ((day.checkOut - day.checkIn) / (1000 * 60 * 60)).toFixed(1) + 'h';
                                                        }
                                                        return (
                                                            <td key={i + 1}
                                                                style={{ padding: '4px 2px', fontSize: '11px' }}
                                                                title={hrs ? `${hrs}` : ''}
                                                            >
                                                                {day.isPresent ? (
                                                                    <span style={{
                                                                        display: 'inline-block', width: '24px', height: '24px', lineHeight: '24px',
                                                                        borderRadius: '6px', fontSize: '10px', fontWeight: 700,
                                                                        background: 'rgba(16,185,129,0.15)', color: '#10b981',
                                                                    }}>P</span>
                                                                ) : (
                                                                    <span style={{
                                                                        display: 'inline-block', width: '24px', height: '24px', lineHeight: '24px',
                                                                        borderRadius: '6px', fontSize: '10px', fontWeight: 700,
                                                                        background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                                                                    }}>A</span>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                    {/* Summary columns */}
                                                    <td className="font-bold text-sm" style={{ color: '#10b981', padding: '8px 4px' }}>{student.presentCount}</td>
                                                    <td className="font-bold text-sm" style={{ color: '#ef4444', padding: '8px 4px' }}>{student.absentCount}</td>
                                                    <td className="font-mono text-sm font-bold" style={{ color: '#6366f1', padding: '8px 4px' }}>{student.totalHours}h</td>
                                                    <td className="font-bold text-sm" style={{ color: getPercColor(student.percentage), padding: '8px 4px' }}>{student.percentage}%</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="text-center py-12 opacity-40">
                                    No attendance data for {MONTHS[analysisMonth]} {analysisYear}
                                    {analysisCourse !== 'All' ? ` (${analysisCourse})` : ''}
                                </div>
                            )
                        ) : (
                            /* Year View Table */
                            <table className="w-full">
                                <thead>
                                    <tr className="t-head">
                                        <th>Month</th><th>Total</th><th>Present</th><th>Absent</th><th>Avg Hours</th><th>Percentage</th>
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
                                                    <span className="font-bold text-sm" style={{ color: getPercColor(m.percentage) }}>{m.percentage}%</span>
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
                                            <span className="font-bold text-lg" style={{ color: getPercColor(analysisData.percentage) }}>{analysisData.percentage}%</span>
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
