/**
 * DashboardWidget — Gen Z redesign.
 * Features: streak counter, motivational quote, quick stats, attendance ring, check-in button.
 */

import { motion } from 'framer-motion';
import { Flame, BookOpen, Bell } from 'lucide-react';

const QUOTES = [
    { q: "Keep showing up. That's the whole game.", emoji: '🔥' },
    { q: "Every class is a cheat code for your future.", emoji: '🎮' },
    { q: "Consistency > motivation. You got this.", emoji: '💪' },
    { q: "Progress, not perfection. Stay in motion.", emoji: '🚀' },
    { q: "Hard work beats talent when talent doesn't work hard.", emoji: '⚡' },
    { q: "Your future self is proud of you today.", emoji: '🙌' },
    { q: "Small steps every day = big results.", emoji: '✨' },
];

function computeStreak(logs = []) {
    if (!logs || logs.length === 0) return 0;
    const sorted = [...logs]
        .filter(l => l.status === 'Check-In' || l.status === 'Present')
        .map(l => new Date(l.time || l.date).toDateString())
        .filter((v, i, a) => a.indexOf(v) === i)
        .sort((a, b) => new Date(b) - new Date(a));

    if (sorted.length === 0) return 0;
    let streak = 1;
    for (let i = 1; i < sorted.length; i++) {
        const diff = (new Date(sorted[i - 1]) - new Date(sorted[i])) / (1000 * 60 * 60 * 24);
        if (diff <= 1.5) streak++;
        else break;
    }
    return streak;
}

export default function DashboardWidget({
    att, profile, assignmentsData, initiateAttendance,
    canMarkAttendance, attStatus, cameraRequired, notices, isDark,
}) {
    const percentage = att?.perc || 0;
    const radius = 38;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    const streak = computeStreak(att?.logs || att?.allLogs || []);
    const todayIdx = new Date().getDay() % QUOTES.length;
    const quote = QUOTES[todayIdx];

    const asnCount = assignmentsData?.assignments?.length || 0;
    const noticeCount = notices?.length || 0;
    const latestNotice = notices && notices.length > 0 ? notices[0] : null;
    const dueSoon = assignmentsData?.assignments?.slice(0, 3) || [];

    const cardStyle = {
        background: isDark ? 'rgba(26,22,48,0.85)' : '#ffffff',
        borderRadius: 22,
        border: `1.5px solid ${isDark ? 'rgba(139,92,246,0.15)' : 'rgba(124,58,237,0.08)'}`,
        boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 2px 16px rgba(0,0,0,0.05)',
        padding: '20px',
        marginBottom: 0,
    };

    return (
        <div>
            {/* Motivational quote strip */}
            <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="gz-quote-strip"
                style={{ marginBottom: 16 }}
            >
                <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>
                    {quote.emoji} Daily Boost
                </span>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{quote.q}</span>
            </motion.div>

            {/* Quick stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
                {[
                    { icon: '📅', label: 'Attendance', value: `${percentage}%`, color: '#7c3aed' },
                    { icon: '📎', label: 'Submitted', value: asnCount, color: '#06b6d4' },
                    { icon: '📢', label: 'Notices', value: noticeCount, color: '#f43f5e' },
                ].map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08, duration: 0.3 }}
                        style={{
                            ...cardStyle, padding: '14px 12px',
                            textAlign: 'center',
                        }}
                    >
                        <div style={{ fontSize: 20, marginBottom: 4 }}>{stat.icon}</div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: stat.color }}>{stat.value}</div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                            {stat.label}
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Main 2-col grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

                {/* ─── Attendance Check-In Widget ─── */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 16 }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: isDark ? '#c4b5fd' : '#7c3aed' }}>
                            Today's Attendance
                        </span>
                        {streak > 0 && (
                            <span className="streak-badge">
                                <Flame size={12} /> {streak}d
                            </span>
                        )}
                    </div>

                    {/* Ring */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ position: 'relative', width: 100, height: 100 }}>
                            <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
                                <circle cx="50" cy="50" r={radius} fill="transparent" stroke={isDark ? 'rgba(255,255,255,0.08)' : '#ede9fe'} strokeWidth="9" />
                                <motion.circle
                                    cx="50" cy="50" r={radius}
                                    fill="transparent"
                                    stroke="url(#gradRing)"
                                    strokeWidth="9"
                                    strokeLinecap="round"
                                    strokeDasharray={circumference}
                                    initial={{ strokeDashoffset: circumference }}
                                    animate={{ strokeDashoffset }}
                                    transition={{ duration: 1.4, ease: 'easeOut' }}
                                />
                                <defs>
                                    <linearGradient id="gradRing" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#7c3aed" />
                                        <stop offset="100%" stopColor="#06b6d4" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div style={{
                                position: 'absolute', inset: 0,
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center',
                            }}>
                                <span style={{ fontWeight: 900, fontSize: 18, color: isDark ? '#ede9fe' : '#1a1035' }}>
                                    {percentage}%
                                </span>
                                <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>RATE</span>
                            </div>
                        </div>
                    </div>

                    {/* Stats row */}
                    <div style={{
                        display: 'flex', justifyContent: 'space-around',
                        padding: '10px 0', borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'}`,
                    }}>
                        {[
                            { label: 'Present', val: att?.pres || 0, col: '#10b981' },
                            { label: 'Total', val: att?.total || 0, col: '#7c3aed' },
                        ].map((s, i) => (
                            <div key={i} style={{ textAlign: 'center' }}>
                                <div style={{ fontWeight: 900, fontSize: 16, color: s.col }}>{s.val}</div>
                                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Check-In/Out button */}
                    {attStatus.showOut ? (
                        <button
                            className="gz-checkin-btn gz-btn-out"
                            onClick={() => initiateAttendance('Check-Out')}
                            disabled={!canMarkAttendance}
                        >
                            👋 Check Out {cameraRequired ? '📷' : ''}
                        </button>
                    ) : (
                        <button
                            className="gz-checkin-btn gz-btn-in"
                            onClick={() => initiateAttendance('Check-In')}
                            disabled={!canMarkAttendance || att?.todayStatus === 'Check-Out'}
                        >
                            {att?.todayStatus === 'Check-Out' ? '✅ Done for Today' : `Tap to Check In ${cameraRequired ? '📷' : '⚡'}`}
                        </button>
                    )}

                    {att?.lastCheckInTime && (
                        <p style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', margin: 0 }}>
                            Last: {new Date(att.lastCheckInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    )}
                </motion.div>

                {/* ─── Right column ─── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Latest Notice */}
                    {latestNotice ? (
                        <motion.div
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.15 }}
                            style={{
                                borderRadius: 18, padding: '14px 16px',
                                background: 'linear-gradient(135deg, #f59e0b, #f97316)',
                                color: 'white', position: 'relative', overflow: 'hidden',
                                boxShadow: '0 6px 20px rgba(245,158,11,0.3)',
                            }}
                        >
                            <div style={{ position: 'absolute', right: -8, top: -8, opacity: 0.12, fontSize: 60 }}>📢</div>
                            <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                📢 New Notice
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 800, marginTop: 4, lineHeight: 1.3 }}>
                                {latestNotice.title}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.15 }}
                            style={{
                                ...cardStyle,
                                textAlign: 'center', padding: '16px',
                            }}
                        >
                            <Bell size={22} style={{ color: '#94a3b8', marginBottom: 6 }} />
                            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, fontWeight: 600 }}>No new notices</p>
                        </motion.div>
                    )}

                    {/* Recent Assignments */}
                    <motion.div
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                        style={{ ...cardStyle, flex: 1 }}
                    >
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12,
                        }}>
                            <BookOpen size={14} style={{ color: '#06b6d4' }} />
                            <span style={{ fontSize: 12, fontWeight: 800, color: isDark ? '#ede9fe' : '#1a1035' }}>
                                Recent Submissions
                            </span>
                        </div>

                        {dueSoon.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {dueSoon.map((a, i) => (
                                    <div key={i} style={{
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        padding: '8px 10px',
                                        background: isDark ? 'rgba(255,255,255,0.04)' : '#f8f7ff',
                                        borderRadius: 12,
                                    }}>
                                        <div style={{
                                            width: 30, height: 30, borderRadius: 10, flexShrink: 0,
                                            background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(6,182,212,0.15))',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 14,
                                        }}>📎</div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontSize: 12, fontWeight: 700,
                                                color: isDark ? '#ede9fe' : '#1a1035',
                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            }}>
                                                {a.topic || 'Assignment'}
                                            </div>
                                            <div style={{ fontSize: 10, color: '#94a3b8' }}>{a.course}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '12px 0' }}>
                                <div style={{ fontSize: 24, marginBottom: 4 }}>🎉</div>
                                <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>All caught up!</p>
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
