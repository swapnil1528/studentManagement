import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AlertTriangle,
    Clock,
    X,
    CreditCard,
    ArrowRight,
    Calendar,
    CheckCircle2,
    Lock
} from 'lucide-react';

const COUNTDOWN_SECONDS = 5;

export default function MobileFeeReminderModal({
    isOpen = false,
    onClose,
    onNavigateToFees,
    feeSummary = {},
    profile = {},
    enrollments = []
}) {
    const [timeLeft, setTimeLeft] = useState(COUNTDOWN_SECONDS);
    const [canClose, setCanClose] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setTimeLeft(COUNTDOWN_SECONDS);
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

    if (!isOpen) return null;

    const totalFee = Number(feeSummary?.totalFee || feeSummary?.totalAmount || 0);
    const totalPaid = Number(feeSummary?.totalPaid || feeSummary?.paidAmount || 0);
    const pendingAmount = feeSummary?.pendingAmount !== undefined
        ? Number(feeSummary.pendingAmount)
        : Math.max(0, totalFee - totalPaid);

    const dueDate = feeSummary?.dueDate || feeSummary?.nextDueDate || '';

    // Calculate due date status badge
    let dueStatusBadge = 'Payment Due';
    let isOverdue = false;
    if (dueDate) {
        const parts = String(dueDate).split(/[-/.]/);
        let d = null;
        if (parts.length === 3) {
            if (parts[0].length === 4) d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            else d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        } else {
            d = new Date(dueDate);
        }
        if (d && !isNaN(d.getTime())) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            d.setHours(0, 0, 0, 0);
            const diff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            if (diff > 0) dueStatusBadge = `${diff} Days Left`;
            else if (diff === 0) dueStatusBadge = 'Due Today!';
            else {
                dueStatusBadge = `${Math.abs(diff)} Days Overdue`;
                isOverdue = true;
            }
        }
    }

    const studentName = profile?.name || 'Student';
    const studentId = profile?.id || profile?.studentId || '';

    return (
        <AnimatePresence>
            <div
                className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans select-none overflow-y-auto"
                onClick={() => {
                    if (canClose && onClose) onClose();
                }}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ duration: 0.28, ease: 'easeOut' }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-sm bg-[#131B2E] border border-[#F43F5E]/40 rounded-[26px] p-5 shadow-2xl text-white my-auto overflow-hidden"
                >
                    {/* Glowing Top Colored Strip */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#F43F5E] via-[#F59E0B] to-[#EC4899]" />

                    {/* Header Row */}
                    <div className="flex items-center justify-between mb-3.5 pt-1">
                        <div className="flex items-center space-x-2">
                            <span className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-base shadow-sm">
                                ⚠️
                            </span>
                            <div>
                                <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[#F43F5E]">
                                    Fee Due Notice
                                </span>
                                <h3 className="text-sm font-extrabold text-white leading-tight">
                                    Payment Reminder
                                </h3>
                            </div>
                        </div>

                        {/* Top close or timer button */}
                        {canClose ? (
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-8 h-8 rounded-full bg-[#1F293D] hover:bg-[#334155] border border-white/10 flex items-center justify-center text-white text-xs transition-colors"
                                title="Close"
                            >
                                <X size={15} />
                            </button>
                        ) : (
                            <div className="flex items-center space-x-1 bg-[#1F293D] border border-white/10 px-2 py-1 rounded-full text-[10px] font-bold text-[#94A3B8]">
                                <Clock size={11} className="animate-spin text-[#F59E0B]" />
                                <span>{timeLeft}s</span>
                            </div>
                        )}
                    </div>

                    {/* Student Greeting */}
                    <p className="text-xs text-[#94A3B8] mb-3 leading-relaxed">
                        Hello <strong className="text-white">{studentName}</strong>
                        {studentId ? ` (#${studentId})` : ''}, you have an active outstanding course balance.
                    </p>

                    {/* Main Outstanding Amount Card */}
                    <div className="bg-gradient-to-br from-[#1E1B4B]/80 to-[#0F172A] border border-[#F43F5E]/30 rounded-2xl p-4 mb-3 text-center relative overflow-hidden">
                        <span className="block text-[11px] font-bold text-[#818CF8] tracking-wide uppercase">
                            Total Outstanding Dues
                        </span>
                        <div className="text-3xl font-black text-[#F43F5E] my-1 tracking-tight">
                            ₹{Math.round(pendingAmount).toLocaleString('en-IN')}
                        </div>

                        {dueDate && (
                            <div className="inline-flex items-center space-x-1.5 bg-[#0B0F19] border border-[#F43F5E]/30 px-2.5 py-1 rounded-full mt-1">
                                <Calendar size={12} className={isOverdue ? 'text-rose-400' : 'text-amber-400'} />
                                <span className="text-[11px] font-bold text-[#CBD5E1]">
                                    Due: <strong className={isOverdue ? 'text-rose-400' : 'text-amber-300'}>{dueDate}</strong>
                                </span>
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${isOverdue ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'}`}>
                                    {dueStatusBadge}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Breakdown metrics (Total vs Paid) */}
                    <div className="grid grid-cols-2 gap-2 mb-3.5">
                        <div className="bg-[#0B0F19] border border-[#1F293D] rounded-xl p-2.5">
                            <span className="block text-[10px] text-[#94A3B8] font-medium">Total Course Fee</span>
                            <span className="block text-sm font-bold text-white mt-0.5">
                                ₹{Math.round(totalFee).toLocaleString('en-IN')}
                            </span>
                        </div>
                        <div className="bg-[#0B0F19] border border-[#1F293D] rounded-xl p-2.5">
                            <span className="block text-[10px] text-[#94A3B8] font-medium">Amount Paid</span>
                            <span className="block text-sm font-bold text-[#10B981] mt-0.5">
                                ₹{Math.round(totalPaid).toLocaleString('en-IN')}
                            </span>
                        </div>
                    </div>

                    {/* Course list (if any) */}
                    {enrollments && enrollments.length > 0 && (
                        <div className="bg-[#0B0F19] border border-[#1F293D] rounded-xl p-2.5 mb-3.5 space-y-1.5">
                            <span className="block text-[10px] font-bold text-[#818CF8] uppercase tracking-wider">
                                Enrolled Courses
                            </span>
                            {enrollments.slice(0, 3).map((enr, i) => (
                                <div key={i} className="flex items-center justify-between text-xs py-0.5">
                                    <span className="text-white font-medium truncate max-w-[170px]">
                                        {enr.course || 'Course'}
                                    </span>
                                    <span className="text-[#F43F5E] font-bold shrink-0">
                                        Due: ₹{Math.round(Number(enr.pendingFee || enr.pendingAmount || 0)).toLocaleString('en-IN')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-2 pt-1">
                        <button
                            type="button"
                            onClick={() => {
                                if (onNavigateToFees) onNavigateToFees();
                                else if (onClose) onClose();
                            }}
                            className="w-full h-12 rounded-xl bg-gradient-to-r from-[#4F46E5] to-[#06B6D4] font-bold text-xs text-white shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
                        >
                            <CreditCard size={15} />
                            <span>View Details & Pay Ledger</span>
                            <ArrowRight size={14} />
                        </button>

                        {canClose ? (
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full h-10 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-xs font-bold text-[#CBD5E1] active:scale-[0.98] transition-all flex items-center justify-center space-x-1"
                            >
                                <CheckCircle2 size={13} className="text-[#10B981]" />
                                <span>I Understand • Remind Later</span>
                            </button>
                        ) : (
                            <div className="w-full h-10 rounded-xl bg-[#0B0F19] border border-[#1F293D] text-[11px] font-semibold text-[#64748B] flex items-center justify-center space-x-1.5">
                                <Lock size={12} />
                                <span>Close available in {timeLeft}s</span>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

