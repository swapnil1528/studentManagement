/**
 * Inquiries — Admin inquiry management page.
 *
 * Sheet column mapping (0-indexed, r[0]=rowIndex):
 *  r[0]  = Row Index (internal)
 *  r[1]  = Inquiry ID
 *  r[2]  = Date
 *  r[3]  = Name
 *  r[4]  = Mobile
 *  r[5]  = Village
 *  r[6]  = Course
 *  r[7]  = Status
 *  r[8]  = Branch
 *  r[9]  = Education
 *  r[10] = Gender
 *  r[11] = Medium
 *  r[12] = Board
 *  r[13] = Stream
 *  r[14] = Remark
 *  r[15] = Parent Mobile
 *  r[16] = Batch Timing
 */

import { useState, useMemo } from 'react';
import { Edit, Trash2, FileSpreadsheet, FileText } from 'lucide-react';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { saveInquiry, updateInquiry, deleteInquiry, registerStudent } from '../../services/api';
import { showToast } from '../../components/ui/Toast';
import { exportCsv, exportPdf } from '../../utils/exportUtils';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const getStatusVariant = (s) => {
    if (s === 'Confirmed') return 'green';
    if (s === 'Cancelled') return 'red';
    if (s === 'Postponed') return 'yellow';
    return 'blue';
};

const blankForm = (branch) => ({
    name: '', mobile: '', parentMobile: '',
    branch: branch || '',
    course: '', batch: '', village: '',
    edu: '', gender: 'Male', medium: 'English', board: 'State',
    stream: 'Arts', remark: '', status: 'New'
});

export default function Inquiries({ adminData, user, onReload }) {
    const isAdmin = user?.role === 'admin';
    const userBranch = user?.branch || '';
    // Auto-fill branch if user has a specific branch (not 'All')
    const fixedBranch = (userBranch && userBranch.toLowerCase() !== 'all') ? userBranch : null;
    const showBranchCol = !fixedBranch; // Show branch column only when viewing all branches

    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState(blankForm(fixedBranch));
    const [showRegModal, setShowRegModal] = useState(false);
    const [regSaving, setRegSaving] = useState(false);
    const [regForm, setRegForm] = useState({ inquiryId: '', aadhar: '', dob: '', photo: '' });
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // Filters
    const [filterMonth, setFilterMonth] = useState('');
    const [filterYear, setFilterYear] = useState('');
    const [filterBranch, setFilterBranch] = useState('');

    const inquiries = adminData?.inquiries || [];
    const dropdowns = adminData?.dropdowns || {};

    const handleChange = (field, val) => setForm(p => ({ ...p, [field]: val }));

    // Build year list from data
    const years = useMemo(() => {
        const yearSet = new Set();
        inquiries.forEach(r => {
            const d = r[2]; // Date column
            if (d) { const yr = String(d).split('-')[0] || String(d).split('/')[2]; if (yr && yr.length === 4) yearSet.add(yr); }
        });
        return [...yearSet].sort((a, b) => b - a);
    }, [inquiries]);

    // Filtered data
    const filtered = useMemo(() => {
        return inquiries.filter(r => {
            if (filterBranch && r[8] !== filterBranch) return false;
            if (filterMonth || filterYear) {
                const d = String(r[2] || '');
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
    }, [inquiries, filterBranch, filterMonth, filterYear]);

    const COLUMNS = [
        { key: 'sr', label: '#' },
        { key: 'name', label: 'Name' },
        { key: 'mobile', label: 'Mobile' },
        ...(showBranchCol ? [{ key: 'branch', label: 'Branch' }] : []),
        { key: 'village', label: 'Village' },
        { key: 'course', label: 'Course' },
        { key: 'status', label: 'Status' },
        { key: 'action', label: 'Actions' },
    ];

    // ── Open New ──────────────────────────────────────────────
    const openNew = () => { setEditId(null); setForm(blankForm(fixedBranch)); setShowModal(true); };

    // ── Open Edit ─────────────────────────────────────────────
    const openEdit = (r) => {
        setEditId(r[0]);
        setForm({
            name: r[3] || '',
            mobile: r[4] || '',
            village: r[5] || '',
            course: r[6] || '',
            status: r[7] || 'New',
            branch: fixedBranch || r[8] || '',
            edu: r[9] || '',
            gender: r[10] || 'Male',
            medium: r[11] || 'English',
            board: r[12] || 'State',
            stream: r[13] || 'Arts',
            remark: r[14] || '',
            parentMobile: r[15] || '',
            batch: r[16] || '',
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
            alert(result?.error || 'Save failed — ensure saveInq/updateInq in Code.gs handles parentMobile + batch fields');
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
        const headers = ['#', 'Name', 'Mobile', 'Parent Mobile', ...(showBranchCol ? ['Branch'] : []), 'Village', 'Course', 'Batch', 'Status', 'Education', 'Gender', 'Date'];
        const rows = filtered.map((r, i) => [
            i + 1, r[3], r[4], r[15], ...(showBranchCol ? [r[8]] : []),
            r[5], r[6], r[16], r[7], r[9], r[10], r[2]
        ]);
        exportCsv('Inquiries_' + new Date().toISOString().slice(0, 10), headers, rows);
    };

    const doExportPdf = () => {
        const headers = ['#', 'Name', 'Mobile', ...(showBranchCol ? ['Branch'] : []), 'Village', 'Course', 'Status', 'Date'];
        const rows = filtered.map((r, i) => [
            i + 1, r[3], r[4], ...(showBranchCol ? [r[8]] : []),
            r[5], r[6], r[7], r[2]
        ]);
        exportPdf('Inquiries Report', headers, rows);
    };

    return (
        <div>
            {/* Header */}
            <div className="flex justify-between mb-4 flex-wrap gap-2">
                <h1 className="text-2xl font-bold">Inquiries</h1>
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

            {/* Filters — only show for all-branch users */}
            {showBranchCol && (
                <div className="card mb-4 flex gap-3 flex-wrap items-center p-3">
                    <span className="text-xs font-bold opacity-50">Filter:</span>
                    <select className="inp" style={{ width: 170, marginBottom: 0 }} value={filterBranch} onChange={e => setFilterBranch(e.target.value)}>
                        <option value="">All Branches</option>
                        {(dropdowns.branches || []).map(b => <option key={b}>{b}</option>)}
                    </select>
                    <select className="inp" style={{ width: 110, marginBottom: 0 }} value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
                        <option value="">All Months</option>
                        {MONTHS.map(m => <option key={m}>{m}</option>)}
                    </select>
                    <select className="inp" style={{ width: 100, marginBottom: 0 }} value={filterYear} onChange={e => setFilterYear(e.target.value)}>
                        <option value="">All Years</option>
                        {years.map(y => <option key={y}>{y}</option>)}
                    </select>
                    {(filterBranch || filterMonth || filterYear) && (
                        <button onClick={() => { setFilterBranch(''); setFilterMonth(''); setFilterYear(''); }}
                            className="text-xs text-indigo-600 underline font-semibold">Clear</button>
                    )}
                    <span className="text-xs opacity-40 ml-auto">{filtered.length} of {inquiries.length} records</span>
                </div>
            )}

            <DataTable
                columns={COLUMNS}
                data={filtered}
                renderRow={(r, i) => (
                    <tr key={i} className="t-row">
                        <td className="font-mono text-sm opacity-50">{i + 1}</td>
                        <td><div className="font-bold">{r[3]}</div><div className="text-xs opacity-50">{r[2]}</div></td>
                        <td>{r[4]}</td>
                        {showBranchCol && <td><span className="text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-600 font-semibold">{r[8]}</span></td>}
                        <td>{r[5]}</td>
                        <td>{r[6]}</td>
                        <td><Badge text={r[7] || 'New'} variant={getStatusVariant(r[7])} /></td>
                        <td>
                            <div className="flex items-center gap-2">
                                <button onClick={() => openEdit(r)} title="Edit"
                                    className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors">
                                    <Edit size={16} />
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

            {/* ── New / Edit Modal ── */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)}
                title={editId ? '✏️ Edit Inquiry' : '+ New Inquiry'} width="w-[820px]">
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
                    <div className={fixedBranch ? 'col-span-3' : 'col-span-2'}>
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
