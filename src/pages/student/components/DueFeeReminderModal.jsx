/**
 * ====================================================================
 * DueFeeReminderModal.jsx - Due Fee Reminder Popup with 15s Timeline
 * ====================================================================
 * Displays an important fee notification when a student logs in with
 * outstanding fees. Features a mandatory 15-second timeline countdown
 * during which closing is disabled, after which the close option is added.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AlertTriangle,
    Clock,
    Lock,
    Unlock,
    CheckCircle2,
    X,
    CreditCard,
    ArrowRight,
    ShieldAlert,
    IndianRupee,
    Calendar,
    Sparkles
} from 'lucide-react';

const TOTAL_TIMELINE_SECONDS = 15;

export default function DueFeeReminderModal({
    isOpen = false,
    onClose,
    onNavigateToFees,
    feeSummary = {},
    enrollments = [],
    profile = {},
    isDark = false
}) {
    const [timeLeft, setTimeLeft] = useState(TOTAL_TIMELINE_SECONDS);
    const [canClose, setCanClose] = useState(false);

    // Reset and start 15-second countdown whenever modal opens
    useEffect(() => {
        if (!isOpen) return;

        setTimeLeft(TOTAL_TIMELINE_SECONDS);
        setCanClose(false);

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setCanClose(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isOpen]);

    // Handle Escape key: only allow when timer has elapsed
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && canClose && onClose) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, canClose, onClose]);

    if (!isOpen) return null;

    const totalFee = Number(feeSummary?.totalFee) || 0;
    const totalPaid = Number(feeSummary?.totalPaid) || 0;
    // Guaranteed mathematical deduction: Total Fee minus Total Paid
    const pendingAmount = Math.max(0, totalFee - totalPaid);
    const progressPercent = Math.min(
        100,
        Math.round(((TOTAL_TIMELINE_SECONDS - timeLeft) / TOTAL_TIMELINE_SECONDS) * 100)
    );

    // Map enrollments with accurately deduced pending amounts
    const dueEnrollments = enrollments.map(e => {
        const itemTotal = Number(e.totalFee) || 0;
        let itemPaid = Number(e.paidAmount) || 0;
        // If single enrollment and total paid exists, assign full payment to this course
        if (enrollments.length === 1 && totalPaid > 0) {
            itemPaid = totalPaid;
        }
        const itemPending = Math.max(0, itemTotal - itemPaid);
        return {
            ...e,
            paidAmount: itemPaid,
            pendingAmount: itemPending,
        };
    }).filter(e => e.pendingAmount > 0);

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget && canClose && onClose) {
            onClose();
        }
    };

    return (
        <AnimatePresence>
            <div
                onClick={handleBackdropClick}
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
                    padding: '16px',
                    overflowY: 'auto'
                }}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: 24 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: 20 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: '560px',
                        background: isDark
                            ? 'linear-gradient(180deg, #1b1731 0%, #120f24 100%)'
                            : 'linear-gradient(180deg, #ffffff 0%, #faf8ff 100%)',
                        borderRadius: 24,
                        border: isDark
                            ? '1.5px solid rgba(239, 68, 68, 0.35)'
                            : '1.5px solid rgba(239, 68, 68, 0.25)',
                        boxShadow: isDark
                            ? '0 25px 60px -15px rgba(239, 68, 68, 0.3), 0 10px 40px rgba(0,0,0,0.7)'
                            : '0 25px 60px -15px rgba(239, 68, 68, 0.2), 0 15px 35px rgba(0,0,0,0.1)',
                        padding: '28px',
                        overflow: 'hidden',
                        fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif",
                    }}
                >
                    {/* Glowing Top Decorative Stripe */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: 5,
                            background: canClose
                                ? 'linear-gradient(90deg, #10b981, #06b6d4, #8b5cf6)'
                                : 'linear-gradient(90deg, #ef4444, #f59e0b, #ec4899)',
                            transition: 'background 0.5s ease'
                        }}
                    />

                    {/* Top Right Close Button (Unlocked after 15 sec) */}
                    <div style={{ position: 'absolute', top: 16, right: 16 }}>
                        {canClose ? (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
                                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                onClick={onClose}
                                title="Close notification"
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: '50%',
                                    border: isDark
                                        ? '1px solid rgba(255,255,255,0.15)'
                                        : '1px solid rgba(0,0,0,0.1)',
                                    background: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
                                    color: isDark ? '#e2e8f0' : '#475569',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#ef4444';
                                    e.currentTarget.style.color = '#ffffff';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9';
                                    e.currentTarget.style.color = isDark ? '#e2e8f0' : '#475569';
                                }}
                            >
                                <X size={18} />
                            </motion.button>
                        ) : (
                            <div
                                title={`Close locked for ${timeLeft}s`}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '4px 10px',
                                    borderRadius: 20,
                                    background: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)',
                                    color: '#ef4444',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    border: '1px solid rgba(239, 68, 68, 0.2)'
                                }}
                            >
                                <Lock size={12} />
                                <span>{timeLeft}s</span>
                            </div>
                        )}
                    </div>

                    {/* Header: Icon + Warning Notice */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
                        <div
                            style={{
                                width: 52,
                                height: 52,
                                borderRadius: 18,
                                background: canClose
                                    ? 'linear-gradient(135deg, #10b981, #06b6d4)'
                                    : 'linear-gradient(135deg, #ef4444, #f59e0b)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ffffff',
                                flexShrink: 0,
                                boxShadow: canClose
                                    ? '0 8px 20px rgba(16, 185, 129, 0.35)'
                                    : '0 8px 20px rgba(239, 68, 68, 0.35)',
                                transition: 'all 0.5s ease'
                            }}
                        >
                            {canClose ? <CheckCircle2 size={28} /> : <AlertTriangle size={28} />}
                        </div>
                        <div style={{ flex: 1, paddingRight: 40 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                                <span
                                    style={{
                                        fontSize: 10,
                                        fontWeight: 800,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.8px',
                                        padding: '3px 8px',
                                        borderRadius: 6,
                                        background: canClose ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                        color: canClose ? '#10b981' : '#ef4444',
                                        border: `1px solid ${canClose ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                                    }}
                                >
                                    {canClose ? 'Notice Acknowledged' : 'Payment Alert • Due Fee Reminder'}
                                </span>
                                {profile?.id && (
                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>
                                        ID: {profile.id}
                                    </span>
                                )}
                            </div>
                            <h2
                                style={{
                                    fontSize: 20,
                                    fontWeight: 900,
                                    margin: 0,
                                    color: isDark ? '#ede9fe' : '#1e1035',
                                    letterSpacing: '-0.3px',
                                }}
                            >
                                Outstanding Fee Balance Reminder
                            </h2>
                            <p
                                style={{
                                    margin: '4px 0 0',
                                    fontSize: 13,
                                    fontWeight: 500,
                                    color: isDark ? '#94a3b8' : '#64748b',
                                }}
                            >
                                Hello <strong style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}>{profile?.name || 'Student'}</strong>, please review your pending fee status below.
                            </p>
                        </div>
                    </div>

                    {/* 15-Second Timeline Indicator Bar */}
                    <div
                        style={{
                            background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
                            borderRadius: 16,
                            padding: '14px 16px',
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
                            marginBottom: 20,
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: 8,
                                fontSize: 12,
                                fontWeight: 700,
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: canClose ? '#10b981' : (isDark ? '#fbbf24' : '#d97706') }}>
                                {canClose ? <Unlock size={14} /> : <Clock size={14} className="animate-spin" />}
                                <span>
                                    {canClose
                                        ? 'Review completed — Close option is now available'
                                        : `Mandatory review timeline: Close option unlocks in ${timeLeft}s`}
                                </span>
                            </div>
                            <span
                                style={{
                                    fontVariantNumeric: 'tabular-nums',
                                    color: canClose ? '#10b981' : '#ef4444',
                                    fontWeight: 800
                                }}
                            >
                                {canClose ? '15s / 15s' : `${TOTAL_TIMELINE_SECONDS - timeLeft}s / ${TOTAL_TIMELINE_SECONDS}s`}
                            </span>
                        </div>

                        {/* Progress Bar */}
                        <div
                            style={{
                                width: '100%',
                                height: 8,
                                borderRadius: 999,
                                background: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
                                overflow: 'hidden',
                                position: 'relative'
                            }}
                        >
                            <div
                                style={{
                                    height: '100%',
                                    width: `${progressPercent}%`,
                                    background: canClose
                                        ? 'linear-gradient(90deg, #10b981, #06b6d4)'
                                        : 'linear-gradient(90deg, #f59e0b, #ef4444)',
                                    borderRadius: 999,
                                    transition: 'width 1s linear, background 0.3s ease',
                                    boxShadow: canClose
                                        ? '0 0 10px rgba(16, 185, 129, 0.5)'
                                        : '0 0 10px rgba(239, 68, 68, 0.4)'
                                }}
                            />
                        </div>

                        <div
                            style={{
                                marginTop: 8,
                                fontSize: 11,
                                color: '#94a3b8',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}
                        >
                            <span>15s Timeline Requirement</span>
                            <span>{canClose ? 'Option Unlocked ✓' : `Please review for ${timeLeft} more seconds`}</span>
                        </div>
                    </div>

                    {/* Dues Highlight Box */}
                    <div
                        style={{
                            background: isDark
                                ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(245, 158, 11, 0.08))'
                                : 'linear-gradient(135deg, #fff1f2, #fffbeb)',
                            borderRadius: 18,
                            padding: '18px 20px',
                            border: '1.5px solid rgba(239, 68, 68, 0.25)',
                            marginBottom: 20,
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                                    Total Outstanding Fee Due
                                </div>
                                <div style={{ fontSize: 32, fontWeight: 900, color: '#ef4444', marginTop: 4, letterSpacing: '-0.5px' }}>
                                    ₹{pendingAmount.toLocaleString('en-IN')}
                                </div>
                            </div>
                            <span
                                style={{
                                    padding: '5px 12px',
                                    borderRadius: 999,
                                    fontSize: 11,
                                    fontWeight: 800,
                                    background: '#ef4444',
                                    color: '#ffffff',
                                    boxShadow: '0 3px 8px rgba(239, 68, 68, 0.3)'
                                }}
                            >
                                Action Required
                            </span>
                        </div>

                        {/* Breakdown Metrics */}
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: 10,
                                marginTop: 14,
                                paddingTop: 14,
                                borderTop: '1px solid rgba(239, 68, 68, 0.15)'
                            }}
                        >
                            <div>
                                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Total Course Fee:</span>
                                <div style={{ fontSize: 15, fontWeight: 800, color: isDark ? '#e2e8f0' : '#1e293b' }}>
                                    ₹{totalFee.toLocaleString('en-IN')}
                                </div>
                            </div>
                            <div>
                                <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>Total Amount Paid:</span>
                                <div style={{ fontSize: 15, fontWeight: 800, color: '#10b981' }}>
                                    ₹{totalPaid.toLocaleString('en-IN')}
                                </div>
                            </div>
                        </div>

                        {/* Enrolled Courses Due Breakdown */}
                        {dueEnrollments.length > 0 && (
                            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed rgba(239, 68, 68, 0.15)' }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#cbd5e1' : '#475569', marginBottom: 6 }}>
                                    Course Fee Dues Breakdown:
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {dueEnrollments.map((item, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                fontSize: 12,
                                                background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.7)',
                                                padding: '6px 10px',
                                                borderRadius: 8,
                                                border: '1px solid rgba(239, 68, 68, 0.15)'
                                            }}
                                        >
                                            <span style={{ fontWeight: 700, color: isDark ? '#e2e8f0' : '#1e293b' }}>
                                                {item.course || 'Enrolled Course'}
                                            </span>
                                            <span style={{ fontWeight: 800, color: '#ef4444' }}>
                                                Due: ₹{(Number(item.pendingAmount) || 0).toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Next Due Date & +29 Days Cycle Info */}
                        <div
                            style={{
                                marginTop: 14,
                                paddingTop: 12,
                                borderTop: '1px solid rgba(239, 68, 68, 0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: 8,
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <Calendar size={15} color="#ef4444" />
                                <span style={{ fontSize: 12, fontWeight: 700, color: isDark ? '#e2e8f0' : '#334155' }}>
                                    Next Due Date: <strong style={{ color: '#ef4444' }}>{feeSummary?.dueDate || 'Pending Due'}</strong>
                                </span>
                                {(() => {
                                    let badgeText = 'Payment Due';
                                    if (feeSummary?.dueDate) {
                                        const parts = String(feeSummary.dueDate).split(/[-/.]/);
                                        let d = null;
                                        if (parts.length === 3) {
                                            if (parts[0].length === 4) d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                                            else d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
                                        } else {
                                            d = new Date(feeSummary.dueDate);
                                        }
                                        if (d && !isNaN(d.getTime())) {
                                            const today = new Date();
                                            today.setHours(0, 0, 0, 0);
                                            d.setHours(0, 0, 0, 0);
                                            const diff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                            if (diff > 0) badgeText = `${diff} Days Remaining`;
                                            else if (diff === 0) badgeText = 'Due Today!';
                                            else badgeText = `${Math.abs(diff)} Days Overdue`;
                                        }
                                    }
                                    return (
                                        <span style={{
                                            fontSize: 10,
                                            fontWeight: 800,
                                            padding: '2px 8px',
                                            borderRadius: 6,
                                            background: 'rgba(239, 68, 68, 0.15)',
                                            color: '#ef4444',
                                            border: '1px solid rgba(239, 68, 68, 0.25)',
                                        }}>
                                            {badgeText}
                                        </span>
                                    );
                                })()}
                            </div>
                            {feeSummary?.lastPaymentDate && (
                                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                                    Last Paid: {feeSummary.lastPaymentDate}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Advisory message with cycle description */}
                    <div
                        style={{
                            fontSize: 12,
                            color: isDark ? '#94a3b8' : '#64748b',
                            lineHeight: 1.5,
                            marginBottom: 24,
                            padding: '0 4px',
                        }}
                    >
                        <strong>Payment Cycle:</strong> Fee reminder starts 5 days before your due date and continues every session until the next payment is received. No reminders if fees are fully cleared.
                    </div>

                    {/* Action Buttons: Navigate to Fees + Close Option */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: 12,
                            flexWrap: 'wrap',
                        }}
                    >
                        {/* Primary Button: View & Pay Fees */}
                        <button
                            onClick={() => {
                                if (onNavigateToFees) onNavigateToFees();
                                else if (onClose) onClose();
                            }}
                            style={{
                                flex: '1 1 200px',
                                padding: '12px 20px',
                                borderRadius: 14,
                                border: 'none',
                                background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                                color: '#ffffff',
                                fontSize: 13,
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                boxShadow: '0 4px 15px rgba(124, 58, 237, 0.35)',
                                transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 6px 20px rgba(124, 58, 237, 0.45)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 15px rgba(124, 58, 237, 0.35)';
                            }}
                        >
                            <CreditCard size={16} />
                            <span>View Details & Pay Fees</span>
                            <ArrowRight size={14} />
                        </button>

                        {/* Closed Option: Locked for 15s, then active */}
                        {canClose ? (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.85 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3, type: 'spring' }}
                                onClick={onClose}
                                style={{
                                    padding: '12px 22px',
                                    borderRadius: 14,
                                    border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1'}`,
                                    background: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
                                    color: isDark ? '#ede9fe' : '#334155',
                                    fontSize: 13,
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    transition: 'all 0.2s ease',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.14)' : '#f8fafc';
                                    e.currentTarget.style.borderColor = '#94a3b8';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : '#ffffff';
                                    e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1';
                                }}
                            >
                                <CheckCircle2 size={16} color="#10b981" />
                                <span>Close Reminder</span>
                            </motion.button>
                        ) : (
                            <button
                                disabled
                                style={{
                                    padding: '12px 20px',
                                    borderRadius: 14,
                                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
                                    background: isDark ? 'rgba(255,255,255,0.03)' : '#f1f5f9',
                                    color: isDark ? '#64748b' : '#94a3b8',
                                    fontSize: 13,
                                    fontWeight: 700,
                                    cursor: 'not-allowed',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    opacity: 0.75,
                                    userSelect: 'none',
                                }}
                            >
                                <Lock size={14} />
                                <span>Close in {timeLeft}s</span>
                            </button>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
