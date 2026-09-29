/**
 * ====================================================================
 * AdminNoticeModal.jsx - Priority 1 Admin Announcement & Notice Popup
 * ====================================================================
 * Displays urgent institute announcements set by Admin (e.g. Holidays,
 * Class Off, Exam Notices). This popup holds PRIORITY 1 over fee reminders.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bell,
    Calendar,
    AlertCircle,
    Info,
    Sparkles,
    CheckCircle2,
    X,
    Megaphone,
    SunMedium
} from 'lucide-react';

export default function AdminNoticeModal({
    isOpen = false,
    notice = null,
    onClose,
    isDark = false
}) {
    if (!isOpen || !notice) return null;

    const title = notice.title || 'Announcement from Admin';
    const message = notice.msg || notice.message || notice.desc || '';
    const dateStr = notice.date || 'Today';

    const isHoliday = title.toLowerCase().includes('holiday') || message.toLowerCase().includes('holiday');
    const isClassOff = title.toLowerCase().includes('off') || title.toLowerCase().includes('cancelled') || message.toLowerCase().includes('class off');
    const isExam = title.toLowerCase().includes('exam') || message.toLowerCase().includes('exam');

    let bgGradient = 'linear-gradient(135deg, #7c3aed, #4f46e5)'; // General announcement
    let badgeLabel = '📢 Announcement';
    let BadgeIcon = Megaphone;

    if (isHoliday) {
        bgGradient = 'linear-gradient(135deg, #f59e0b, #d97706)';
        badgeLabel = '🏖️ Holiday Notice';
        BadgeIcon = SunMedium;
    } else if (isClassOff) {
        bgGradient = 'linear-gradient(135deg, #ef4444, #dc2626)';
        badgeLabel = '⚠️ Class Off Notice';
        BadgeIcon = AlertCircle;
    } else if (isExam) {
        bgGradient = 'linear-gradient(135deg, #06b6d4, #0284c7)';
        badgeLabel = '📝 Exam Alert';
        BadgeIcon = Sparkles;
    }

    return (
        <AnimatePresence>
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 999999,
                    backgroundColor: isDark ? 'rgba(8, 6, 18, 0.85)' : 'rgba(15, 23, 42, 0.75)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 16,
                }}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                    style={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: 480,
                        backgroundColor: isDark ? '#120f24' : '#ffffff',
                        borderRadius: 24,
                        boxShadow: isDark
                            ? '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.1)'
                            : '0 25px 50px -12px rgba(124, 58, 237, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                        overflow: 'hidden',
                        padding: 24,
                    }}
                >
                    {/* Header Banner */}
                    <div
                        style={{
                            background: bgGradient,
                            margin: '-24px -24px 20px -24px',
                            padding: '24px 24px 20px 24px',
                            color: '#ffffff',
                            position: 'relative',
                            overflow: 'hidden',
                        }}
                    >
                        <div
                            style={{
                                position: 'absolute',
                                right: -15,
                                bottom: -15,
                                opacity: 0.15,
                                fontSize: 110,
                                userSelect: 'none',
                                pointerEvents: 'none',
                            }}
                        >
                            📢
                        </div>

                        <div
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '4px 10px',
                                borderRadius: 20,
                                background: 'rgba(255,255,255,0.2)',
                                backdropFilter: 'blur(4px)',
                                fontSize: 11,
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: 10,
                            }}
                        >
                            <BadgeIcon size={13} />
                            <span>{badgeLabel}</span>
                        </div>

                        <h2
                            style={{
                                fontSize: 20,
                                fontWeight: 800,
                                margin: 0,
                                lineHeight: 1.3,
                                textShadow: '0 2px 4px rgba(0,0,0,0.15)',
                            }}
                        >
                            {title}
                        </h2>

                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: 12,
                                opacity: 0.9,
                                marginTop: 6,
                                fontWeight: 600,
                            }}
                        >
                            <Calendar size={13} />
                            <span>Posted Date: {dateStr}</span>
                        </div>
                    </div>

                    {/* Notice Content */}
                    <div
                        style={{
                            padding: '14px 16px',
                            borderRadius: 16,
                            background: isDark ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc',
                            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'}`,
                            fontSize: 14,
                            lineHeight: 1.6,
                            color: isDark ? '#e2e8f0' : '#334155',
                            fontWeight: 500,
                            marginBottom: 20,
                            maxHeight: 220,
                            overflowY: 'auto',
                            whiteSpace: 'pre-wrap',
                        }}
                    >
                        {message}
                    </div>

                    {/* Close Action Button */}
                    <button
                        onClick={onClose}
                        style={{
                            width: '100%',
                            padding: '13px 20px',
                            borderRadius: 14,
                            border: 'none',
                            background: bgGradient,
                            color: '#ffffff',
                            fontSize: 14,
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.15)',
                            transition: 'transform 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.01)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                        }}
                    >
                        <CheckCircle2 size={18} />
                        <span>I Understand & Acknowledge</span>
                    </button>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
