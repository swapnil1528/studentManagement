/**
 * ScheduleTab — Gen Z weekly timetable view.
 * Displays data?.schedule array: [{ day, time, subject, room, type }]
 * If no data, shows friendly empty state.
 */

import { motion } from 'framer-motion';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DAY_COLORS = {
    Monday: { bg: 'rgba(124,58,237,0.08)', accent: '#7c3aed' },
    Tuesday: { bg: 'rgba(6,182,212,0.08)', accent: '#0891b2' },
    Wednesday: { bg: 'rgba(244,63,94,0.07)', accent: '#e11d48' },
    Thursday: { bg: 'rgba(245,158,11,0.08)', accent: '#d97706' },
    Friday: { bg: 'rgba(16,185,129,0.08)', accent: '#059669' },
    Saturday: { bg: 'rgba(139,92,246,0.08)', accent: '#7c3aed' },
};

const TYPE_COLORS = {
    Lecture: { bg: '#dbeafe', color: '#1d4ed8' },
    Lab: { bg: '#d1fae5', color: '#065f46' },
    Tutorial: { bg: '#fef9c3', color: '#92400e' },
    Seminar: { bg: '#ede9fe', color: '#5b21b6' },
    default: { bg: '#f1f5f9', color: '#475569' },
};

function getTypeColors(type) {
    return TYPE_COLORS[type] || TYPE_COLORS.default;
}

export default function ScheduleTab({ schedule = [], isDark }) {
    const today = DAYS[new Date().getDay() - 1] || 'Monday';

    // Group by day
    const byDay = {};
    DAYS.forEach(d => { byDay[d] = []; });
    (schedule || []).forEach(s => {
        if (byDay[s.day] !== undefined) byDay[s.day].push(s);
    });

    const hasSomeData = schedule && schedule.length > 0;

    if (!hasSomeData) {
        return (
            <div style={{ textAlign: 'center', paddingTop: 60, paddingBottom: 40 }}>
                <div style={{ fontSize: 64, marginBottom: 16 }}>🗓️</div>
                <h3 style={{
                    fontSize: 20, fontWeight: 800,
                    color: isDark ? '#e2e8f0' : '#1a1035',
                    margin: '0 0 8px',
                }}>No Schedule Found</h3>
                <p style={{ color: '#94a3b8', fontSize: 14 }}>
                    Your timetable will appear here once the admin adds it.
                </p>
            </div>
        );
    }

    return (
        <div>
            {/* Day headers row */}
            <div style={{
                display: 'flex', gap: 8, overflowX: 'auto',
                paddingBottom: 4, marginBottom: 20,
                scrollbarWidth: 'none',
            }}>
                {DAYS.map((day, i) => {
                    const isToday = day === today;
                    const count = byDay[day].length;
                    return (
                        <div key={day} style={{
                            flexShrink: 0, padding: '8px 16px',
                            borderRadius: 14,
                            background: isToday
                                ? 'linear-gradient(135deg, #7c3aed, #06b6d4)'
                                : (isDark ? 'rgba(255,255,255,0.05)' : '#f8f7ff'),
                            color: isToday ? 'white' : (isDark ? '#9ca3af' : '#64748b'),
                            fontWeight: 700, fontSize: 12, textAlign: 'center',
                            border: isToday ? 'none' : `1.5px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(124,58,237,0.08)'}`,
                            cursor: 'default',
                        }}>
                            <div>{day.slice(0, 3).toUpperCase()}</div>
                            <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>
                                {count} class{count !== 1 ? 'es' : ''}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Cards per day */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {DAYS.filter(d => byDay[d].length > 0).map((day, di) => {
                    const col = DAY_COLORS[day] || DAY_COLORS.Monday;
                    const isToday = day === today;
                    return (
                        <motion.div
                            key={day}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: di * 0.07, duration: 0.3 }}
                            style={{
                                background: isDark ? 'rgba(26,22,48,0.8)' : '#ffffff',
                                borderRadius: 20,
                                border: isToday
                                    ? '2px solid rgba(124,58,237,0.35)'
                                    : `1.5px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(124,58,237,0.07)'}`,
                                overflow: 'hidden',
                                boxShadow: isToday
                                    ? '0 4px 20px rgba(124,58,237,0.12)'
                                    : '0 2px 10px rgba(0,0,0,0.04)',
                            }}
                        >
                            {/* Day header */}
                            <div style={{
                                padding: '12px 18px',
                                background: isDark ? col.bg.replace('0.08', '0.15') : col.bg,
                                display: 'flex', alignItems: 'center', gap: 8,
                                borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`,
                            }}>
                                <span style={{
                                    fontSize: 14, fontWeight: 800, color: col.accent,
                                }}>
                                    {day}
                                </span>
                                {isToday && (
                                    <span style={{
                                        fontSize: 10, fontWeight: 700, padding: '2px 8px',
                                        background: col.accent, color: 'white',
                                        borderRadius: 20,
                                    }}>
                                        TODAY
                                    </span>
                                )}
                            </div>

                            {/* Classes */}
                            <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {byDay[day]
                                    .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
                                    .map((cls, ci) => {
                                        const tc = getTypeColors(cls.type);
                                        return (
                                            <div key={ci} style={{
                                                display: 'flex', alignItems: 'center', gap: 12,
                                                padding: '10px 14px',
                                                background: isDark ? 'rgba(255,255,255,0.04)' : '#f8f7ff',
                                                borderRadius: 14,
                                                border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(124,58,237,0.06)'}`,
                                            }}>
                                                {/* Time */}
                                                <div style={{
                                                    flexShrink: 0, textAlign: 'center', minWidth: 52,
                                                }}>
                                                    <div style={{
                                                        fontSize: 12, fontWeight: 800,
                                                        color: col.accent,
                                                    }}>
                                                        {cls.time || '--:--'}
                                                    </div>
                                                </div>

                                                {/* Divider */}
                                                <div style={{
                                                    width: 3, height: 36, borderRadius: 99,
                                                    background: col.accent, flexShrink: 0, opacity: 0.4,
                                                }} />

                                                {/* Details */}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{
                                                        fontWeight: 700, fontSize: 14,
                                                        color: isDark ? '#ede9fe' : '#1a1035',
                                                        whiteSpace: 'nowrap', overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                    }}>
                                                        {cls.subject || 'Subject'}
                                                    </div>
                                                    {cls.room && (
                                                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                                                            📍 {cls.room}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Type chip */}
                                                {cls.type && (
                                                    <span style={{
                                                        flexShrink: 0, fontSize: 10, fontWeight: 700,
                                                        padding: '3px 9px', borderRadius: 20,
                                                        background: isDark ? 'rgba(255,255,255,0.1)' : tc.bg,
                                                        color: isDark ? '#c4b5fd' : tc.color,
                                                    }}>
                                                        {cls.type}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
