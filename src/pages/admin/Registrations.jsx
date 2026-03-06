/**
 * Registrations — Admin student registration list.
 *
 * Registration Data sheet column mapping (r[0]=rowIndex):
 *  r[1]=SrNo  r[2]=InqNo  r[3]=StudId  r[4]=DateOfReg  r[5]=Status
 *  r[6]=Name  r[7]=Mobile  r[8]=Village  r[9]=Branch  r[10]=Course
 *  r[11]=AadharNo  r[12]=Photo
 */

import { useState, useEffect, useMemo } from 'react';
import { Edit, Trash2, FileSpreadsheet, FileText } from 'lucide-react';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import { saveCourseAdmission, getCourseFees, updateRegistration, deleteRegistration } from '../../services/api';
import { showToast } from '../../components/ui/Toast';
import { exportCsv, exportPdf } from '../../utils/exportUtils';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Registrations({ adminData, user, onReload }) {
    const userBranch = user?.branch || '';
    const isAdmin = user?.role === 'admin';
    const showBranchCol = !(userBranch && userBranch.toLowerCase() !== 'all');

    const COLUMNS = [
        { key: 'sr', label: '#' },
        { key: 'photo', label: 'Photo' },
        { key: 'id', label: 'Student ID' },
        { key: 'name', label: 'Name' },
        ...(showBranchCol ? [{ key: 'branch', label: 'Branch' }] : []),
        { key: 'course', label: 'Course' },
        { key: 'date', label: 'Date' },
        { key: 'action', label: 'Actions' },
    ];

    const registrations = adminData?.registrations || [];
    const dropdowns = adminData?.dropdowns || {};
    const admissions = adminData?.admissions || [];

    // Filters
    const [filterBranch, setFilterBranch] = useState('');
    const [filterMonth, setFilterMonth] = useState('');
    const [filterYear, setFilterYear] = useState('');

    const years = useMemo(() => {
        const s = new Set();
        registrations.forEach(r => {
            const d = String(r[4] || '');
            const yr = d.split('-')[0] || d.split('/')[2];
            if (yr && yr.length === 4) s.add(yr);
        });
        return [...s].sort((a, b) => b - a);
    }, [registrations]);

    const filtered = useMemo(() => registrations.filter(r => {
        if (filterBranch && r[9] !== filterBranch) return false;
        if (filterMonth || filterYear) {
            const d = String(r[4] || '');
            if (filterYear && !d.includes(filterYear)) return false;
            if (filterMonth) {
                const mi = MONTHS.indexOf(filterMonth);
                const p = String(mi + 1).padStart(2, '0');
                if (!d.includes('-' + p + '-') && !d.includes('/' + p + '/') && !d.includes('-' + p)) return false;
            }
        }
        return true;
    }), [registrations, filterBranch, filterMonth, filterYear]);

    const [courseMasterData, setCourseMasterData] = useState([]);
    const [batchData, setBatchData] = useState([]);

    useEffect(() => {
        if (dropdowns.courseMaster?.length > 0) setCourseMasterData(dropdowns.courseMaster);
        if (dropdowns.batches?.length > 0) setBatchData(dropdowns.batches);
        getCourseFees().then(result => {
            if (result?.success) {
                if (result.courses?.length > 0) setCourseMasterData(result.courses);
                if (result.batches?.length > 0) setBatchData(result.batches);
            }
        }).catch(() => { });
    }, [dropdowns.courseMaster, dropdowns.batches]);

    // ── Admission modal ──
    const [showAdmitModal, setShowAdmitModal] = useState(false);
    const [admitSaving, setAdmitSaving] = useState(false);
    const [admitForm, setAdmitForm] = useState({
        admStudId: '', name: '', admCourse: '', admFees: '', discount: 0, finalFees: '', admBatchTime: ''
    });

    // ── Edit modal ──
    const [showEditModal, setShowEditModal] = useState(false);
    const [editSaving, setEditSaving] = useState(false);
    const [editId, setEditId] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', mobile: '', aadhar: '', dob: '', course: '', branch: '' });

    // ── Confirm delete ──
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const currentYear = new Date().getFullYear();

    const studentExistingCourses = useMemo(() => {
        if (!admitForm.admStudId) return [];
        return admissions
            .filter(r => String(r[3]) === String(admitForm.admStudId) || String(r[2]) === String(admitForm.admStudId))
            .map(r => String(r[10] || r[7]).toLowerCase());
    }, [admitForm.admStudId, admissions]);

    const availableCourses = useMemo(() => {
        let courseList = courseMasterData.length > 0
            ? courseMasterData
            : (dropdowns.courses || []).map(c => ({ course: c, validity: '', fees: {} }));
        return courseList.filter(cm => !studentExistingCourses.includes(cm.course.toLowerCase()));
    }, [courseMasterData, dropdowns.courses, studentExistingCourses]);

    const openAdmitModal = (studentId, studentName) => {
        setAdmitForm({
            admStudId: studentId, name: studentName,
            admCourse: '', admFees: '', discount: 0, finalFees: '',
            admBatchTime: batchData.length > 0 ? batchData[0] : '08-10 AM'
        });
        setShowAdmitModal(true);
    };

    const handleCourseChange = (courseName) => {
        const cm = courseMasterData.find(c => c.course === courseName);
        let fee = '';
        if (cm?.fees) {
            fee = cm.fees[String(currentYear)] || cm.fees[currentYear] || '';
            if (!fee) {
                const keys = Object.keys(cm.fees).sort((a, b) => Number(b) - Number(a));
                for (const k of keys) { if (cm.fees[k]) { fee = cm.fees[k]; break; } }
            }
        }
        const disc = admitForm.discount || 0;
        const numFee = Number(fee) || 0;
        setAdmitForm(p => ({
            ...p, admCourse: courseName,
            admFees: numFee > 0 ? String(numFee) : '',
            finalFees: numFee > 0 ? String(Math.max(0, numFee - Number(disc))) : ''
        }));
    };

    const handleDiscountChange = (discountVal) => {
        const disc = Number(discountVal) || 0;
        const base = Number(admitForm.admFees) || 0;
        setAdmitForm(p => ({ ...p, discount: disc, finalFees: String(Math.max(0, base - disc)) }));
    };

    const handleAdmit = async () => {
        if (!admitForm.admCourse) { alert('Please select a course'); return; }
        setAdmitSaving(true);
        const result = await saveCourseAdmission(admitForm);
        if (result?.success) { showToast('Student Admitted! 🎓'); setShowAdmitModal(false); onReload?.(); }
        else alert(result?.error || 'Admission failed');
        setAdmitSaving(false);
    };

    // Edit
    const openEdit = (r) => {
        setEditId(r[3]);   // StudId at r[3]
        setEditForm({
            name: r[6] || '',
            mobile: r[7] || '',
            aadhar: r[11] || '',
            dob: r[4] || '',
            course: r[10] || '',
            branch: r[9] || '',
        });
        setShowEditModal(true);
    };

    const handleEditSave = async () => {
        setEditSaving(true);
        const result = await updateRegistration(editId, editForm);
        if (result?.success) { showToast('Updated ✅'); setShowEditModal(false); onReload?.(); }
        else alert(result?.error || 'Update failed');
        setEditSaving(false);
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        setDeleting(true);
        const result = await deleteRegistration(confirmDelete.id);
        if (result?.success) { showToast('Deleted 🗑️'); setConfirmDelete(null); onReload?.(); }
        else alert(result?.error || 'Delete failed');
        setDeleting(false);
    };

    // Export
    const doExportCsv = () => {
        const headers = ['#', 'Student ID', 'Name', 'Mobile', ...(showBranchCol ? ['Branch'] : []), 'Village', 'Course', 'Aadhar', 'Date'];
        const rows = filtered.map((r, i) => [i + 1, r[3], r[6], r[7], ...(showBranchCol ? [r[9]] : []), r[8], r[10], r[11], r[4]]);
        exportCsv('Registrations_' + new Date().toISOString().slice(0, 10), headers, rows);
    };
    const doExportPdf = () => {
        const headers = ['#', 'Student ID', 'Name', ...(showBranchCol ? ['Branch'] : []), 'Course', 'Date'];
        const rows = filtered.map((r, i) => [i + 1, r[3], r[6], ...(showBranchCol ? [r[9]] : []), r[10], r[4]]);
        exportPdf('Registrations Report', headers, rows);
    };

    return (
        <div>
            <div className="flex justify-between mb-4 flex-wrap gap-2">
                <h1 className="text-2xl font-bold">Registrations</h1>
                <div className="flex gap-2 flex-wrap items-center">
                    <button onClick={doExportCsv}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold border border-green-300 text-green-700 bg-green-50 hover:bg-green-100">
                        <FileSpreadsheet size={16} /> Excel
                    </button>
                    <button onClick={doExportPdf}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold border border-red-300 text-red-600 bg-red-50 hover:bg-red-100">
                        <FileText size={16} /> PDF
                    </button>
                </div>
            </div>

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
                    {(filterBranch || filterMonth || filterYear) && <button onClick={() => { setFilterBranch(''); setFilterMonth(''); setFilterYear(''); }} className="text-xs text-indigo-600 underline font-semibold">Clear</button>}
                    <span className="text-xs opacity-40 ml-auto">{filtered.length} of {registrations.length}</span>
                </div>
            )}

            <DataTable
                columns={COLUMNS}
                data={filtered}
                renderRow={(r, i) => {
                    const photo = r[12] && r[12].length > 10 ? r[12] : null;
                    const img = photo
                        ? <img src={photo} className="w-8 h-8 rounded-full border object-cover transform transition-all duration-200 hover:scale-[3] hover:z-50 relative shadow-sm" alt="" style={{ transformOrigin: 'left center' }} />
                        : <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold border border-indigo-100">{String(r[6] || '--').substring(0, 2).toUpperCase()}</div>;
                    return (
                        <tr key={i} className="t-row">
                            <td className="font-mono text-sm opacity-50">{i + 1}</td>
                            <td>{img}</td>
                            <td className="font-mono text-xs">{r[3]}</td>
                            <td className="font-bold">{r[6]}</td>
                            {showBranchCol && <td><span className="text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-600 font-semibold">{r[9]}</span></td>}
                            <td>{r[10]}</td>
                            <td className="text-xs opacity-60">{r[4]}</td>
                            <td>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => openEdit(r)} title="Edit"
                                        className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors">
                                        <Edit size={16} />
                                    </button>
                                    {isAdmin && (
                                        <button onClick={() => setConfirmDelete({ id: r[3], name: r[6] })} title="Delete"
                                            className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                    <button className="btn py-1 px-3 text-xs ml-2" onClick={() => openAdmitModal(r[3], r[6])}>Admit</button>
                                </div>
                            </td>
                        </tr>
                    );
                }}
            />

            {/* ── Admission Modal ── */}
            <Modal isOpen={showAdmitModal} onClose={() => setShowAdmitModal(false)} title="Admission">
                <label className="text-xs font-bold opacity-50 mb-1 block">Student Name</label>
                <input className="inp" style={{ background: '#f3f4f6' }} value={admitForm.name} readOnly />
                <label className="text-xs font-bold opacity-50 mb-1 block">Course</label>
                <select className="inp" value={admitForm.admCourse} onChange={e => handleCourseChange(e.target.value)}>
                    <option value="">Select Course</option>
                    {availableCourses.map(cm => <option key={cm.course} value={cm.course}>{cm.course}</option>)}
                </select>
                {studentExistingCourses.length > 0 && (
                    <div className="text-xs text-amber-600 mb-2 -mt-2">⚠️ Already enrolled: {studentExistingCourses.join(', ').toUpperCase()}</div>
                )}
                <label className="text-xs font-bold opacity-50 mb-1 block">Course Fees (₹)</label>
                <input className="inp" style={{ background: '#f3f4f6' }} value={admitForm.admFees ? `₹${admitForm.admFees}` : ''} readOnly placeholder="Select a course to see fees" />
                <label className="text-xs font-bold opacity-50 mb-1 block">Discount (₹)</label>
                <input className="inp" type="number" placeholder="Enter discount amount" value={admitForm.discount || ''} onChange={e => handleDiscountChange(e.target.value)} />
                {admitForm.admFees && (
                    <div className="mb-3 p-3 rounded-lg" style={{ background: 'rgba(99,102,241,0.08)' }}>
                        <div className="flex justify-between text-sm"><span className="opacity-60">Base Fee:</span><span className="font-bold">₹{admitForm.admFees}</span></div>
                        {admitForm.discount > 0 && <div className="flex justify-between text-sm"><span className="opacity-60">Discount:</span><span className="font-bold" style={{ color: '#10b981' }}>-₹{admitForm.discount}</span></div>}
                        <div className="flex justify-between text-sm font-bold mt-1 pt-1" style={{ borderTop: '1px solid rgba(99,102,241,0.15)' }}>
                            <span>Final Fee:</span><span style={{ color: '#6366f1' }}>₹{admitForm.finalFees}</span>
                        </div>
                    </div>
                )}
                <label className="text-xs font-bold opacity-50 mb-1 block">Batch</label>
                <select className="inp" value={admitForm.admBatchTime} onChange={e => setAdmitForm(p => ({ ...p, admBatchTime: e.target.value }))}>
                    {batchData.length > 0 ? batchData.map(b => <option key={b}>{b}</option>) : <><option>08-10 AM</option><option>10-12 PM</option><option>04-06 PM</option></>}
                </select>
                <button className="btn w-full mb-2" onClick={handleAdmit} disabled={admitSaving}>{admitSaving ? 'Saving...' : 'Admit'}</button>
                <button className="w-full text-gray-500 text-sm py-2" onClick={() => setShowAdmitModal(false)}>Cancel</button>
            </Modal>

            {/* ── Edit Modal ── */}
            <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="✏️ Edit Registration" width="w-[500px]">
                <div className="grid grid-cols-2 gap-4">
                    {[['name', 'Student Name', 'text'], ['mobile', 'Mobile', 'text'], ['aadhar', 'Aadhar No', 'text'], ['dob', 'Date of Birth', 'date']].map(([k, l, t]) => (
                        <div key={k}>
                            <label className="text-xs font-bold opacity-50 mb-1 block">{l}</label>
                            <input className="inp" type={t} placeholder={l} value={editForm[k]} onChange={e => setEditForm(p => ({ ...p, [k]: e.target.value }))} />
                        </div>
                    ))}
                    <div>
                        <label className="text-xs font-bold opacity-50 mb-1 block">Course</label>
                        <select className="inp" value={editForm.course} onChange={e => setEditForm(p => ({ ...p, course: e.target.value }))}>
                            <option value="">Select</option>
                            {(dropdowns.courses || []).map(c => <option key={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold opacity-50 mb-1 block">Branch</label>
                        <select className="inp" value={editForm.branch} onChange={e => setEditForm(p => ({ ...p, branch: e.target.value }))}>
                            <option value="">Select</option>
                            {(dropdowns.branches || []).map(b => <option key={b}>{b}</option>)}
                        </select>
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                    <button className="px-4 py-2 rounded text-gray-500 font-bold hover:bg-gray-100" onClick={() => setShowEditModal(false)}>Cancel</button>
                    <button className="btn" onClick={handleEditSave} disabled={editSaving}>{editSaving ? 'Saving...' : 'Update'}</button>
                </div>
            </Modal>

            {/* ── Delete Confirm ── */}
            <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Registration">
                <div className="text-center py-4">
                    <div className="text-5xl mb-3">🗑️</div>
                    <p className="font-bold text-lg">Delete <span style={{ color: '#7c3aed' }}>{confirmDelete?.name}</span>?</p>
                    <p className="text-sm text-gray-400 mt-1">ID: {confirmDelete?.id} — Cannot be undone</p>
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
