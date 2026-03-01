/**
 * AttendanceView — Reusable attendance report component.
 * Shows month-wise and year-wise attendance in a table
 * with present/absent counts and percentage.
 *
 * Props:
 *   logs - Array of { time, status } from the portal data
 *   type - 'student' or 'employee' (affects status field parsing)
 */

import { useState, useMemo } from 'react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function AttendanceView({ logs = [], type = 'student' }) {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    const [viewMode, setViewMode] = useState('month'); // 'month' or 'year'
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonth, setSelectedMonth] = useState(currentMonth);

    // Parse all log entries into structured data
    const parsedLogs = useMemo(() => {
        return logs.map(log => {
            const date = new Date(log.time);
            const status = String(log.status || '').toLowerCase();
            // Count as present if status contains check-in or present
            const isPresent = status.includes('check-in') || status.includes('present');
            const isAbsent = status.includes('absent');
            return {
                date,
                year: date.getFullYear(),
                month: date.getMonth(),
                day: date.getDate(),
                dateStr: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                timeStr: date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                status: log.status,
                isPresent,
                isAbsent,
            };
        });
    }, [logs]);

    // Get unique years from logs
    const availableYears = useMemo(() => {
        const years = [...new Set(parsedLogs.map(l => l.year))];
        if (!years.includes(currentYear)) years.push(currentYear);
        return years.sort((a, b) => b - a);
    }, [parsedLogs]);

    // --- MONTH VIEW: Filter by selected month + year ---
    const monthData = useMemo(() => {
        const filtered = parsedLogs.filter(l => l.year === selectedYear && l.month === selectedMonth);

        const dayMap = {};
        filtered.forEach(log => {
            const dayKey = log.day;
            if (!dayMap[dayKey]) {
                dayMap[dayKey] = { day: dayKey, dateStr: log.dateStr, entries: [], isPresent: false };
            }
            dayMap[dayKey].entries.push(log);
            if (log.isPresent) dayMap[dayKey].isPresent = true;
        });

        // Determine how many days to show in the month
        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        const isCurrentMonth = currentYear === selectedYear && currentMonth === selectedMonth;
        const maxDay = isCurrentMonth ? new Date().getDate() : daysInMonth;

        const days = [];
        let present = 0;
        let absent = 0;
        let holidays = 0;

        for (let d = 1; d <= maxDay; d++) {
            const dateObj = new Date(selectedYear, selectedMonth, d);
            const isSunday = dateObj.getDay() === 0;
            const dateStr = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

            const dayRecord = dayMap[d] || { day: d, dateStr, entries: [], isPresent: false };

            if (isSunday) {
                holidays++;
            } else {
                if (dayRecord.isPresent) present++;
                else absent++;
            }

            days.push({
                ...dayRecord,
                isSunday
            });
        }

        const totalWorkingDays = days.length - holidays;
        const percentage = totalWorkingDays > 0 ? Math.round((present / totalWorkingDays) * 100) : 0;

        return { days, present, absent, holidays, totalDays: totalWorkingDays, percentage };
    }, [parsedLogs, selectedYear, selectedMonth, currentYear, currentMonth]);

    // --- YEAR VIEW: Show month-by-month summary for selected year ---
    const yearData = useMemo(() => {
        const filtered = parsedLogs.filter(l => l.year === selectedYear);

        const monthSummary = MONTHS.map((name, idx) => {
            const monthLogs = filtered.filter(l => l.month === idx);

            // Unique days
            const dayMap = {};
            monthLogs.forEach(log => {
                if (!dayMap[log.day]) dayMap[log.day] = { isPresent: false };
                if (log.isPresent) dayMap[log.day].isPresent = true;
            });

            const days = Object.values(dayMap);
            const present = days.filter(d => d.isPresent).length;
            const total = days.length;
            const absent = total - present;
            const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

            return { name, month: idx, present, absent, total, percentage };
        });

        // Overall totals
        const totalPresent = monthSummary.reduce((s, m) => s + m.present, 0);
        const totalDays = monthSummary.reduce((s, m) => s + m.total, 0);
        const totalAbsent = totalDays - totalPresent;
        const totalPercentage = totalDays > 0 ? Math.round((totalPresent / totalDays) * 100) : 0;

        return { months: monthSummary, totalPresent, totalAbsent, totalDays, totalPercentage };
    }, [parsedLogs, selectedYear]);

    // Percentage color helper
    const getPercColor = (perc) => {
        if (perc >= 75) return '#10b981';
        if (perc >= 50) return '#f59e0b';
        return '#ef4444';
    };

    return (
        <div>
            {/* Controls bar */}
            <div className="card">
                <div className="flex flex-wrap gap-3 items-center justify-between">
                    {/* View mode toggle */}
                    <div className="flex gap-2">
                        <button
                            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${viewMode === 'month' ? 'text-white' : 'opacity-60'}`}
                            style={{
                                background: viewMode === 'month' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                            }}
                            onClick={() => setViewMode('month')}
                        >
                            📅 Month View
                        </button>
                        <button
                            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${viewMode === 'year' ? 'text-white' : 'opacity-60'}`}
                            style={{
                                background: viewMode === 'year' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                            }}
                            onClick={() => setViewMode('year')}
                        >
                            📊 Year View
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="flex gap-2 items-center">
                        {viewMode === 'month' && (
                            <select
                                className="inp"
                                style={{ width: 'auto', marginBottom: 0 }}
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            >
                                {MONTHS.map((m, i) => (
                                    <option key={i} value={i}>{m}</option>
                                ))}
                            </select>
                        )}
                        <select
                            className="inp"
                            style={{ width: 'auto', marginBottom: 0 }}
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                        >
                            {availableYears.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                <div className="stat-card">
                    <div>
                        <div className="text-xs font-bold opacity-50">Total Days</div>
                        <div className="text-2xl font-bold" style={{ color: '#6366f1' }}>
                            {viewMode === 'month' ? monthData.totalDays : yearData.totalDays}
                        </div>
                    </div>
                    <div className="text-3xl opacity-20">📋</div>
                </div>
                <div className="stat-card">
                    <div>
                        <div className="text-xs font-bold opacity-50">Present</div>
                        <div className="text-2xl font-bold" style={{ color: '#10b981' }}>
                            {viewMode === 'month' ? monthData.present : yearData.totalPresent}
                        </div>
                    </div>
                    <div className="text-3xl opacity-20">✅</div>
                </div>
                <div className="stat-card">
                    <div>
                        <div className="text-xs font-bold opacity-50">Absent</div>
                        <div className="text-2xl font-bold" style={{ color: '#ef4444' }}>
                            {viewMode === 'month' ? monthData.absent : yearData.totalAbsent}
                        </div>
                    </div>
                    <div className="text-3xl opacity-20">❌</div>
                </div>
                <div className="stat-card">
                    <div>
                        <div className="text-xs font-bold opacity-50">Percentage</div>
                        <div className="text-2xl font-bold" style={{
                            color: getPercColor(viewMode === 'month' ? monthData.percentage : yearData.totalPercentage)
                        }}>
                            {viewMode === 'month' ? monthData.percentage : yearData.totalPercentage}%
                        </div>
                    </div>
                    <div className="text-3xl opacity-20">📈</div>
                </div>
            </div>

            {/* Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {viewMode === 'month' ? (
                    /* === MONTH VIEW TABLE === */
                    <table className="w-full">
                        <thead>
                            <tr className="t-head">
                                <th>#</th>
                                <th>Date</th>
                                <th>Status</th>
                                <th>Check-In</th>
                                <th>Check-Out</th>
                            </tr>
                        </thead>
                        <tbody>
                            {monthData.days.length > 0 ? (
                                monthData.days.map((day, i) => {
                                    const checkIn = day.entries.find(e => String(e.status).toLowerCase().includes('check-in'));
                                    const checkOut = day.entries.find(e => String(e.status).toLowerCase().includes('check-out'));
                                    return (
                                        <tr key={i} className={`t-row ${day.isSunday ? 'bg-yellow-50' : ''}`} style={day.isSunday ? { backgroundColor: '#fef3c7' } : {}}>
                                            <td className={`font-mono text-sm opacity-50 ${day.isSunday ? 'text-yellow-800' : ''}`}>{day.day}</td>
                                            <td className={`font-semibold ${day.isSunday ? 'text-yellow-900' : ''}`}>{day.dateStr}</td>
                                            <td>
                                                {day.isSunday ? (
                                                    <span className="badge" style={{ backgroundColor: '#fde68a', color: '#92400e', border: '1px solid #fcd34d' }}>
                                                        Holiday (Sunday)
                                                    </span>
                                                ) : (
                                                    <span className={`badge ${day.isPresent ? 'b-green' : 'b-red'}`}>
                                                        {day.isPresent ? 'Present' : 'Absent'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className={`text-sm ${day.isSunday ? 'text-yellow-800' : ''}`}>{checkIn ? checkIn.timeStr : '--:--'}</td>
                                            <td className={`text-sm ${day.isSunday ? 'text-yellow-800' : ''}`}>{checkOut ? checkOut.timeStr : '--:--'}</td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="5" className="text-center py-8 opacity-40">
                                        No attendance records for {MONTHS[selectedMonth]} {selectedYear}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                ) : (
                    /* === YEAR VIEW TABLE === */
                    <table className="w-full">
                        <thead>
                            <tr className="t-head">
                                <th>Month</th>
                                <th>Total Days</th>
                                <th>Present</th>
                                <th>Absent</th>
                                <th>Percentage</th>
                            </tr>
                        </thead>
                        <tbody>
                            {yearData.months.map((m, i) => (
                                <tr key={i} className="t-row" style={{ opacity: m.total === 0 ? 0.4 : 1 }}>
                                    <td className="font-semibold">{m.name} {selectedYear}</td>
                                    <td>{m.total}</td>
                                    <td style={{ color: '#10b981', fontWeight: 600 }}>{m.present}</td>
                                    <td style={{ color: '#ef4444', fontWeight: 600 }}>{m.absent}</td>
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
                            {/* Totals row */}
                            <tr className="t-row" style={{ background: 'rgba(99,102,241,0.05)', fontWeight: 700 }}>
                                <td className="font-bold" style={{ color: '#6366f1' }}>TOTAL</td>
                                <td className="font-bold">{yearData.totalDays}</td>
                                <td className="font-bold" style={{ color: '#10b981' }}>{yearData.totalPresent}</td>
                                <td className="font-bold" style={{ color: '#ef4444' }}>{yearData.totalAbsent}</td>
                                <td>
                                    <span className="font-bold text-lg" style={{ color: getPercColor(yearData.totalPercentage) }}>
                                        {yearData.totalPercentage}%
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
