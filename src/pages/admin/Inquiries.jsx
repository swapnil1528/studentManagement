/**
 * Inquiries — Admin inquiry management page.
 *
 * Sheet column mapping (after r[0] = rowIndex overlay):
 *  r[0]  = Row Index (overlaid, replaces Col A=ID)
 *  r[1]  = B = Date
 *  r[2]  = C = Branch
 *  r[3]  = D = Name
 *  r[4]  = E = Mobile
 *  r[5]  = F = Village
 *  r[6]  = G = Course
 *  r[7]  = H = Status
 *  r[8]  = I = Remark
 *  r[9]  = J = Education
 *  r[10] = K = Gender
 *  r[11] = L = Medium
 *  r[12] = M = Board
 *  r[13] = N = Stream
 *  r[14] = O = Reception
 *  r[15] = P = Parent Mobile
 *  r[16] = Q = Batch Timing
 *  r[17] = R = Mother Name  (new column)
 */

import { useState, useMemo, useRef } from 'react';
import { Edit, Trash2, FileSpreadsheet, FileText, Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { saveInquiry, updateInquiry, deleteInquiry, registerStudent } from '../../services/api';
import { showToast } from '../../components/ui/Toast';
import { exportCsv, exportPdf } from '../../utils/exportUtils';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const STATUS_OPTIONS = ['New', 'Follow Up', 'Postponed', 'Cancelled', 'Confirmed'];

const getStatusVariant = (s) => {
    if (s === 'Confirmed') return 'green';
    if (s === 'Cancelled') return 'red';
    if (s === 'Postponed') return 'yellow';
    if (s === 'Follow Up') return 'blue';
    return 'blue';
};

const blankForm = (branch) => ({
    name: '', mobile: '', parentMobile: '', motherName: '',
    branch: branch || '',
    course: '', batch: '', village: '',
    edu: '', gender: 'Male', medium: 'English', board: 'State',
    stream: 'Arts', remark: '', status: 'New'
});

// ── Inquiry Print Form ──────────────────────────────────────────
const InquiryPrintForm = ({ inquiry, franchiseData, ref: _ref }) => null;

export default function Inquiries({ adminData, user, onReload }) {
    const isAdmin = user?.role === 'admin';
    const userBranch = user?.branch || '';
    const fixedBranch = (userBranch && userBranch.toLowerCase() !== 'all') ? userBranch : null;
    const showBranchCol = !fixedBranch;

    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState(blankForm(fixedBranch));
    const [showRegModal, setShowRegModal] = useState(false);
    const [regSaving, setRegSaving] = useState(false);
    const [regForm, setRegForm] = useState({ inquiryId: '', aadhar: '', dob: '', photo: '' });
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // Print state
    const [printInquiry, setPrintInquiry] = useState(null);
    const printRef = useRef();

    // Filters
    const [filterMonth, setFilterMonth] = useState('');
    const [filterYear, setFilterYear] = useState('');
    const [filterBranch, setFilterBranch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    const inquiries = adminData?.inquiries || [];
    const dropdowns = adminData?.dropdowns || {};

    const handleChange = (field, val) => setForm(p => ({ ...p, [field]: val }));

    // Format date helper — handles ISO strings, Date objects, and strings
    const fmtDate = (raw) => {
        if (!raw) return '';
        if (raw instanceof Date) {
            const d = raw;
            return String(d.getDate()).padStart(2, '0') + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + d.getFullYear();
        }
        const s = String(raw);
        // ISO format: 2026-03-31T...
        if (s.includes('T') && s.length > 10) {
            const d = new Date(s);
            if (!isNaN(d)) return String(d.getDate()).padStart(2, '0') + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + d.getFullYear();
        }
        return s; // already formatted (dd-MM-yyyy format or other)
    };

    // Build year list from data
    const years = useMemo(() => {
        const yearSet = new Set();
        inquiries.forEach(r => {
            const raw = r[1]; // r[1] = Date
            const d = raw instanceof Date ? raw.toISOString() : String(raw || '');
            const yr = d.substring(0, 4);
            if (yr && yr.length === 4 && !isNaN(yr)) yearSet.add(yr);
        });
        return [...yearSet].sort((a, b) => b - a);
    }, [inquiries]);

    // Filtered data
    const filtered = useMemo(() => {
        return inquiries.filter(r => {
            if (filterBranch && r[2] !== filterBranch) return false;  // r[2] = Branch
            if (filterStatus && r[7] !== filterStatus) return false;  // r[7] = Status
            if (filterMonth || filterYear) {
                const d = String(r[1] || '');  // r[1] = Date
                if (filterYear && !d.includes(filterYear)) return false;
                if (filterMonth) {
                    const monthIdx = MONTHS.indexOf(filterMonth);
                    const padded = String(monthIdx + 1).padStart(2, '0');
                    if (!d.includes('-' + padded + '-') && !d.includes('/' + padded + '/') &&
                        !d.includes('-' + padded) && !d.startsWith(padded + '/')) return false;
                }
            }
            return true;
        });
    }, [inquiries, filterBranch, filterStatus, filterMonth, filterYear]);

    const COLUMNS = [
        { key: 'sr', label: '#' },
        { key: 'date', label: 'Date' },
        { key: 'name', label: 'Name' },
        { key: 'mobile', label: 'Mobile' },
        { key: 'parentMobile', label: 'Parent Mobile' }, // Added parent mobile
        ...(showBranchCol ? [{ key: 'branch', label: 'Branch' }] : []),
        { key: 'village', label: 'Village' },
        { key: 'course', label: 'Course' },
        { key: 'status', label: 'Status' },
        { key: 'action', label: 'Actions' },
    ];

    // ── Franchise lookup for print ────────────────────────────
    const getFranchiseData = (branch) => {
        if (!adminData?.franchises || adminData.franchises.length === 0) return null;
        const match = adminData.franchises.find(f =>
            String(f.branch).toLowerCase() === String(branch).toLowerCase()
        );
        return match || adminData.franchises[0];
    };

    // ── Print handler ──────────────────────────────────────────
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Inquiry_${printInquiry?.name || 'Form'}`,
        onAfterPrint: () => setPrintInquiry(null),
    });

    const openPrint = (r) => {
        const branch = fixedBranch || r[2];  // r[2] = Branch
        const fd = getFranchiseData(branch);
        setPrintInquiry({
            name: r[3], mobile: r[4], parentMobile: r[15], motherName: r[17] || '',
            village: r[5], course: r[6], status: r[7], remark: r[8],
            edu: r[9], gender: r[10], medium: r[11], board: r[12],
            stream: r[13], batch: r[16], date: r[1], branch,
            franchiseData: fd || { centerName: 'Institute', address: '', mobile: '' },
        });
        setTimeout(() => handlePrint(), 100);
    };

    // ── Open New ──────────────────────────────────────────────
    const openNew = () => { setEditId(null); setForm(blankForm(fixedBranch)); setShowModal(true); };

    // ── Open Edit ─────────────────────────────────────────────
    const openEdit = (r) => {
        setEditId(r[0]);
        setForm({
            name: r[3] || '',         // r[3]  = Name
            mobile: r[4] || '',       // r[4]  = Mobile
            village: r[5] || '',      // r[5]  = Village
            course: r[6] || '',       // r[6]  = Course
            status: r[7] || 'New',    // r[7]  = Status
            remark: r[8] || '',       // r[8]  = Remark
            edu: r[9] || '',          // r[9]  = Education
            gender: r[10] || 'Male',  // r[10] = Gender
            medium: r[11] || 'English', // r[11] = Medium
            board: r[12] || 'State',  // r[12] = Board
            stream: r[13] || 'Arts',  // r[13] = Stream
            parentMobile: r[15] || '', // r[15] = Parent Mobile
            batch: r[16] || '',       // r[16] = Batch Timing
            motherName: r[17] || '',  // r[17] = Mother Name
            branch: fixedBranch || r[2] || '', // r[2] = Branch
        });
        setShowModal(true);
    };

    // ── Save ──────────────────────────────────────────────────
    const handleSave = async () => {
        if (!form.name || !form.mobile) { alert('Please fill Name and Mobile'); return; }
        const payload = { ...form, branch: fixedBranch || form.branch };
        setSaving(true);
        const result = editId ? await updateInquiry(editId, payload) : await saveInquiry(payload);
        setSaving(false);
        if (result?.success) {
            showToast(editId ? 'Inquiry Updated ✅' : 'Inquiry Saved ✅');
            setShowModal(false);
            onReload?.();
        } else {
            alert(result?.error || 'Save failed');
        }
    };

    // ── Delete ────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!confirmDelete) return;
        setDeleting(true);
        const result = await deleteInquiry(confirmDelete.id);
        if (result?.success) { showToast('Inquiry Deleted 🗑️'); setConfirmDelete(null); onReload?.(); }
        else alert(result?.error || 'Delete failed');
        setDeleting(false);
    };

    // ── Register ──────────────────────────────────────────────
    const openRegModal = (id) => { setRegForm({ inquiryId: id, aadhar: '', dob: '', photo: '' }); setShowRegModal(true); };
    const handlePhotoChange = (e) => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => setRegForm(p => ({ ...p, photo: ev.target.result }));
        reader.readAsDataURL(file);
    };
    const handleRegister = async () => {
        if (!regForm.aadhar) { alert('Please enter Aadhar No'); return; }
        setRegSaving(true);
        const result = await registerStudent(regForm);
        if (result?.success) { showToast('Student Registered! 🎉'); setShowRegModal(false); onReload?.(); }
        else alert(result?.error || 'Registration failed');
        setRegSaving(false);
    };

    // ── Export ────────────────────────────────────────────────
    const doExportCsv = () => {
        const headers = ['#', 'Date', 'Name', 'Mobile', 'Parent Mobile', 'Mother Name', ...(showBranchCol ? ['Branch'] : []), 'Village', 'Course', 'Batch', 'Status', 'Education', 'Gender', 'Remark'];
        const rows = filtered.map((r, i) => [
            i + 1, r[1], r[3], r[4], r[15], r[17] || '', ...(showBranchCol ? [r[2]] : []),
            r[5], r[6], r[16], r[7], r[9], r[10], r[8]
        ]);
        exportCsv('Inquiries_' + new Date().toISOString().slice(0, 10), headers, rows);
    };

    const doExportPdf = () => {
        const headers = ['#', 'Date', 'Name', 'Mobile', ...(showBranchCol ? ['Branch'] : []), 'Village', 'Course', 'Status'];
        const rows = filtered.map((r, i) => [
            i + 1, r[1], r[3], r[4], ...(showBranchCol ? [r[2]] : []),
            r[5], r[6], r[7]
        ]);
        exportPdf('Inquiries Report', headers, rows);
    };

    const hasFilters = filterBranch || filterMonth || filterYear || filterStatus;
    const clearFilters = () => { setFilterBranch(''); setFilterMonth(''); setFilterYear(''); setFilterStatus(''); };

    return (
        <div>
            {/* Header */}
            <div className="flex justify-between mb-4 flex-wrap gap-2">
                <h1 className="text-2xl font-bold">Inquiry</h1>
                <div className="flex gap-2 flex-wrap items-center">
                    <button className="btn" onClick={openNew}>+ New Inquiry</button>
                    <button onClick={doExportCsv} title="Export Excel/CSV"
                        className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold border border-green-300 text-green-700 bg-green-50 hover:bg-green-100">
                        <FileSpreadsheet size={16} /> Excel
                    </button>
                    <button onClick={doExportPdf} title="Export PDF"
                        className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold border border-red-300 text-red-600 bg-red-50 hover:bg-red-100">
                        <FileText size={16} /> PDF
                    </button>
                </div>
            </div>

            {/* Filters — always visible */}
            <div className="card mb-4 flex gap-3 flex-wrap items-center p-3">
                <span className="text-xs font-bold opacity-50">Filter:</span>
                {showBranchCol && (
                    <select className="inp" style={{ width: 160, marginBottom: 0 }} value={filterBranch} onChange={e => setFilterBranch(e.target.value)}>
                        <option value="">All Branches</option>
                        {(dropdowns.branches || []).map(b => <option key={b}>{b}</option>)}
                    </select>
                )}
                <select className="inp" style={{ width: 130, marginBottom: 0 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="">All Status</option>
                    {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
                <select className="inp" style={{ width: 110, marginBottom: 0 }} value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
                    <option value="">All Months</option>
                    {MONTHS.map(m => <option key={m}>{m}</option>)}
                </select>
                <select className="inp" style={{ width: 100, marginBottom: 0 }} value={filterYear} onChange={e => setFilterYear(e.target.value)}>
                    <option value="">All Years</option>
                    {years.map(y => <option key={y}>{y}</option>)}
                </select>
                {hasFilters && (
                    <button onClick={clearFilters} className="text-xs text-indigo-600 underline font-semibold">Clear</button>
                )}
                <span className="text-xs opacity-40 ml-auto">{filtered.length} of {inquiries.length} records</span>
            </div>

            <DataTable
                columns={COLUMNS}
                data={filtered}
                renderRow={(r, i) => (
                    <tr key={i} className="t-row">
                        <td className="font-mono text-sm opacity-50">{i + 1}</td>
                        <td className="text-xs opacity-60 whitespace-nowrap">{fmtDate(r[1])}</td>
                        <td><div className="font-bold">{r[3]}</div></td>
                        <td>{r[4]}</td>
                        <td>{r[15] || '—'}</td>
                        {showBranchCol && <td><span className="text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-600 font-semibold">{r[2]}</span></td>}
                        <td>{r[5]}</td>
                        <td>{r[6]}</td>
                        <td><Badge text={r[7] || 'New'} variant={getStatusVariant(r[7])} /></td>
                        <td>
                            <div className="flex items-center gap-2">
                                <button onClick={() => openEdit(r)} title="Edit"
                                    className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors">
                                    <Edit size={16} />
                                </button>
                                <button onClick={() => openPrint(r)} title="Print Inquiry Form"
                                    className="p-1.5 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors">
                                    <Printer size={16} />
                                </button>
                                {isAdmin && (
                                    <button onClick={() => setConfirmDelete({ id: r[0], name: r[3] })} title="Delete"
                                        className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                )}
                                {r[7] !== 'Confirmed' && (
                                    <button onClick={() => openRegModal(r[0])} className="btn py-1 px-3 text-xs">Register</button>
                                )}
                            </div>
                        </td>
                    </tr>
                )}
            />

            {/* Hidden print template */}
            <div style={{ display: 'none' }}>
                {printInquiry && (
                    <div ref={printRef} style={{ fontFamily: 'Arial, sans-serif', padding: 32, maxWidth: 800, margin: '0 auto', color: '#111' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #4f46e5', paddingBottom: 12, marginBottom: 20 }}>
                            <div>
                                <h1 style={{ fontSize: 22, fontWeight: 900, color: '#3730a3', margin: 0 }}>{printInquiry.franchiseData.centerName}</h1>
                                <p style={{ fontSize: 12, color: '#555', margin: '4px 0 0' }}>{printInquiry.franchiseData.address}</p>
                                {printInquiry.franchiseData.mobile && <p style={{ fontSize: 12, color: '#555', margin: '2px 0 0' }}>📞 {printInquiry.franchiseData.mobile}</p>}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#6366f1', margin: 0 }}>INQUIRY FORM</h2>
                                <p style={{ fontSize: 12, color: '#777', margin: '4px 0 0' }}>Date: {printInquiry.date}</p>
                            </div>
                        </div>
                        {/* Student Details */}
                        <h3 style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Student Details</h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
                            <tbody>
                                {[
                                    ['Student Name', printInquiry.name], ['Mobile', printInquiry.mobile],
                                    ['Parent Mobile', printInquiry.parentMobile], ['Mother Name', printInquiry.motherName],
                                    ['Village', printInquiry.village], ['Gender', printInquiry.gender],
                                    ['Education', printInquiry.edu], ['Board', printInquiry.board],
                                    ['Stream', printInquiry.stream], ['Medium', printInquiry.medium],
                                ].map(([label, val]) => (
                                    <tr key={label}>
                                        <td style={{ padding: '5px 8px', fontWeight: 600, fontSize: 12, color: '#374151', width: '35%', background: '#f8f9ff', border: '1px solid #e5e7eb' }}>{label}</td>
                                        <td style={{ padding: '5px 8px', fontSize: 12, border: '1px solid #e5e7eb' }}>{val || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <h3 style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Course Details</h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
                            <tbody>
                                {[
                                    ['Branch', printInquiry.branch], ['Course', printInquiry.course],
                                    ['Batch Timing', printInquiry.batch], ['Status', printInquiry.status],
                                    ['Remarks', printInquiry.remark],
                                ].map(([label, val]) => (
                                    <tr key={label}>
                                        <td style={{ padding: '5px 8px', fontWeight: 600, fontSize: 12, color: '#374151', width: '35%', background: '#f8f9ff', border: '1px solid #e5e7eb' }}>{label}</td>
                                        <td style={{ padding: '5px 8px', fontSize: 12, border: '1px solid #e5e7eb' }}>{val || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 48 }}>
                            <div style={{ textAlign: 'center', width: 180 }}>
                                <div style={{ borderTop: '1px solid #999', paddingTop: 6, fontSize: 11, color: '#555', fontWeight: 600 }}>Student Signature</div>
                            </div>
                            <div style={{ textAlign: 'center', width: 180 }}>
                                <div style={{ borderTop: '1px solid #999', paddingTop: 6, fontSize: 11, color: '#555', fontWeight: 600 }}>Authorized Signatory</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── New / Edit Modal ── */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)}
                title={editId ? '✏️ Edit Inquiry' : '+ New Inquiry'} width="w-[860px]">
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="text-xs font-bold opacity-50 mb-1 block">Student Name *</label>
                        <input className="inp" placeholder="Student Name" value={form.name} onChange={e => handleChange('name', e.target.value)} />
                    </div>
                    <div>
                        <label className="text-xs font-bold opacity-50 mb-1 block">Mobile *</label>
                        <input className="inp" placeholder="Mobile" value={form.mobile} onChange={e => handleChange('mobile', e.target.value)} />
                    </div>
                    <div>
                        <label className="text-xs font-bold opacity-50 mb-1 block">Parent Mobile</label>
                        <input className="inp" placeholder="Parent Mobile" value={form.parentMobile} onChange={e => handleChange('parentMobile', e.target.value)} />
                    </div>
                    <div>
                        <label className="text-xs font-bold opacity-50 mb-1 block">Mother Name</label>
                        <input className="inp" placeholder="Mother Name" value={form.motherName || ''} onChange={e => handleChange('motherName', e.target.value)} />
                    </div>

                    {/* Branch — admin with all-access only */}
                    {!fixedBranch && (
                        <div>
                            <label className="text-xs font-bold opacity-50 mb-1 block">Branch</label>
                            <select className="inp" value={form.branch} onChange={e => handleChange('branch', e.target.value)}>
                                <option value="">Select Branch</option>
                                {(dropdowns.branches || []).map(b => <option key={b}>{b}</option>)}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="text-xs font-bold opacity-50 mb-1 block">Village</label>
                        <select className="inp" value={form.village} onChange={e => handleChange('village', e.target.value)}>
                            <option value="">Select Village</option>
                            {(dropdowns.villages || []).map(v => <option key={v}>{v}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold opacity-50 mb-1 block">Course</label>
                        <select className="inp" value={form.course} onChange={e => handleChange('course', e.target.value)}>
                            <option value="">Select Course</option>
                            {(dropdowns.courses || []).map(c => <option key={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold opacity-50 mb-1 block">Batch Timing</label>
                        <select className="inp" value={form.batch} onChange={e => handleChange('batch', e.target.value)}>
                            <option value="">Select Batch</option>
                            {(dropdowns.batches || ['08-10 AM', '10-12 PM', '04-06 PM']).map(b => <option key={b}>{b}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-bold opacity-50 mb-1 block">Education</label>
                        <select className="inp" value={form.edu} onChange={e => handleChange('edu', e.target.value)}>
                            <option value="">Select Education</option>
                            {(dropdowns.education || []).map(e => <option key={e}>{e}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold opacity-50 mb-1 block">Gender</label>
                        <select className="inp" value={form.gender} onChange={e => handleChange('gender', e.target.value)}>
                            <option>Male</option><option>Female</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold opacity-50 mb-1 block">Medium</label>
                        <select className="inp" value={form.medium} onChange={e => handleChange('medium', e.target.value)}>
                            <option>English</option><option>Marathi</option><option>Hindi</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold opacity-50 mb-1 block">Board</label>
                        <select className="inp" value={form.board} onChange={e => handleChange('board', e.target.value)}>
                            <option>State</option><option>CBSE</option><option>ICSE</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold opacity-50 mb-1 block">Stream</label>
                        <select className="inp" value={form.stream} onChange={e => handleChange('stream', e.target.value)}>
                            <option>Arts</option><option>Commerce</option><option>Science</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold opacity-50 mb-1 block">Status</label>
                        <select className="inp" value={form.status} onChange={e => handleChange('status', e.target.value)}>
                            <option>New</option><option>Follow Up</option>
                            <option>Postponed</option><option>Cancelled</option><option>Confirmed</option>
                        </select>
                    </div>
                    <div className="col-span-3">
                        <label className="text-xs font-bold opacity-50 mb-1 block">Remarks</label>
                        <textarea className="inp" placeholder="Remarks" value={form.remark} onChange={e => handleChange('remark', e.target.value)} />
                    </div>

                    {fixedBranch && (
                        <div className="col-span-3">
                            <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg"
                                style={{ background: 'rgba(99,102,241,0.06)', color: '#6366f1' }}>
                                🏢 Branch: <strong>{fixedBranch}</strong> (auto-filled)
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex justify-end gap-2 mt-4">
                    <button className="px-4 py-2 rounded text-gray-500 font-bold hover:bg-gray-100" onClick={() => setShowModal(false)}>Cancel</button>
                    <button className="btn" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editId ? 'Update' : 'Save'}</button>
                </div>
            </Modal>

            {/* ── Register Modal ── */}
            <Modal isOpen={showRegModal} onClose={() => setShowRegModal(false)} title="Register Student">
                <label className="text-xs font-bold opacity-50 mb-1 block">Aadhar No</label>
                <input className="inp" placeholder="Aadhar No" value={regForm.aadhar}
                    onChange={e => setRegForm(p => ({ ...p, aadhar: e.target.value }))} />
                <label className="text-xs font-bold opacity-50 mb-1 block">Date of Birth</label>
                <input className="inp" type="date" value={regForm.dob}
                    onChange={e => setRegForm(p => ({ ...p, dob: e.target.value }))} />
                <div className="mb-4">
                    <label className="text-xs font-bold text-gray-500">Student Photo</label>
                    <input className="text-sm block mt-1 w-full" type="file" accept="image/*" onChange={handlePhotoChange} />
                </div>
                <div className="flex justify-end gap-2">
                    <button className="px-4 py-2 rounded text-gray-500 font-bold hover:bg-gray-100" onClick={() => setShowRegModal(false)}>Cancel</button>
                    <button className="btn" onClick={handleRegister} disabled={regSaving}>
                        {regSaving ? 'Registering...' : 'Confirm Registration'}
                    </button>
                </div>
            </Modal>

            {/* ── Delete Confirm ── */}
            <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Inquiry">
                <div className="text-center py-4">
                    <div className="text-5xl mb-3">🗑️</div>
                    <p className="font-bold text-lg">Delete inquiry for <span style={{ color: '#7c3aed' }}>{confirmDelete?.name}</span>?</p>
                    <p className="text-sm text-gray-400 mt-1">This action cannot be undone.</p>
                </div>
                <div className="flex gap-3 justify-center">
                    <button className="px-5 py-2 rounded-xl text-gray-500 font-bold hover:bg-gray-100 border" onClick={() => setConfirmDelete(null)}>Cancel</button>
                    <button disabled={deleting} onClick={handleDelete}
                        style={{ padding: '8px 24px', borderRadius: 12, background: '#e11d48', color: 'white', fontWeight: 800, cursor: 'pointer', border: 'none' }}>
                        {deleting ? 'Deleting...' : 'Yes, Delete'}
                    </button>
                </div>
            </Modal>
        </div>
    );
}
