import { useState, useMemo } from 'react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function EmployeeAttendanceMatrix({ employees = [], logs = [], leaves = [] }) {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonth, setSelectedMonth] = useState(currentMonth);
    const [viewMode, setViewMode] = useState('status'); // 'status' | 'time'

    // Get unique years
    const availableYears = useMemo(() => {
        const years = [...new Set(logs.map(l => new Date(l.time).getFullYear()))];
        if (!years.includes(currentYear)) years.push(currentYear);
        return years.sort((a, b) => b - a);
    }, [logs, currentYear]);

    // Parse logs and organize by employee and day
    const matrixData = useMemo(() => {
        const currentDate = new Date();
        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

        // If we selected a future month/year, render nothing or up to 0 days
        let maxDay = daysInMonth;
        if (selectedYear === currentDate.getFullYear() && selectedMonth === currentDate.getMonth()) {
            maxDay = currentDate.getDate(); // Restrict to today for current month
        } else if (selectedYear > currentDate.getFullYear() || (selectedYear === currentDate.getFullYear() && selectedMonth > currentDate.getMonth())) {
            maxDay = 0; // Future months have no working days yet
        }

        // Create an array of days [1...maxDay]
        const daysToRender = [];
        let totalHolidays = 0;
        for (let d = 1; d <= maxDay; d++) {
            const dateObj = new Date(selectedYear, selectedMonth, d);
            const isSunday = dateObj.getDay() === 0;
            if (isSunday) totalHolidays++;
            daysToRender.push({
                day: d,
                isSunday
            });
        }
        const totalWorkingDays = maxDay - totalHolidays;

        // Group logs by employee -> day
        // Log structure expected from adminData.empAttendance:
        // { time, empId, name, status, loc, dist, date }

        const empRows = employees.map(emp => {
            const empLogs = logs.filter(l => String(l.empId) === String(emp.id));
            const empLeaves = leaves.filter(l => String(l.empId) === String(emp.id));

            // Map day -> array of logs
            const logsByDay = {};
            empLogs.forEach(log => {
                const logDate = new Date(log.time);
                if (logDate.getFullYear() === selectedYear && logDate.getMonth() === selectedMonth) {
                    const d = logDate.getDate();
                    if (!logsByDay[d]) logsByDay[d] = [];
                    logsByDay[d].push(log);
                }
            });

            let empWorkingDays = totalWorkingDays;
            let presentCount = 0;
            let absentCount = 0;
            let leaveCount = 0;

            // Process each day
            const dailyData = daysToRender.map(dayObj => {
                const dayLogs = logsByDay[dayObj.day] || [];
                const checkIn = dayLogs.find(l => String(l.status).toLowerCase().includes('check-in'));
                const checkOut = dayLogs.find(l => String(l.status).toLowerCase().includes('check-out'));

                // Present if there's any valid log for the day
                const isPresent = dayLogs.length > 0;
                let isLeave = false;

                // Check leave
                if (!isPresent && !dayObj.isSunday) {
                    const currentDateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(dayObj.day).padStart(2, '0')}`;
                    isLeave = empLeaves.some(lv => {
                        return currentDateStr >= lv.fromDate && currentDateStr <= lv.toDate;
                    });
                }

                // Tallying counts dynamically for this employee
                if (dayObj.isSunday) {
                    if (isPresent) {
                        presentCount++;
                        empWorkingDays++; // Worked on a holiday, counts towards their total working days
                    }
                } else {
                    if (isPresent) {
                        presentCount++;
                    } else if (isLeave) {
                        leaveCount++;
                        empWorkingDays--; // Approved leave reduces required working days
                    } else {
                        absentCount++;
                    }
                }

                let timeText = '--';
                if (viewMode === 'time') {
                    const inTime = checkIn ? new Date(checkIn.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '--';
                    const outTime = checkOut ? new Date(checkOut.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '--';

                    if (checkIn || checkOut) {
                        timeText = (
                            <div className="text-[10px] leading-tight flex flex-col items-center">
                                <span className="text-green-700 font-bold">{inTime}</span>
                                <span className="text-red-700 font-bold">{outTime}</span>
                            </div>
                        );
                    }
                }

                return {
                    day: dayObj.day,
                    isSunday: dayObj.isSunday,
                    isPresent,
                    isLeave,
                    checkIn,
                    checkOut,
                    timeText
                };
            });

            const perc = empWorkingDays > 0 ? Math.round((presentCount / empWorkingDays) * 100) : 0;

            return {
                emp,
                dailyData,
                presentCount,
                absentCount,
                leaveCount,
                perc
            };
        });

        return {
            daysToRender,
            empRows,
            totalWorkingDays
        };
    }, [employees, logs, selectedYear, selectedMonth, currentYear, currentMonth, viewMode]);

    return (
        <div className="card p-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        className={`px-4 py-2 rounded-md text-sm font-bold transition ${viewMode === 'status' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:bg-gray-200'}`}
                        onClick={() => setViewMode('status')}
                    >
                        ✓/✗ Status Mode
                    </button>
                    <button
                        className={`px-4 py-2 rounded-md text-sm font-bold transition ${viewMode === 'time' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:bg-gray-200'}`}
                        onClick={() => setViewMode('time')}
                    >
                        ⏱️ Time Tracker
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <select
                        className="inp m-0"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    >
                        {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                    <select
                        className="inp m-0"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                    >
                        {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            {/* Matrix Table */}
            <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
                <table className="w-full border-collapse text-sm min-w-max">
                    <thead>
                        <tr>
                            <th className="p-3 border sticky left-0 bg-gray-50 z-10 text-left min-w-[150px] shadow-sm">
                                Employee
                            </th>
                            {matrixData.daysToRender.map(d => (
                                <th
                                    key={d.day}
                                    className={`p-2 border text-center font-bold ${d.isSunday ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-50'}`}
                                >
                                    {d.day}
                                </th>
                            ))}
                            <th className="p-2 border bg-green-50 text-green-800 text-center font-bold">P</th>
                            <th className="p-2 border bg-red-50 text-red-800 text-center font-bold">A</th>
                            <th className="p-2 border bg-blue-50 text-blue-800 text-center font-bold">L</th>
                            <th className="p-2 border bg-gray-100 text-gray-800 text-center font-bold">%</th>
                        </tr>
                    </thead>
                    <tbody>
                        {matrixData.empRows.map((row, i) => (
                            <tr key={row.emp.id} className="hover:bg-gray-50 transition">
                                <td className="p-3 border sticky left-0 bg-white z-10 font-bold shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] truncate max-w-[200px]" title={row.emp.name}>
                                    <div>{row.emp.name}</div>
                                    <div className="text-[10px] text-gray-400 font-normal">{row.emp.role}</div>
                                </td>

                                {row.dailyData.map(d => {
                                    // Highlight Sunday ONLY if they didn't work on it
                                    const showSundayBg = d.isSunday && !d.isPresent;

                                    return (
                                        <td
                                            key={d.day}
                                            className={`border text-center align-middle ${showSundayBg ? 'bg-yellow-50' : ''}`}
                                            style={{ minWidth: viewMode === 'time' ? '70px' : '40px', padding: viewMode === 'time' ? '4px' : '8px' }}
                                        >
                                            {viewMode === 'status' ? (
                                                d.isPresent ? (
                                                    <span className="text-green-600 font-bold">P</span>
                                                ) : d.isLeave ? (
                                                    <span className="text-blue-600 font-bold bg-blue-50 px-1 rounded">L</span>
                                                ) : d.isSunday ? (
                                                    <span className="text-yellow-600 font-bold text-xs opacity-70">S</span>
                                                ) : (
                                                    <span className="text-red-400 font-bold opacity-70">A</span>
                                                )
                                            ) : (
                                                d.isPresent ? (
                                                    d.timeText
                                                ) : d.isLeave ? (
                                                    <span className="text-blue-600 font-bold text-[10px] opacity-70">Leave</span>
                                                ) : d.isSunday ? (
                                                    <span className="text-yellow-600 font-bold text-[10px] opacity-70">S</span>
                                                ) : (
                                                    <span className="text-red-400 font-bold opacity-70">-</span>
                                                )
                                            )}
                                        </td>
                                    );
                                })}

                                <td className="p-2 border text-center font-bold text-green-600 bg-green-50/30">{row.presentCount}</td>
                                <td className="p-2 border text-center font-bold text-red-500 bg-red-50/30">{row.absentCount}</td>
                                <td className="p-2 border text-center font-bold text-blue-600 bg-blue-50/30">{row.leaveCount || '-'}</td>
                                <td className="p-2 border text-center font-bold text-gray-700 bg-gray-50">{row.perc}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {matrixData.empRows.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                        No employees found.
                    </div>
                )}
            </div>

            {/* Legend */}
            {viewMode === 'time' ? (
                <div className="flex flex-wrap gap-4 mt-4 text-xs justify-center items-center bg-gray-50 p-2 rounded border">
                    <span className="font-bold whitespace-nowrap"><span className="text-green-700">Top Time:</span> In</span>
                    <span className="font-bold whitespace-nowrap"><span className="text-red-700">Bottom Time:</span> Out</span>
                    <span className="font-bold whitespace-nowrap"><span className="text-yellow-600 bg-yellow-100 px-1 rounded">S:</span> Sunday/Holiday</span>
                    <span className="font-bold whitespace-nowrap"><span className="text-blue-600 bg-blue-100 px-1 rounded">Leave:</span> Approved Leave</span>
                </div>
            ) : (
                <div className="flex flex-wrap gap-4 mt-4 text-xs justify-center items-center bg-gray-50 p-2 rounded border">
                    <span className="font-bold whitespace-nowrap"><span className="text-green-600">P:</span> Present</span>
                    <span className="font-bold whitespace-nowrap"><span className="text-red-400">A:</span> Absent</span>
                    <span className="font-bold whitespace-nowrap"><span className="text-blue-600 bg-blue-100 px-1 rounded">L:</span> Approved Leave</span>
                    <span className="font-bold whitespace-nowrap"><span className="text-yellow-600 bg-yellow-100 px-1 rounded">S:</span> Sunday</span>
                </div>
            )}
        </div>
    );
}
