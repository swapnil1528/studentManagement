/**
 * GradesTab — Gen Z grade visualization.
 * Shows exam results as grade cards with letter grade, colored pills.
 * Computes overall GPA (simple average of percentages).
 */

import { motion } from 'framer-motion';

function getLetterGrade(marks, total) {
    if (!total || total === 0) return { letter: '—', color: 'grade-F', pct: 0 };
    const pct = (marks / total) * 100;
    if (pct >= 90) return { letter: 'A+', color: 'grade-A', pct };
    if (pct >= 80) return { letter: 'A', color: 'grade-A', pct };
    if (pct >= 70) return { letter: 'B', color: 'grade-B', pct };
    if (pct >= 60) return { letter: 'C', color: 'grade-C', pct };
    if (pct >= 50) return { letter: 'D', color: 'grade-D', pct };
    return { letter: 'F', color: 'grade-F', pct };
}

const GPA_BG = {
    'A+': 'linear-gradient(135deg, #10b981, #06b6d4)',
    'A': 'linear-gradient(135deg, #10b981, #059669)',
    'B': 'linear-gradient(135deg, #3b82f6, #6366f1)',
    'C': 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    'D': 'linear-gradient(135deg, #f97316, #fb923c)',
    'F': 'linear-gradient(135deg, #ef4444, #f87171)',
};

export default function GradesTab({ results = [], isDark }) {
    if (!results || results.length === 0) {
        return (
            <div style={{ textAlign: 'center', paddingTop: 60, paddingBottom: 40 }}>
                <div style={{ fontSize: 64, marginBottom: 16 }}>📊</div>
                <h3 style={{
                    fontSize: 20, fontWeight: 800,
                    color: isDark ? '#e2e8f0' : '#1a1035',
                    margin: '0 0 8px',
                }}>
                    No Results Yet
                </h3>
                <p style={{ color: '#94a3b8', fontSize: 14 }}>
                    Your exam results will appear here once they're available.
                </p>
            </div>
        );
    }

    // Compute GPA-like avg
    const grades = results.map(r => getLetterGrade(r.marks, r.total));
    const validGrades = grades.filter(g => g.pct > 0);
    const avgPct = validGrades.length > 0
        ? Math.round(validGrades.reduce((s, g) => s + g.pct, 0) / validGrades.length)
        : 0;
    const overallGrade = getLetterGrade(avgPct, 100);

    return (
        <div>
            {/* Summary banner */}
            <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                style={{
                    borderRadius: 20, padding: '20px 24px',
                    background: GPA_BG[overallGrade.letter] || GPA_BG['B'],
                    marginBottom: 20, display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', gap: 16,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    color: 'white',
                }}
            >
                <div>
                    <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.8, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                        Overall Performance
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.5px', marginTop: 4 }}>
                        {avgPct}% Average
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                        Across {results.length} exam{results.length !== 1 ? 's' : ''}
                    </div>
                </div>
                <div style={{
                    width: 72, height: 72, borderRadius: 20,
                    background: 'rgba(255,255,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 28, fontWeight: 900,
                    backdropFilter: 'blur(8px)', flexShrink: 0,
                    border: '2px solid rgba(255,255,255,0.3)',
                }}>
                    {overallGrade.letter}
                </div>
            </motion.div>

            {/* Subject grade cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {results.map((r, i) => {
                    const g = getLetterGrade(r.marks, r.total);
                    const pct = Math.round(g.pct);
                    return (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.06, duration: 0.3 }}
                            style={{
                                background: isDark ? 'rgba(26,22,48,0.8)' : '#ffffff',
                                borderRadius: 18,
                                border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(124,58,237,0.08)'}`,
                                padding: '16px 18px',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                                display: 'flex', alignItems: 'center', gap: 14,
                            }}
                        >
                            {/* Grade pill */}
                            <div className={`grade-pill ${g.color}`}>
                                {g.letter}
                            </div>

                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    fontWeight: 700, fontSize: 14,
                                    color: isDark ? '#ede9fe' : '#1a1035',
                                    marginBottom: 6,
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                }}>
                                    {r.exam || r.subject || `Exam ${i + 1}`}
                                </div>

                                {/* Progress bar */}
                                <div style={{
                                    height: 7, borderRadius: 99,
                                    background: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
                                    overflow: 'hidden',
                                }}>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${pct}%` }}
                                        transition={{ delay: i * 0.06 + 0.2, duration: 0.7, ease: 'easeOut' }}
                                        style={{
                                            height: '100%', borderRadius: 99,
                                            background: GPA_BG[g.letter] || GPA_BG['B'],
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Score */}
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{
                                    fontWeight: 900, fontSize: 16,
                                    color: isDark ? '#ede9fe' : '#1a1035',
                                }}>
                                    {r.marks}<span style={{ fontSize: 12, opacity: 0.5, fontWeight: 600 }}>/{r.total}</span>
                                </div>
                                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                                    {pct}%
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
