/**
 * AssignmentAnalysis — Admin page for analyzing student assignment submissions.
 * Shows tabular data: Student Name + Batch in rows, Assignment Count in columns.
 * Includes Course-wise and Batch filters.
 * Reads from the Assignments sheet via API.
 */

import { useState, useEffect, useMemo } from 'react';
import { apiCall } from '../../services/api';
import { setLoading } from '../../components/ui/LoadingBar';

export default function AssignmentAnalysis({ adminData }) {
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoadingState] = useState(true);

    // Filters
    const [filterCourse, setFilterCourse] = useState('');
    const [filterBatch, setFilterBatch] = useState('');

    // Get active students and dropdowns from adminData
    const activeStudents = adminData?.activeStudents || [];
    const batches = [...new Set(activeStudents.map(s => s.batch).filter(Boolean))];
    const courses = [...new Set(activeStudents.map(s => s.course).filter(Boolean))];

    // Load all assignments on mount
    useEffect(() => {
        loadAllAssignments();
    }, []);

    const loadAllAssignments = async () => {
        setLoadingState(true);
        setLoading(true);
        const result = await apiCall('getAllAssignments', {});
        if (result?.success) {
            setAssignments(result.assignments || []);
        }
        setLoading(false);
        setLoadingState(false);
    };

    // Build analysis table data
    const analysisData = useMemo(() => {
        // Filter students by course and batch
        let filteredStudents = activeStudents;
        if (filterCourse) filteredStudents = filteredStudents.filter(s => s.course === filterCourse);
        if (filterBatch) filteredStudents = filteredStudents.filter(s => s.batch === filterBatch);

        // Get unique topics from assignments
        const allTopics = [...new Set(assignments.map(a => a.topic).filter(Boolean))].sort();

        // Build per-student assignment counts
        const rows = filteredStudents.map(student => {
            const studentAssignments = assignments.filter(a => String(a.studentId) === String(student.id));

            // Filter assignments by course filter if active
            const filtered = filterCourse
                ? studentAssignments.filter(a => a.course === filterCourse)
                : studentAssignments;

            // Count by topic
            const topicCounts = {};
            allTopics.forEach(t => { topicCounts[t] = 0; });
            filtered.forEach(a => {
                if (a.topic && topicCounts.hasOwnProperty(a.topic)) {
                    topicCounts[a.topic]++;
                }
            });

            return {
                id: student.id,
                name: student.name,
                course: student.course,
                batch: student.batch,
                total: filtered.length,
                topicCounts
            };
        });

        return { rows, topics: allTopics };
    }, [activeStudents, assignments, filterCourse, filterBatch]);

    // Summary stats
    const totalAssignments = assignments.length;
    const totalStudents = analysisData.rows.length;
    const avgPerStudent = totalStudents > 0 ? (analysisData.rows.reduce((s, r) => s + r.total, 0) / totalStudents).toFixed(1) : 0;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">📎 Assignment Analysis</h1>
                <button className="btn py-2 px-4 text-sm" onClick={loadAllAssignments}>
                    <i className="fas fa-sync-alt mr-1"></i> Refresh
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="card text-center" style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)', color: '#fff' }}>
                    <div className="text-3xl font-bold">{totalAssignments}</div>
                    <div className="text-sm opacity-80">Total Assignments</div>
                </div>
                <div className="card text-center" style={{ background: 'linear-gradient(135deg, #10b981, #34d399)', color: '#fff' }}>
                    <div className="text-3xl font-bold">{totalStudents}</div>
                    <div className="text-sm opacity-80">Students (Filtered)</div>
                </div>
                <div className="card text-center" style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', color: '#fff' }}>
                    <div className="text-3xl font-bold">{avgPerStudent}</div>
                    <div className="text-sm opacity-80">Avg per Student</div>
                </div>
            </div>

            {/* Filters */}
            <div className="card mb-6">
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[180px]">
                        <label className="text-xs font-bold opacity-50 mb-1 block">Course Filter</label>
                        <select
                            className="inp"
                            value={filterCourse}
                            onChange={(e) => setFilterCourse(e.target.value)}
                        >
                            <option value="">All Courses</option>
                            {courses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="flex-1 min-w-[180px]">
                        <label className="text-xs font-bold opacity-50 mb-1 block">Batch Filter</label>
                        <select
                            className="inp"
                            value={filterBatch}
                            onChange={(e) => setFilterBatch(e.target.value)}
                        >
                            <option value="">All Batches</option>
                            {batches.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>
                    <button
                        className="btn py-2 px-4 text-sm"
                        style={{ background: '#ef4444' }}
                        onClick={() => { setFilterCourse(''); setFilterBatch(''); }}
                    >
                        Clear Filters
                    </button>
                </div>
            </div>

            {/* Analysis Table */}
            <div className="card">
                <h3 className="font-bold text-lg mb-4">📊 Student-wise Assignment Count</h3>

                {loading ? (
                    <div className="text-center py-8">
                        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-gray-400 text-sm">Loading assignment data...</p>
                    </div>
                ) : analysisData.rows.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr style={{ background: 'rgba(99,102,241,0.08)' }}>
                                    <th className="text-left p-3 font-bold border-b sticky left-0 bg-white" style={{ minWidth: '40px' }}>#</th>
                                    <th className="text-left p-3 font-bold border-b sticky left-0 bg-white" style={{ minWidth: '180px' }}>Student Name</th>
                                    <th className="text-left p-3 font-bold border-b" style={{ minWidth: '100px' }}>Course</th>
                                    <th className="text-left p-3 font-bold border-b" style={{ minWidth: '120px' }}>Batch</th>
                                    <th className="text-center p-3 font-bold border-b" style={{ minWidth: '80px', background: 'rgba(16,185,129,0.1)' }}>Total</th>
                                    {analysisData.topics.map(topic => (
                                        <th key={topic} className="text-center p-3 font-bold border-b" style={{ minWidth: '100px' }}>
                                            {topic}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {analysisData.rows.map((row, i) => (
                                    <tr key={row.id} className="border-b hover:bg-gray-50 transition">
                                        <td className="p-3 opacity-40">{i + 1}</td>
                                        <td className="p-3 font-bold">{row.name}</td>
                                        <td className="p-3">
                                            <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
                                                {row.course || '—'}
                                            </span>
                                        </td>
                                        <td className="p-3 text-xs">{row.batch || '—'}</td>
                                        <td className="p-3 text-center font-bold" style={{ background: 'rgba(16,185,129,0.06)' }}>
                                            <span className="px-3 py-1 rounded-full text-sm" style={{
                                                background: row.total > 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.1)',
                                                color: row.total > 0 ? '#059669' : '#dc2626',
                                                fontWeight: 'bold'
                                            }}>
                                                {row.total}
                                            </span>
                                        </td>
                                        {analysisData.topics.map(topic => (
                                            <td key={topic} className="p-3 text-center">
                                                <span style={{
                                                    color: row.topicCounts[topic] > 0 ? '#059669' : '#9ca3af',
                                                    fontWeight: row.topicCounts[topic] > 0 ? 'bold' : 'normal'
                                                }}>
                                                    {row.topicCounts[topic]}
                                                </span>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                            {/* Footer totals */}
                            <tfoot>
                                <tr style={{ background: 'rgba(99,102,241,0.06)', fontWeight: 'bold' }}>
                                    <td className="p-3" colSpan="4" style={{ textAlign: 'right' }}>
                                        Total:
                                    </td>
                                    <td className="p-3 text-center" style={{ color: '#6366f1' }}>
                                        {analysisData.rows.reduce((s, r) => s + r.total, 0)}
                                    </td>
                                    {analysisData.topics.map(topic => (
                                        <td key={topic} className="p-3 text-center" style={{ color: '#6366f1' }}>
                                            {analysisData.rows.reduce((s, r) => s + (r.topicCounts[topic] || 0), 0)}
                                        </td>
                                    ))}
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <div className="text-4xl mb-2">📎</div>
                        <p className="text-gray-400 text-sm">No students found for the selected filters.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
