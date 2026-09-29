/**
 * =======================================================
 * FeesTab.jsx — Student Portal Fees & Course Enrollment Tab
 * =======================================================
 * Displays the student's enrolled courses, fee structure,
 * payment milestones, outstanding dues, and receipt history.
 */

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useReactToPrint } from 'react-to-print';
import {
    CreditCard, GraduationCap, CheckCircle2, AlertCircle,
    Receipt, Calendar, Building, Clock, Printer,
    FileText, ArrowRight, ShieldCheck, Sparkles
} from 'lucide-react';
import Badge from '../../../components/ui/Badge';
import ReceiptTemplate from '../../../components/ui/ReceiptTemplate';

export default function FeesTab({
    enrollments = [],
    feePayments = [],
    feeSummary = {},
    franchise = null,
    profile = null,
    isDark = false,
    onOpenFeeReminder = null,
}) {
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const receiptPrintRef = useRef();

    const handlePrintReceipt = useReactToPrint({
        contentRef: receiptPrintRef,
        documentTitle: `Receipt_${selectedReceipt?.receiptNo || selectedReceipt?.recNo || 'Student_Fee'}`
    });

    const cardStyle = {
        background: isDark ? 'rgba(26,22,48,0.85)' : '#ffffff',
        borderRadius: 22,
        border: `1.5px solid ${isDark ? 'rgba(139,92,246,0.15)' : 'rgba(124,58,237,0.08)'}`,
        boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 2px 16px rgba(0,0,0,0.05)',
        padding: '24px',
        marginBottom: 20,
    };

    const hasDues = (feeSummary?.pendingAmount || 0) > 0;
    return (
        <div style={{ paddingBottom: 40 }}>
            {/* Top Header */}
            <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 14,
                        background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', boxShadow: '0 4px 14px rgba(124,58,237,0.3)'
                    }}>
                        <CreditCard size={22} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: 22, fontWeight: 900, color: isDark ? '#ede9fe' : '#1a1035', margin: 0 }}>
                            Fees & Course Enrollments
                        </h2>
                        <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, fontWeight: 600 }}>
                            Track your enrolled courses, fee installments, and official receipts
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {hasDues && onOpenFeeReminder && (
                        <button
                            onClick={onOpenFeeReminder}
                            style={{
                                padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 800,
                                background: '#ef4444', color: '#ffffff', border: 'none',
                                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                                boxShadow: '0 3px 10px rgba(239,68,68,0.3)',
                                transition: 'all 0.2s',
                            }}
                            title="View Due Fee Reminder Popup"
                        >
                            <span>⚠️ View Reminder Notice</span>
                        </button>
                    )}
                    <span style={{
                        padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 800,
                        background: hasDues ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                        color: hasDues ? '#ef4444' : '#10b981',
                        border: `1px solid ${hasDues ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`
                    }}>
                        {hasDues ? `⚠️ Dues: ₹${(feeSummary?.pendingAmount || 0).toLocaleString('en-IN')}` : '🎉 All Dues Cleared'}
                    </span>
                </div>
            </div>

            {/* Quick KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14, marginBottom: 24 }}>
                {/* Total Course Fee */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{
                        ...cardStyle, padding: 18, marginBottom: 0,
                        borderLeft: '4px solid #7c3aed',
                        background: isDark ? 'rgba(26,22,48,0.9)' : 'linear-gradient(135deg, #ffffff, #faf5ff)'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Total Course Fee
                            </div>
                            <div style={{ fontSize: 24, fontWeight: 900, color: isDark ? '#ede9fe' : '#1a1035', marginTop: 4 }}>
                                ₹{(feeSummary?.totalFee || 0).toLocaleString('en-IN')}
                            </div>
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, fontWeight: 600 }}>
                                Across {enrollments.length} enrolled {enrollments.length === 1 ? 'course' : 'courses'}
                            </div>
                        </div>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed' }}>
                            <GraduationCap size={20} />
                        </div>
                    </div>
                </motion.div>

                {/* Total Paid */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.08 }}
                    style={{
                        ...cardStyle, padding: 18, marginBottom: 0,
                        borderLeft: '4px solid #10b981',
                        background: isDark ? 'rgba(26,22,48,0.9)' : 'linear-gradient(135deg, #ffffff, #ecfdf5)'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Total Paid So Far
                            </div>
                            <div style={{ fontSize: 24, fontWeight: 900, color: '#10b981', marginTop: 4 }}>
                                ₹{(feeSummary?.totalPaid || 0).toLocaleString('en-IN')}
                            </div>
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, fontWeight: 600 }}>
                                {feePayments.length} recorded {feePayments.length === 1 ? 'payment' : 'payments'}
                            </div>
                        </div>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                            <CheckCircle2 size={20} />
                        </div>
                    </div>
                </motion.div>

                {/* Pending Dues */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.16 }}
                    style={{
                        ...cardStyle, padding: 18, marginBottom: 0,
                        borderLeft: `4px solid ${hasDues ? '#ef4444' : '#10b981'}`,
                        background: isDark ? 'rgba(26,22,48,0.9)' : hasDues ? 'linear-gradient(135deg, #ffffff, #fff1f2)' : 'linear-gradient(135deg, #ffffff, #ecfdf5)'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 800, color: hasDues ? '#ef4444' : '#10b981', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Outstanding Dues
                            </div>
                            <div style={{ fontSize: 24, fontWeight: 900, color: hasDues ? '#ef4444' : '#10b981', marginTop: 4 }}>
                                ₹{(feeSummary?.pendingAmount || 0).toLocaleString('en-IN')}
                            </div>
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, fontWeight: 600 }}>
                                {hasDues ? 'Balance due for clearance' : 'No balance due!'}
                            </div>
                        </div>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: hasDues ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: hasDues ? '#ef4444' : '#10b981' }}>
                            {hasDues ? <AlertCircle size={20} /> : <ShieldCheck size={20} />}
                        </div>
                    </div>
                </motion.div>

                {/* Payment Progress */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.24 }}
                    style={{
                        ...cardStyle, padding: 18, marginBottom: 0,
                        borderLeft: '4px solid #06b6d4',
                        background: isDark ? 'rgba(26,22,48,0.9)' : 'linear-gradient(135deg, #ffffff, #ecfeff)'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#06b6d4', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Fee Progress
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 900, color: '#06b6d4' }}>
                            {feeSummary?.collectionRate || 0}%
                        </span>
                    </div>
                    {/* Visual Progress Bar */}
                    <div style={{ width: '100%', height: 8, borderRadius: 999, background: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0', overflow: 'hidden', margin: '8px 0 6px' }}>
                        <div style={{
                            width: `${Math.min(100, feeSummary?.collectionRate || 0)}%`,
                            height: '100%',
                            borderRadius: 999,
                            background: hasDues ? 'linear-gradient(90deg, #7c3aed, #06b6d4)' : 'linear-gradient(90deg, #10b981, #059669)',
                            transition: 'width 0.8s ease'
                        }} />
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                        {hasDues ? `${100 - (feeSummary?.collectionRate || 0)}% remaining to settle` : 'Completed 100%'}
                    </div>
                </motion.div>

                {/* Next Due Date (+29 Days) */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 }}
                    style={{
                        ...cardStyle, padding: 18, marginBottom: 0,
                        borderLeft: `4px solid ${hasDues ? '#f59e0b' : '#10b981'}`,
                        background: isDark ? 'rgba(26,22,48,0.9)' : (hasDues ? 'linear-gradient(135deg, #ffffff, #fffbeb)' : 'linear-gradient(135deg, #ffffff, #f0fdf4)')
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 800, color: hasDues ? '#d97706' : '#10b981', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Next Due Date (+29d)
                            </div>
                            <div style={{ fontSize: 20, fontWeight: 900, color: hasDues ? '#d97706' : '#10b981', marginTop: 4 }}>
                                {hasDues ? (feeSummary?.dueDate || 'Within 29 Days') : 'Dues Cleared'}
                            </div>
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, fontWeight: 600 }}>
                                {hasDues
                                    ? `Reminder window: ${feeSummary?.reminderStartDate || 'Active'} to ${feeSummary?.reminderGraceEndDate || 'Due'}`
                                    : 'No upcoming due dates'}
                            </div>
                        </div>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: hasDues ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: hasDues ? '#f59e0b' : '#10b981' }}>
                            <Clock size={20} />
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Dues Alert Banner if pending */}
            {hasDues && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{
                        borderRadius: 18, padding: '16px 20px',
                        background: 'linear-gradient(135deg, #fff1f2, #ffe4e6)',
                        border: '1.5px solid #fecdd3',
                        color: '#9f1239',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14,
                        marginBottom: 24, boxShadow: '0 4px 16px rgba(244,63,94,0.08)'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f43f5e', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <AlertCircle size={20} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: 14, color: '#881337' }}>
                                Outstanding Fee Due: ₹{(feeSummary?.pendingAmount || 0).toLocaleString('en-IN')}
                            </div>
                            <div style={{ fontSize: 12, color: '#9f1239', marginTop: 2 }}>
                                Please clear your remaining balance at the institute accounts desk at <strong>{profile?.branch || 'your branch'}</strong>.
                            </div>
                        </div>
                    </div>
                    {franchise?.mobile && (
                        <a
                            href={`tel:${franchise.mobile}`}
                            style={{
                                padding: '8px 16px', borderRadius: 12, background: '#be123c', color: 'white',
                                textDecoration: 'none', fontWeight: 700, fontSize: 12, display: 'inline-flex',
                                alignItems: 'center', gap: 6
                            }}
                        >
                            Contact Desk: +91 {franchise.mobile}
                        </a>
                    )}
                </motion.div>
            )}

            {/* ── Section: Enrolled Courses & Fee Breakdown ── */}
            <div style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(124,58,237,0.1)', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <GraduationCap size={18} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: 16, fontWeight: 900, color: isDark ? '#ede9fe' : '#1a1035', margin: 0 }}>
                            Enrolled Courses ({enrollments.length})
                        </h3>
                        <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, fontWeight: 600 }}>
                            Courses enrolled under student ID: {profile?.id}
                        </p>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                    {enrollments.length > 0 ? (
                        enrollments.map((enr, i) => {
                            const cRate = enr.totalFee > 0 ? Math.round((enr.paidFee / enr.totalFee) * 100) : (enr.paidFee > 0 ? 100 : 0);
                            const isPaid = (enr.pendingFee || 0) <= 0 && enr.totalFee > 0;
                            return (
                                <div
                                    key={i}
                                    style={{
                                        border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9'}`,
                                        borderRadius: 18,
                                        padding: '16px',
                                        background: isDark ? 'rgba(255,255,255,0.03)' : '#f8f7ff',
                                        display: 'flex', flexDirection: 'column', gap: 12
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <span style={{ fontSize: 15, fontWeight: 900, color: isDark ? '#ede9fe' : '#1a1035' }}>
                                                {enr.course}
                                            </span>
                                            <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700, marginTop: 2 }}>
                                                Batch: {enr.batch || 'Regular'}
                                            </div>
                                        </div>
                                        <span style={{
                                            padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 800,
                                            background: isPaid ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                            color: isPaid ? '#10b981' : '#ef4444'
                                        }}>
                                            {isPaid ? 'Fully Paid' : 'Fee Pending'}
                                        </span>
                                    </div>

                                    {/* Meta Details */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11, color: '#64748b' }}>
                                        <div>
                                            <span style={{ opacity: 0.7 }}>Adm No: </span>
                                            <strong style={{ color: isDark ? '#cbd5e1' : '#334155' }}>{enr.admNo || '--'}</strong>
                                        </div>
                                        <div>
                                            <span style={{ opacity: 0.7 }}>Campus: </span>
                                            <strong style={{ color: isDark ? '#cbd5e1' : '#334155' }}>{enr.branch || 'Main'}</strong>
                                        </div>
                                    </div>

                                    {/* Financial Breakdown */}
                                    <div style={{
                                        background: isDark ? 'rgba(0,0,0,0.2)' : '#ffffff',
                                        borderRadius: 12, padding: '10px 12px',
                                        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6,
                                        textAlign: 'center', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}`
                                    }}>
                                        <div>
                                            <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Total Fee</div>
                                            <div style={{ fontSize: 13, fontWeight: 800, color: isDark ? '#cbd5e1' : '#1e293b', marginTop: 2 }}>
                                                ₹{(enr.totalFee || 0).toLocaleString('en-IN')}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 9, fontWeight: 700, color: '#10b981', textTransform: 'uppercase' }}>Paid</div>
                                            <div style={{ fontSize: 13, fontWeight: 800, color: '#10b981', marginTop: 2 }}>
                                                ₹{(enr.paidFee || 0).toLocaleString('en-IN')}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 9, fontWeight: 700, color: isPaid ? '#10b981' : '#ef4444', textTransform: 'uppercase' }}>Due</div>
                                            <div style={{ fontSize: 13, fontWeight: 800, color: isPaid ? '#10b981' : '#ef4444', marginTop: 2 }}>
                                                ₹{(enr.pendingFee || 0).toLocaleString('en-IN')}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mini Progress */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>
                                            <span>Progress</span>
                                            <span>{cRate}%</span>
                                        </div>
                                        <div style={{ width: '100%', height: 6, borderRadius: 999, background: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0', overflow: 'hidden' }}>
                                            <div style={{ width: `${cRate}%`, height: '100%', background: isPaid ? '#10b981' : '#7c3aed', borderRadius: 999 }} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div style={{ gridColumn: '1 / -1', padding: 24, textAlign: 'center', color: '#94a3b8' }}>
                            No courses enrolled yet.
                        </div>
                    )}
                </div>
            </div>

            {/* ── Section: Fee Payment Receipts & History ── */}
            <div style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(6,182,212,0.1)', color: '#06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Receipt size={18} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: 16, fontWeight: 900, color: isDark ? '#ede9fe' : '#1a1035', margin: 0 }}>
                                Official Payment Receipts ({feePayments.length})
                            </h3>
                            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, fontWeight: 600 }}>
                                Download or print your verified fee payment receipts
                            </p>
                        </div>
                    </div>
                </div>

                <div style={{ overflowX: 'auto', width: '100%' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                        <thead>
                            <tr style={{
                                borderBottom: `2px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9'}`,
                                color: '#94a3b8', fontSize: 11, fontWeight: 800, textTransform: 'uppercase'
                            }}>
                                <th style={{ padding: '10px 14px' }}>Receipt No</th>
                                <th style={{ padding: '10px 14px' }}>Paid Date</th>
                                <th style={{ padding: '10px 14px' }}>Next Due (+29d)</th>
                                <th style={{ padding: '10px 14px' }}>Course</th>
                                <th style={{ padding: '10px 14px' }}>Mode</th>
                                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Amount Paid</th>
                                <th style={{ padding: '10px 14px', textAlign: 'center' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {feePayments.length > 0 ? (
                                feePayments.map((p, idx) => (
                                    <tr
                                        key={idx}
                                        style={{
                                            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f8f7ff'}`,
                                            transition: 'background 0.2s'
                                        }}
                                    >
                                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 700, color: isDark ? '#c4b5fd' : '#7c3aed' }}>
                                            {p.recNo || `REC-${idx + 1}`}
                                        </td>
                                        <td style={{ padding: '12px 14px', color: isDark ? '#cbd5e1' : '#475569' }}>
                                            {p.date || '--'}
                                        </td>
                                        <td style={{ padding: '12px 14px' }}>
                                            <span style={{
                                                padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                                                background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
                                                border: '1px solid rgba(239, 68, 68, 0.2)'
                                            }}>
                                                📅 {p.dueDate || '--'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 14px', fontWeight: 600, color: isDark ? '#ede9fe' : '#1e293b' }}>
                                            {p.course || enrollments[0]?.course || 'Course Fee'}
                                        </td>
                                        <td style={{ padding: '12px 14px' }}>
                                            <span style={{
                                                padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                                                background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                                                color: isDark ? '#cbd5e1' : '#475569'
                                            }}>
                                                {p.mode || 'Cash'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 900, color: '#10b981', fontSize: 14 }}>
                                            ₹{(p.amount || 0).toLocaleString('en-IN')}
                                        </td>
                                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                            <button
                                                onClick={() => {
                                                    setSelectedReceipt({
                                                        id: profile?.id,
                                                        name: profile?.name,
                                                        course: p.course || enrollments[0]?.course,
                                                        amount: p.amount,
                                                        mode: p.mode,
                                                        receiptNo: p.recNo,
                                                        date: p.date,
                                                        collector: p.collector
                                                    });
                                                    setTimeout(() => {
                                                        handlePrintReceipt();
                                                    }, 150);
                                                }}
                                                style={{
                                                    padding: '5px 12px', borderRadius: 8,
                                                    background: isDark ? 'rgba(124,58,237,0.2)' : '#ede9fe',
                                                    color: isDark ? '#c4b5fd' : '#7c3aed',
                                                    border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12,
                                                    display: 'inline-flex', alignItems: 'center', gap: 5
                                                }}
                                                title="Print or Save Receipt as PDF"
                                            >
                                                <Printer size={13} /> Print
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} style={{ padding: '24px 14px', textAlign: 'center', color: '#94a3b8' }}>
                                        No fee payment receipts recorded yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Hidden Printable Receipt Template */}
            <div style={{ display: 'none' }}>
                {selectedReceipt && (
                    <ReceiptTemplate
                        ref={receiptPrintRef}
                        transaction={selectedReceipt}
                        franchiseData={franchise}
                    />
                )}
            </div>
        </div>
    );
}
