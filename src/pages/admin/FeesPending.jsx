/**
 * =======================================================
 * FeesPending.jsx - Multi-Branch Fee Pending & Dues Management
 * =======================================================
 * Allows administrators and branch managers to monitor,
 * track, filter, and collect pending student fees across
 * all branches of the institute.
 */

import { useState, useMemo, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import {
    Search, Filter, Download, Printer, RotateCcw,
    AlertCircle, CheckCircle2, Clock, Building2,
    Users, Phone, ArrowUpDown, CreditCard, History,
    Sparkles, Send, GraduationCap
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { showToast } from '../../components/ui/Toast';
import { saveFeeCollection } from '../../services/api';
import { exportCsv, exportPdf } from '../../utils/exportUtils';
import ReceiptTemplate from '../../components/ui/ReceiptTemplate';

// Consistent branch badge color generator
const BRANCH_PALETTES = [
    { bg: '#eef2ff', text: '#4338ca', border: '#c7d2fe' },
    { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' },
    { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
    { bg: '#faf5ff', text: '#6b21a8', border: '#e9d5ff' },
    { bg: '#ecfeff', text: '#155e75', border: '#a5f3fc' },
    { bg: '#fff1f2', text: '#9f1239', border: '#fecdd3' },
];

export default function FeesPending({ adminData, user, onReload }) {
    const dropdowns = adminData?.dropdowns || {};
    const userBranch = user?.branch || 'All';
    const isAdmin = user?.role === 'admin';

    // Current Branch filter: defaults to 'All' for admin, or user's assigned branch
    const [selectedBranch, setSelectedBranch] = useState(
        isAdmin || !userBranch || userBranch.toLowerCase() === 'all' ? 'All' : userBranch
    );

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('pending'); // 'all', 'pending', 'unpaid', 'partial', 'paid'
    const [filterCourse, setFilterCourse] = useState('All');
    const [filterBatch, setFilterBatch] = useState('All');
    const [sortBy, setSortBy] = useState('pending_desc'); // 'pending_desc', 'pending_asc', 'name_asc', 'date_desc'

    // Modals
    const [quickCollectModal, setQuickCollectModal] = useState(null);
    const [collectForm, setCollectForm] = useState({
        amount: '',
        mode: 'Cash',
        collector: '',
        remarks: '', dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
    });
    const [collecting, setCollecting] = useState(false);

    // Payment History Modal
    const [historyModal, setHistoryModal] = useState(null);

    // Receipt printing for successful collections
    const [successTx, setSuccessTx] = useState(null);
    const receiptRef = useRef();
    const handlePrintReceipt = useReactToPrint({
        contentRef: receiptRef,
        documentTitle: `Receipt_${successTx?.receiptNo || 'Fee'}`,
        onAfterPrint: () => setSuccessTx(null)
    });
    // Determine all unique branches dynamically
    const allBranches = useMemo(() => {
        const branchSet = new Set();
        (dropdowns.branches || []).forEach(b => b && branchSet.add(String(b).trim()));
        (adminData?.admissions || []).forEach(a => a[6] && branchSet.add(String(a[6]).trim()));
        (adminData?.franchises || []).forEach(f => f.branch && branchSet.add(String(f.branch).trim()));
        return Array.from(branchSet).sort();
    }, [dropdowns.branches, adminData?.admissions, adminData?.franchises]);

    // Branch Color Map
    const branchColorMap = useMemo(() => {
        const map = {};
        allBranches.forEach((b, i) => {
            map[b.toLowerCase()] = BRANCH_PALETTES[i % BRANCH_PALETTES.length];
        });
        return map;
    }, [allBranches]);

    // Calculate detailed fee status for every admission record
    const allStudentFeeRecords = useMemo(() => {
        const admissions = adminData?.admissions || [];
        const fees = adminData?.fees || [];

        // Index fee collections by student ID
        const feesByStudent = new Map();
        fees.forEach(f => {
            const rawStudId = String(f[2] || '').trim().toLowerCase();
            if (!rawStudId) return;

            const dateStr = String(f[0]).includes('-') || String(f[0]).includes('/') ? f[0] : (f[1] || '');
            const recNo = String(f[0]).includes('-') ? f[1] : f[0];
            const amount = parseFloat(f[5]) || 0;
            const course = String(f[4] || '').trim();
            const mode = f[6] || 'Cash';
            const collector = f[7] || f[8] || '';

            const dueDate = String(f[10] || '').trim();
            const entry = {
                recNo,
                date: dateStr,
                amount,
                course,
                mode,
                collector,
                dueDate
            };

            if (!feesByStudent.has(rawStudId)) {
                feesByStudent.set(rawStudId, []);
            }
            feesByStudent.get(rawStudId).push(entry);
        });

        return admissions.map((adm, idx) => {
            const rowId = adm[0];
            const admNo = adm[1] || '';
            const studId = adm[2] || '';
            const name = adm[3] || 'Student ' + (idx + 1);
            const mobile = adm[4] || '';
            const dob = adm[5] || '';
            const branch = adm[6] || 'Main Branch';
            const course = adm[7] || '';
            const batch = adm[8] || '';
            const admDate = adm[9] || '';
            const totalFee = parseFloat(adm[10]) || 0;
            const status = adm[11] || 'Active';
            const photo = adm[12] || '';

            const rawStudId = String(studId).trim().toLowerCase();
            const allStudFees = feesByStudent.get(rawStudId) || [];

            // If student has multiple admissions/courses, match on course
            const matchingFees = allStudFees.filter(f =>
                !f.course || !course || f.course.toLowerCase() === course.toLowerCase()
            );
            const applicableFees = matchingFees.length > 0 ? matchingFees : allStudFees;

            const totalPaid = applicableFees.reduce((sum, f) => sum + f.amount, 0);
            const pendingAmount = Math.max(0, totalFee - totalPaid);
            const percentPaid = totalFee > 0
                ? Math.min(100, Math.round((totalPaid / totalFee) * 100))
                : (totalPaid > 0 ? 100 : 0);

            let paymentStatus = 'Unpaid';
            if (totalFee === 0 && totalPaid === 0) {
                paymentStatus = 'No Fee Set';
            } else if (pendingAmount === 0 && totalFee > 0) {
                paymentStatus = 'Paid';
            } else if (totalPaid > 0 && pendingAmount > 0) {
                paymentStatus = 'Partial';
            } else {
                paymentStatus = 'Unpaid';
            }

            const lastPayment = applicableFees.length > 0
                ? applicableFees[applicableFees.length - 1]
                : null;

            // Get due date: prefer latest fee payment's due date, else from Admission Data col 14
            const latestDueFromFee = [...applicableFees].reverse().find(f => f.dueDate)?.dueDate || '';
            const admDueDate = String(adm[14] || '').trim();
            const dueDate = latestDueFromFee || admDueDate || '';

            return {
                rowId,
                admNo,
                studId,
                name,
                mobile,
                dob,
                branch,
                course,
                batch,
                admDate,
                totalFee,
                totalPaid,
                pendingAmount,
                percentPaid,
                paymentStatus,
                status,
                photo,
                payments: applicableFees,
                lastPaymentDate: lastPayment ? lastPayment.date : null,
                paymentCount: applicableFees.length,
                dueDate
            };
        });
    }, [adminData?.admissions, adminData?.fees]);

    // Helper to get franchise info for a student's branch
    const getFranchiseData = (branchName) => {
        if (!adminData?.franchises || adminData.franchises.length === 0) return null;
        const match = adminData.franchises.find(
            f => String(f.branch || '').toLowerCase() === String(branchName || '').toLowerCase()
        );
        return match || adminData.franchises[0];
    };

    // Calculate Branch-wise breakdown summary for ALL branches
    const branchBreakdown = useMemo(() => {
        const stats = {};
        allBranches.forEach(b => {
            stats[b] = {
                branch: b,
                totalExpected: 0,
                totalPaid: 0,
                totalPending: 0,
                studentsWithDues: 0,
                totalStudents: 0
            };
        });

        allStudentFeeRecords.forEach(s => {
            const b = s.branch || 'Main Branch';
            if (!stats[b]) {
                stats[b] = {
                    branch: b,
                    totalExpected: 0,
                    totalPaid: 0,
                    totalPending: 0,
                    studentsWithDues: 0,
                    totalStudents: 0
                };
            }
            stats[b].totalExpected += s.totalFee;
            stats[b].totalPaid += s.totalPaid;
            stats[b].totalPending += s.pendingAmount;
            stats[b].totalStudents += 1;
            if (s.pendingAmount > 0) {
                stats[b].studentsWithDues += 1;
            }
        });

        return Object.values(stats);
    }, [allBranches, allStudentFeeRecords]);
    // Filter records based on selected Branch and other filter criteria
    const filteredRecords = useMemo(() => {
        return allStudentFeeRecords.filter(s => {
            // Branch filter
            if (selectedBranch !== 'All' && s.branch.toLowerCase() !== selectedBranch.toLowerCase()) {
                return false;
            }

            // Payment status filter
            if (filterStatus === 'pending') {
                if (s.pendingAmount <= 0) return false;
            } else if (filterStatus === 'unpaid') {
                if (s.paymentStatus !== 'Unpaid') return false;
            } else if (filterStatus === 'partial') {
                if (s.paymentStatus !== 'Partial') return false;
            } else if (filterStatus === 'paid') {
                if (s.paymentStatus !== 'Paid') return false;
            }

            // Course filter
            if (filterCourse !== 'All' && s.course.toLowerCase() !== filterCourse.toLowerCase()) {
                return false;
            }

            // Batch filter
            if (filterBatch !== 'All' && s.batch.toLowerCase() !== filterBatch.toLowerCase()) {
                return false;
            }

            // Search query filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchName = s.name.toLowerCase().includes(q);
                const matchId = s.studId.toLowerCase().includes(q);
                const matchMobile = String(s.mobile).toLowerCase().includes(q);
                const matchCourse = s.course.toLowerCase().includes(q);
                const matchBranch = s.branch.toLowerCase().includes(q);
                if (!matchName && !matchId && !matchMobile && !matchCourse && !matchBranch) {
                    return false;
                }
            }

            return true;
        }).sort((a, b) => {
            if (sortBy === 'pending_desc') return b.pendingAmount - a.pendingAmount;
            if (sortBy === 'pending_asc') return a.pendingAmount - b.pendingAmount;
            if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
            if (sortBy === 'date_desc') return String(b.admDate || '').localeCompare(String(a.admDate || ''));
            return 0;
        });
    }, [allStudentFeeRecords, selectedBranch, filterStatus, filterCourse, filterBatch, searchQuery, sortBy]);

    // High-Level KPIs for the selected branch (or across All Branches)
    const kpis = useMemo(() => {
        const pool = selectedBranch === 'All'
            ? allStudentFeeRecords
            : allStudentFeeRecords.filter(s => s.branch.toLowerCase() === selectedBranch.toLowerCase());

        let totalExpected = 0;
        let totalPaid = 0;
        let totalPending = 0;
        let pendingCount = 0;
        let clearedCount = 0;

        pool.forEach(s => {
            totalExpected += s.totalFee;
            totalPaid += s.totalPaid;
            totalPending += s.pendingAmount;
            if (s.pendingAmount > 0) {
                pendingCount += 1;
            } else if (s.totalFee > 0 && s.pendingAmount === 0) {
                clearedCount += 1;
            }
        });

        const collectionRate = totalExpected > 0 ? Math.round((totalPaid / totalExpected) * 100) : 0;

        return {
            totalExpected,
            totalPaid,
            totalPending,
            pendingCount,
            clearedCount,
            totalStudents: pool.length,
            collectionRate
        };
    }, [allStudentFeeRecords, selectedBranch]);

    // Open Quick Collect Fee Modal
    const openQuickCollect = (student) => {
        setQuickCollectModal(student);
        setCollectForm({
            amount: student.pendingAmount > 0 ? String(student.pendingAmount) : '',
            mode: 'Cash',
            collector: dropdowns.employees?.[0] || '',
            remarks: `Pending clearance for ${student.course}`
        });
    };

    // Save Fee Collection from Modal
    const handleQuickCollectSave = async () => {
        if (!quickCollectModal || !collectForm.amount || parseFloat(collectForm.amount) <= 0) {
            alert('Please enter a valid payment amount.');
            return;
        }

        setCollecting(true);
        try {
            const payload = {
                studId: quickCollectModal.studId,
                name: quickCollectModal.name,
                course: quickCollectModal.course,
                amount: collectForm.amount,
                mode: collectForm.mode,
                collector: collectForm.collector,
                dueDate: collectForm.dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
                rem: collectForm.remarks || ''
            };

            const result = await saveFeeCollection(payload);
            if (result?.success) {
                showToast(`Fee of ₹${collectForm.amount} collected for ${quickCollectModal.name}!`);

                const recNumber = result.receiptNo || `REC-${Date.now().toString().slice(-6)}`;
                setSuccessTx({
                    id: quickCollectModal.studId,
                    name: quickCollectModal.name,
                    course: quickCollectModal.course,
                    amount: collectForm.amount,
                    mode: collectForm.mode,
                    collector: collectForm.collector,
                    receiptNo: recNumber,
                    date: new Date().toLocaleDateString('en-IN'),
                    branch: quickCollectModal.branch
                });

                setQuickCollectModal(null);
                onReload?.();
            } else {
                alert(result?.error || 'Failed to record fee collection.');
            }
        } catch (err) {
            console.error('[QuickCollect] Error:', err);
            alert('Network error while saving fee payment.');
        } finally {
            setCollecting(false);
        }
    };

    // WhatsApp Reminder Generator
    const handleSendWhatsApp = (student) => {
        if (!student.mobile || String(student.mobile).trim() === '') {
            alert(`No mobile number registered for ${student.name}.`);
            return;
        }

        let cleanMobile = String(student.mobile).replace(/\D/g, '');
        if (cleanMobile.length === 10) {
            cleanMobile = '91' + cleanMobile;
        }

        const franchise = getFranchiseData(student.branch);
        const instituteName = franchise?.centerName || 'EduManager Institute';

        const text = `Dear ${student.name},

Greetings from *${instituteName}* (${student.branch}).

This is a friendly reminder regarding your pending course fee for *${student.course}*.

📌 *Student ID:* ${student.studId}
💰 *Total Course Fee:* ₹${student.totalFee.toLocaleString('en-IN')}
✅ *Amount Paid:* ₹${student.totalPaid.toLocaleString('en-IN')}
⚠️ *Pending Dues:* ₹${student.pendingAmount.toLocaleString('en-IN')}

Kindly clear the remaining balance at the institute office at your earliest convenience. If you have already made the payment, please disregard this reminder.

Thank you!
*${instituteName}*`;

        const waUrl = `https://wa.me/${cleanMobile}?text=${encodeURIComponent(text)}`;
        window.open(waUrl, '_blank');
    };

    // Export to Excel / CSV
    const handleExportCsv = () => {
        const branchLabel = selectedBranch === 'All' ? 'All_Branches' : selectedBranch.replace(/\s+/g, '_');
        const filename = `Pending_Fees_Report_${branchLabel}_${new Date().toISOString().slice(0, 10)}`;
        const headers = [
            'Sr No', 'Student ID', 'Student Name', 'Mobile', 'Branch',
            'Course', 'Batch', 'Total Fee (₹)', 'Paid Amount (₹)',
            'Pending Balance (₹)', '% Paid', 'Payment Status', 'Installments', 'Last Payment Date'
        ];

        const rows = filteredRecords.map((s, idx) => [
            idx + 1,
            s.studId,
            s.name,
            s.mobile,
            s.branch,
            s.course,
            s.batch,
            s.totalFee,
            s.totalPaid,
            s.pendingAmount,
            `${s.percentPaid}%`,
            s.paymentStatus,
            s.paymentCount,
            s.lastPaymentDate || '--'
        ]);

        exportCsv(filename, headers, rows);
    };

    // Export / Print PDF Report
    const handleExportPdf = () => {
        const branchLabel = selectedBranch === 'All' ? 'All Branches (Consolidated)' : `${selectedBranch} Branch`;
        const title = `Fee Dues & Outstanding Report - ${branchLabel}`;
        const headers = [
            '#', 'Student ID', 'Student Name', 'Branch', 'Course',
            'Total Fee', 'Paid Amount', 'Pending Dues', 'Status'
        ];

        const rows = filteredRecords.map((s, idx) => [
            idx + 1,
            s.studId,
            s.name,
            s.branch,
            s.course,
            `₹${s.totalFee.toLocaleString('en-IN')}`,
            `₹${s.totalPaid.toLocaleString('en-IN')}`,
            `₹${s.pendingAmount.toLocaleString('en-IN')}`,
            s.paymentStatus
        ]);

        exportPdf(title, headers, rows);
    };

    const hasActiveFilters = searchQuery || filterStatus !== 'pending' || filterCourse !== 'All' || filterBatch !== 'All' || sortBy !== 'pending_desc';
    return (
        <div className="space-y-6">
            {/* Top Header & Multi-Branch Selector */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm"
                            style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)' }}>
                            <Clock size={20} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Fees Pending Management</h1>
                            <p className="text-xs text-gray-500 font-medium">
                                Monitor and recover student fee dues across all branches
                            </p>
                        </div>
                    </div>
                </div>

                {/* Branch Switcher & Quick Export Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Branch Selector */}
                    <div className="flex items-center bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-sm gap-2">
                        <Building2 size={16} className="text-indigo-600" />
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Branch:</span>
                        <select
                            className="text-sm font-semibold text-gray-800 bg-transparent focus:outline-none cursor-pointer pr-1"
                            value={selectedBranch}
                            onChange={(e) => setSelectedBranch(e.target.value)}
                        >
                            <option value="All">All Branches (Consolidated)</option>
                            {allBranches.map((b) => (
                                <option key={b} value={b}>{b}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={handleExportCsv}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 shadow-sm transition-all cursor-pointer"
                        title="Export to CSV / Excel"
                    >
                        <Download size={14} /> Excel
                    </button>
                    <button
                        onClick={handleExportPdf}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 shadow-sm transition-all cursor-pointer"
                        title="Print / PDF Report"
                    >
                        <Printer size={14} /> PDF
                    </button>
                    {onReload && (
                        <button
                            onClick={onReload}
                            className="p-2 rounded-xl border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 shadow-sm transition-all cursor-pointer"
                            title="Reload fresh data"
                        >
                            <RotateCcw size={15} />
                        </button>
                    )}
                </div>
            </div>

            {/* KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Pending Dues */}
                <div className="card p-5 border-l-4 border-l-rose-500 bg-gradient-to-br from-white to-rose-50/30">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-rose-600">Total Pending Dues</p>
                            <h3 className="text-2xl font-black text-rose-700 mt-1">
                                ₹{kpis.totalPending.toLocaleString('en-IN')}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1 font-medium">
                                <span className="font-bold text-rose-600">{kpis.pendingCount}</span> students owe fees
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-xl shadow-inner">
                            <AlertCircle size={24} />
                        </div>
                    </div>
                </div>

                {/* Total Fees Collected */}
                <div className="card p-5 border-l-4 border-l-emerald-500 bg-gradient-to-br from-white to-emerald-50/30">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Total Fees Collected</p>
                            <h3 className="text-2xl font-black text-emerald-700 mt-1">
                                ₹{kpis.totalPaid.toLocaleString('en-IN')}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1 font-medium">
                                <span className="font-bold text-emerald-600">{kpis.clearedCount}</span> students fully cleared
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl shadow-inner">
                            <CheckCircle2 size={24} />
                        </div>
                    </div>
                </div>

                {/* Total Expected Course Fees */}
                <div className="card p-5 border-l-4 border-l-indigo-500 bg-gradient-to-br from-white to-indigo-50/30">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Total Course Value</p>
                            <h3 className="text-2xl font-black text-indigo-900 mt-1">
                                ₹{kpis.totalExpected.toLocaleString('en-IN')}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1 font-medium">
                                <span className="font-bold text-gray-700">{kpis.totalStudents}</span> total enrolled admissions
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-xl shadow-inner">
                            <GraduationCap size={24} />
                        </div>
                    </div>
                </div>

                {/* Recovery Progress Rate */}
                <div className="card p-5 border-l-4 border-l-amber-500 bg-gradient-to-br from-white to-amber-50/30">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-amber-600">Collection Rate</p>
                            <h3 className="text-2xl font-black text-gray-900 mt-1">
                                {kpis.collectionRate}%
                            </h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-xl shadow-inner">
                            <Sparkles size={24} />
                        </div>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden mt-1">
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                                width: `${Math.min(100, Math.max(0, kpis.collectionRate))}%`,
                                background: 'linear-gradient(90deg, #10b981, #06b6d4)'
                            }}
                        />
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1 font-medium">
                        {100 - kpis.collectionRate}% outstanding balance remaining
                    </p>
                </div>
            </div>

            {/* Branch-wise breakdown cards when All Branches is selected */}
            {selectedBranch === 'All' && branchBreakdown.length > 1 && (
                <div className="card p-4 bg-white/70 backdrop-blur-sm border border-indigo-100">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Building2 size={16} className="text-indigo-600" />
                            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                                Branch-Wise Fee Dues Summary
                            </h3>
                        </div>
                        <span className="text-xs text-gray-500 font-medium">
                            Click any branch to filter list
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {branchBreakdown.map((b) => {
                            const palette = branchColorMap[b.branch.toLowerCase()] || BRANCH_PALETTES[0];
                            const rate = b.totalExpected > 0 ? Math.round((b.totalPaid / b.totalExpected) * 100) : 0;
                            return (
                                <div
                                    key={b.branch}
                                    onClick={() => setSelectedBranch(b.branch)}
                                    className="p-3.5 rounded-xl border cursor-pointer hover:shadow-md transition-all relative overflow-hidden group"
                                    style={{
                                        background: palette.bg,
                                        borderColor: palette.border
                                    }}
                                >
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="font-bold text-xs truncate" style={{ color: palette.text }}>
                                            {b.branch}
                                        </span>
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white text-gray-700 shadow-2xs">
                                            {rate}% collected
                                        </span>
                                    </div>
                                    <div className="text-lg font-black text-rose-600">
                                        ₹{b.totalPending.toLocaleString('en-IN')}
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1 font-medium">
                                        <span>Dues: <strong className="text-rose-600">{b.studentsWithDues}</strong> students</span>
                                        <span>Paid: <strong>₹{b.totalPaid.toLocaleString('en-IN')}</strong></span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Filter & Search Toolbar */}
            <div className="card p-4">
                <div className="flex flex-wrap items-center gap-3">
                    {/* Search Bar */}
                    <div className="relative flex-1 min-w-[240px]">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            className="inp pl-10 pr-4 py-2 w-full text-sm mb-0!"
                            placeholder="Search by Student Name, ID, Mobile, Course..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-gray-400 uppercase">Status:</span>
                        <select
                            className="inp text-xs font-semibold py-2 px-3 mb-0! cursor-pointer"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="pending">Only Dues / Pending (All)</option>
                            <option value="unpaid">Completely Unpaid (0% Paid)</option>
                            <option value="partial">Partially Paid (Installments)</option>
                            <option value="paid">Fully Cleared (₹0 Due)</option>
                            <option value="all">All Students (Full Audit)</option>
                        </select>
                    </div>

                    {/* Course Filter */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-gray-400 uppercase">Course:</span>
                        <select
                            className="inp text-xs font-semibold py-2 px-3 mb-0! cursor-pointer"
                            value={filterCourse}
                            onChange={(e) => setFilterCourse(e.target.value)}
                        >
                            <option value="All">All Courses</option>
                            {(dropdowns.courses || []).map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    {/* Batch Filter */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-gray-400 uppercase">Batch:</span>
                        <select
                            className="inp text-xs font-semibold py-2 px-3 mb-0! cursor-pointer"
                            value={filterBatch}
                            onChange={(e) => setFilterBatch(e.target.value)}
                        >
                            <option value="All">All Batches</option>
                            {(dropdowns.batches || ['08-10 AM', '10-12 PM', '04-06 PM']).map((b) => (
                                <option key={b} value={b}>{b}</option>
                            ))}
                        </select>
                    </div>

                    {/* Sort Selector */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-gray-400 uppercase">Sort:</span>
                        <select
                            className="inp text-xs font-semibold py-2 px-3 mb-0! cursor-pointer"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                        >
                            <option value="pending_desc">Highest Dues First</option>
                            <option value="pending_asc">Lowest Dues First</option>
                            <option value="name_asc">Student Name (A-Z)</option>
                            <option value="date_desc">Newest Admission</option>
                        </select>
                    </div>

                    {/* Clear Button */}
                    {hasActiveFilters && (
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setFilterStatus('pending');
                                setFilterCourse('All');
                                setFilterBatch('All');
                                setSortBy('pending_desc');
                            }}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline ml-auto cursor-pointer"
                        >
                            Reset Filters
                        </button>
                    )}
                </div>

                {/* Quick Info Counts */}
                <div className="flex items-center justify-between text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100 font-medium">
                    <span>
                        Showing <strong className="text-gray-900">{filteredRecords.length}</strong> students
                        {selectedBranch !== 'All' ? ` in ${selectedBranch}` : ' across All Branches'}
                    </span>
                    <span>
                        Total Filtered Pending: <strong className="text-rose-600 font-bold">
                            ₹{filteredRecords.reduce((sum, r) => sum + r.pendingAmount, 0).toLocaleString('en-IN')}
                        </strong>
                    </span>
                </div>
            </div>
            {/* Students Pending Table */}
            <div className="card p-0 overflow-hidden shadow-sm">
                <div className="overflow-x-auto w-full">
                    <table className="w-full text-left text-sm">
                        <thead className="t-head">
                            <tr>
                                <th className="px-4 py-3.5 font-bold">#</th>
                                <th className="px-4 py-3.5 font-bold">Student Details</th>
                                <th className="px-4 py-3.5 font-bold">Branch</th>
                                <th className="px-4 py-3.5 font-bold">Course & Batch</th>
                                <th className="px-4 py-3.5 font-bold text-right">Total Fee</th>
                                <th className="px-4 py-3.5 font-bold text-right">Paid Fee</th>
                                <th className="px-4 py-3.5 font-bold text-right">Pending Due</th>
                                <th className="px-4 py-3.5 font-bold text-center">Due Date</th>
                                <th className="px-4 py-3.5 font-bold text-center">Recovery Status</th>
                                <th className="px-4 py-3.5 font-bold text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredRecords.length > 0 ? (
                                filteredRecords.map((s, idx) => {
                                    const palette = branchColorMap[s.branch.toLowerCase()] || BRANCH_PALETTES[0];
                                    const hasPhoto = s.photo && String(s.photo).trim() !== '';

                                    return (
                                        <tr key={s.studId + '_' + idx} className="t-row hover:bg-indigo-50/40 transition-colors">
                                            {/* Serial */}
                                            <td className="px-4 py-3.5 font-mono text-xs text-gray-400">
                                                {idx + 1}
                                            </td>

                                            {/* Student Info */}
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    {hasPhoto ? (
                                                        <img
                                                            src={s.photo}
                                                            alt=""
                                                            className="w-9 h-9 rounded-full object-cover border border-gray-200 shadow-2xs"
                                                        />
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                                                            {s.name.substring(0, 2).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="font-bold text-gray-900 leading-snug">{s.name}</div>
                                                        <div className="flex items-center gap-2 text-xs text-gray-400 font-mono mt-0.5">
                                                            <span>ID: {s.studId}</span>
                                                            {s.mobile && (
                                                                <span className="text-gray-500 font-sans flex items-center gap-0.5">
                                                                    <Phone size={10} /> {s.mobile}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Branch */}
                                            <td className="px-4 py-3.5">
                                                <span
                                                    className="text-xs font-bold px-2.5 py-1 rounded-full border shadow-2xs inline-block"
                                                    style={{
                                                        background: palette.bg,
                                                        color: palette.text,
                                                        borderColor: palette.border
                                                    }}
                                                >
                                                    {s.branch}
                                                </span>
                                            </td>

                                            {/* Course & Batch */}
                                            <td className="px-4 py-3.5">
                                                <div className="font-bold text-gray-800 text-xs">{s.course || '--'}</div>
                                                <div className="text-[11px] text-gray-400 mt-0.5">
                                                    {s.batch || 'Regular'}
                                                </div>
                                            </td>

                                            {/* Total Course Fee */}
                                            <td className="px-4 py-3.5 text-right font-medium text-gray-700">
                                                ₹{s.totalFee.toLocaleString('en-IN')}
                                            </td>

                                            {/* Paid Fee */}
                                            <td className="px-4 py-3.5 text-right">
                                                <div className="font-bold text-emerald-700">
                                                    ₹{s.totalPaid.toLocaleString('en-IN')}
                                                </div>
                                                <div className="text-[10px] text-gray-400">
                                                    {s.paymentCount} {s.paymentCount === 1 ? 'payment' : 'payments'}
                                                </div>
                                            </td>

                                            {/* Pending Balance */}
                                            <td className="px-4 py-3.5 text-right">
                                                <div className={`inline-block px-2.5 py-1 rounded-lg font-black text-sm ${
                                                    s.pendingAmount > 0
                                                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                                        : 'bg-emerald-50 text-emerald-700'
                                                }`}>
                                                    ₹{s.pendingAmount.toLocaleString('en-IN')}
                                                </div>
                                            </td>

                                            {/* Due Date */}
                                            <td className="px-4 py-3.5 text-center">
                                                {s.dueDate ? (
                                                    <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                                                        ðŸ“… {s.dueDate}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-300">â€”</span>
                                                )}
                                            </td>

                                            {/* Recovery Status */}
                                            <td className="px-4 py-3.5">
                                                <div className="flex flex-col items-center gap-1">
                                                    <Badge
                                                        text={s.paymentStatus}
                                                        variant={
                                                            s.paymentStatus === 'Paid' ? 'green' :
                                                            s.paymentStatus === 'Partial' ? 'yellow' : 'red'
                                                        }
                                                    />
                                                    <div className="w-16 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full"
                                                            style={{
                                                                width: `${s.percentPaid}%`,
                                                                background: s.percentPaid === 100 ? '#10b981' : s.percentPaid > 0 ? '#f59e0b' : '#ef4444'
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] text-gray-400 font-semibold">
                                                        {s.percentPaid}% paid
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Action Buttons */}
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    {/* Quick Collect Button */}
                                                    {s.pendingAmount > 0 ? (
                                                        <button
                                                            onClick={() => openQuickCollect(s)}
                                                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all cursor-pointer"
                                                            title="Collect fee directly"
                                                        >
                                                            <CreditCard size={13} />
                                                            Collect
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => openQuickCollect(s)}
                                                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all cursor-pointer"
                                                            title="Add additional payment"
                                                        >
                                                            <CreditCard size={13} />
                                                            Pay
                                                        </button>
                                                    )}

                                                    {/* WhatsApp Reminder Button */}
                                                    {s.pendingAmount > 0 && s.mobile && (
                                                        <button
                                                            onClick={() => handleSendWhatsApp(s)}
                                                            className="p-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-2xs cursor-pointer"
                                                            title="Send WhatsApp Fee Reminder"
                                                        >
                                                            <Send size={14} />
                                                        </button>
                                                    )}

                                                    {/* Payment History Button */}
                                                    <button
                                                        onClick={() => setHistoryModal(s)}
                                                        className="p-1.5 rounded-lg text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors shadow-2xs cursor-pointer"
                                                        title="View Payment History"
                                                    >
                                                        <History size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={9} className="p-8 text-center text-gray-400">
                                        <div className="text-4xl mb-2">🎉</div>
                                        <div className="font-bold text-gray-700 text-base">No pending fee records found!</div>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {selectedBranch !== 'All' ? `All students in ${selectedBranch} have cleared their fees, or no students match the selected filters.` : 'All students across all branches have cleared their fees, or no records match your filter.'}
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Quick Fee Collection Modal */}
            <Modal
                isOpen={!!quickCollectModal}
                onClose={() => setQuickCollectModal(null)}
                title="Collect Pending Fee"
                width="w-[520px]"
            >
                {quickCollectModal && (
                    <div className="space-y-4 pt-1">
                        {/* Student Snapshot Card */}
                        <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 flex items-center justify-between">
                            <div>
                                <div className="font-bold text-gray-900 text-base">{quickCollectModal.name}</div>
                                <div className="text-xs text-indigo-700 font-medium mt-0.5">
                                    ID: {quickCollectModal.studId} • {quickCollectModal.course}
                                </div>
                                <div className="text-[11px] text-gray-500 mt-0.5">
                                    Branch: <strong className="text-gray-800">{quickCollectModal.branch}</strong>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block">
                                    Remaining Due
                                </span>
                                <span className="text-xl font-black text-rose-700">
                                    ₹{quickCollectModal.pendingAmount.toLocaleString('en-IN')}
                                </span>
                            </div>
                        </div>

                        {/* Amount & Mode */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                                    Amount to Collect (₹) *
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-gray-400 font-bold">₹</span>
                                    <input
                                        type="number"
                                        className="inp pl-7 text-base font-bold text-gray-900 mb-0!"
                                        placeholder="Enter amount"
                                        value={collectForm.amount}
                                        onChange={(e) => setCollectForm(p => ({ ...p, amount: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                                    Payment Mode *
                                </label>
                                <select
                                    className="inp mb-0! cursor-pointer text-sm font-semibold"
                                    value={collectForm.mode}
                                    onChange={(e) => setCollectForm(p => ({ ...p, mode: e.target.value }))}
                                >
                                    <option value="Cash">Cash</option>
                                    <option value="UPI">UPI / QR</option>
                                    <option value="Bank Transfer">Bank Transfer / NEFT</option>
                                    <option value="Cheque">Cheque</option>
                                    <option value="Card">Debit / Credit Card</option>
                                </select>
                            </div>
                        </div>

                        {/* Collector & Remarks */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                                    Fee Collector
                                </label>
                                <select
                                    className="inp mb-0! cursor-pointer text-sm"
                                    value={collectForm.collector}
                                    onChange={(e) => setCollectForm(p => ({ ...p, collector: e.target.value }))}
                                >
                                    <option value="">Select Collector</option>
                                    {(dropdowns.employees || []).map((emp) => (
                                        <option key={emp} value={emp}>{emp}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="mb-3">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                                    Next Fee Due Date *
                                </label>
                                <input
                                    type="date"
                                    className="inp mb-0! text-sm font-semibold"
                                    value={collectForm.dueDate || ''}
                                    onChange={(e) => setCollectForm(p => ({ ...p, dueDate: e.target.value }))}
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                                    Remarks / Note
                                </label>
                                <input
                                    type="text"
                                    className="inp mb-0! text-sm"
                                    placeholder="Optional note"
                                    value={collectForm.remarks}
                                    onChange={(e) => setCollectForm(p => ({ ...p, remarks: e.target.value }))}
                                />
                            </div>
                        </div>

                        {/* Quick Presets */}
                        <div className="flex items-center gap-2 pt-1">
                            <span className="text-xs text-gray-400 font-semibold">Quick Fill:</span>
                            <button
                                type="button"
                                onClick={() => setCollectForm(p => ({ ...p, amount: String(quickCollectModal.pendingAmount) }))}
                                className="text-xs px-2.5 py-1 rounded bg-rose-50 text-rose-700 font-bold border border-rose-200 hover:bg-rose-100 cursor-pointer"
                            >
                                Full Due (₹{quickCollectModal.pendingAmount.toLocaleString('en-IN')})
                            </button>
                            {quickCollectModal.pendingAmount > 2000 && (
                                <button
                                    type="button"
                                    onClick={() => setCollectForm(p => ({ ...p, amount: String(Math.round(quickCollectModal.pendingAmount / 2)) }))}
                                    className="text-xs px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 hover:bg-indigo-100 cursor-pointer"
                                >
                                    50% Due (₹{Math.round(quickCollectModal.pendingAmount / 2).toLocaleString('en-IN')})
                                </button>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                            <button
                                className="px-4 py-2 rounded-xl text-gray-500 font-bold hover:bg-gray-100 transition-colors text-sm cursor-pointer"
                                onClick={() => setQuickCollectModal(null)}
                                disabled={collecting}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn px-6 py-2 rounded-xl text-sm font-bold shadow-md cursor-pointer"
                                onClick={handleQuickCollectSave}
                                disabled={collecting}
                            >
                                {collecting ? 'Recording Payment...' : 'Confirm & Collect Fee'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Payment History Modal */}
            <Modal
                isOpen={!!historyModal}
                onClose={() => setHistoryModal(null)}
                title="Student Fee Payment History"
                width="w-[600px]"
            >
                {historyModal && (
                    <div className="space-y-4 pt-1">
                        <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-gray-900">{historyModal.name}</h3>
                                <p className="text-xs text-gray-500">ID: {historyModal.studId} • {historyModal.course}</p>
                                <p className="text-xs text-indigo-600 font-medium">Branch: {historyModal.branch}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-500">Course Fee: <strong>₹{historyModal.totalFee.toLocaleString('en-IN')}</strong></p>
                                <p className="text-xs text-emerald-600 font-bold">Total Paid: ₹{historyModal.totalPaid.toLocaleString('en-IN')}</p>
                                <p className="text-xs text-rose-600 font-bold">Pending Due: ₹{historyModal.pendingAmount.toLocaleString('en-IN')}</p>
                            </div>
                        </div>

                        <div className="max-h-[300px] overflow-y-auto border rounded-xl">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-gray-100 text-gray-600 font-bold uppercase tracking-wider">
                                    <tr>
                                        <th className="p-2.5">Receipt No</th>
                                        <th className="p-2.5">Date</th>
                                        <th className="p-2.5">Mode</th>
                                        <th className="p-2.5">Collector</th>
                                        <th className="p-2.5 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {historyModal.payments && historyModal.payments.length > 0 ? (
                                        historyModal.payments.map((p, pidx) => (
                                            <tr key={pidx} className="hover:bg-gray-50">
                                                <td className="p-2.5 font-mono font-semibold text-gray-700">{p.recNo || '--'}</td>
                                                <td className="p-2.5 text-gray-600">{p.date || '--'}</td>
                                                <td className="p-2.5 font-medium">{p.mode || 'Cash'}</td>
                                                <td className="p-2.5 text-gray-500">{p.collector || '--'}</td>
                                                <td className="p-2.5 text-right font-bold text-emerald-700">
                                                    ₹{p.amount.toLocaleString('en-IN')}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="p-4 text-center text-gray-400">
                                                No fee payments recorded yet for this student.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                className="btn px-4 py-2 text-sm cursor-pointer"
                                onClick={() => setHistoryModal(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Hidden Receipt Template for Instant Printing */}
            <div style={{ display: 'none' }}>
                {successTx && (
                    <ReceiptTemplate
                        ref={receiptRef}
                        transaction={successTx}
                        franchiseData={getFranchiseData(successTx.branch)}
                    />
                )}
            </div>
        </div>
    );
}
