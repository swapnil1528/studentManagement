/**
 * Admissions — Student admission management.
 *
 * Admission Data sheet column mapping (r[0]=rowIndex):
 *  r[1]=SrNo  r[2]=StudId  r[3]=InqNo  r[4]=Name  r[5]=Date
 *  r[6]=Branch  r[7]=Course  r[8]=Batch  r[9]=Fees  r[10]=Discount
 *  r[11]=FinalFees(or Status)  r[12]=Status(or Photo)  r[13]=Photo
 * NOTE: Adjust indices if your Admission sheet differs.
 */

import { useState, useMemo } from 'react';
import { Edit, Trash2, FileSpreadsheet, FileText } from 'lucide-react';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { updateAdmission, deleteAdmission } from '../../services/api';
import { showToast } from '../../components/ui/Toast';
import { exportCsv, exportPdf } from '../../utils/exportUtils';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Exact column mapping after r[0]=rowNum overlay on Admission Data sheet
// r[1]=AdmNo, r[2]=StudID, r[3]=Name, r[4]=Mobile, r[5]=DOB, r[6]=Branch
// r[7]=Course, r[8]=Batch, r[9]=Date, r[10]=Fees, r[11]=Status, r[12]=Photo, r[13]=MotherName
const getAdmName = r => r[3] || '';
const getAdmStudId = r => r[2] || '';
const getAdmBranch = r => r[6] || '';
const getAdmCourse = r => r[7] || '';
const getAdmBatch = r => r[8] || '';
const getAdmFees = r => r[10] || '';
const getAdmDisc = r => 0; // Discount column was removed from sheet structure
const getAdmStatus = r => r[11] || 'Active';
const getAdmPhoto = r => r[12] || '';
const getAdmDate = r => r[9] || '';

export default function Admissions({ adminData, user, onReload }) {
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
        { key: 'batch', label: 'Batch' },
        { key: 'status', label: 'Status' },
        { key: 'action', label: 'Actions' },
    ];

    const admissions = adminData?.admissions || [];
    const dropdowns = adminData?.dropdowns || {};

    // Filters
    const [filterBranch, setFilterBranch] = useState('');
    const [filterMonth, setFilterMonth] = useState('');
    const [filterYear, setFilterYear] = useState('');

    const years = useMemo(() => {
        const s = new Set();
        admissions.forEach(r => {
            const d = String(getAdmDate(r) || '');
            const yr = d.split('-')[0] || d.split('/')[2];
            if (yr && yr.length === 4) s.add(yr);
        });
        return [...s].sort((a, b) => b - a);
    }, [admissions]);

    const filtered = useMemo(() => admissions.filter(r => {
        if (filterBranch && getAdmBranch(r) !== filterBranch) return false;
        if (filterMonth || filterYear) {
            const d = String(getAdmDate(r) || '');
            if (filterYear && !d.includes(filterYear)) return false;
            if (filterMonth) {
                const mi = MONTHS.indexOf(filterMonth);
                const p = String(mi + 1).padStart(2, '0');
                if (!d.includes('-' + p + '-') && !d.includes('/' + p + '/') && !d.includes('-' + p)) return false;
            }
        }
        return true;
    }), [admissions, filterBranch, filterMonth, filterYear]);

    // Edit state
    const [showEditModal, setShowEditModal] = useState(false);
    const [editSaving, setEditSaving] = useState(false);
    const [editId, setEditId] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', course: '', batch: '', fees: '', discount: 0, status: 'Active' });

    // Delete state
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const openEdit = (r) => {
        setEditId(getAdmStudId(r));
        setEditForm({
            name: getAdmName(r),
            course: getAdmCourse(r),
            batch: getAdmBatch(r) || '08-10 AM',
            fees: getAdmFees(r),
            discount: getAdmDisc(r),
            status: getAdmStatus(r),
        });
        setShowEditModal(true);
    };

    const handleEditSave = async () => {
        if (!editForm.course) { alert('Please select a course'); return; }
        setEditSaving(true);
        const result = await updateAdmission(editId, editForm);
        if (result?.success) { showToast('Updated ✅'); setShowEditModal(false); onReload?.(); }
        else alert(result?.error || 'Update failed');
        setEditSaving(false);
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        setDeleting(true);
        const result = await deleteAdmission(confirmDelete.id);
        if (result?.success) { showToast('Deleted 🗑️'); setConfirmDelete(null); onReload?.(); }
        else alert(result?.error || 'Delete failed');
        setDeleting(false);
    };

    // Export
    const doExportCsv = () => {
        const headers = ['#', 'Student ID', 'Name', ...(showBranchCol ? ['Branch'] : []), 'Course', 'Batch', 'Status', 'Date'];
        const rows = filtered.map((r, i) => [i + 1, getAdmStudId(r), getAdmName(r), ...(showBranchCol ? [getAdmBranch(r)] : []), getAdmCourse(r), getAdmBatch(r), getAdmStatus(r), getAdmDate(r)]);
        exportCsv('Admissions_' + new Date().toISOString().slice(0, 10), headers, rows);
    };
    const doExportPdf = () => {
        const headers = ['#', 'Student ID', 'Name', ...(showBranchCol ? ['Branch'] : []), 'Course', 'Status'];
        const rows = filtered.map((r, i) => [i + 1, getAdmStudId(r), getAdmName(r), ...(showBranchCol ? [getAdmBranch(r)] : []), getAdmCourse(r), getAdmStatus(r)]);
        exportPdf('Admissions Report', headers, rows);
    };

    return (
        <div>
            <div className="flex justify-between mb-4 flex-wrap gap-2">
                <h1 className="text-2xl font-bold">Admissions</h1>
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
                    <span className="text-xs opacity-40 ml-auto">{filtered.length} of {admissions.length}</span>
                </div>
            )}

            <DataTable
                columns={COLUMNS}
                data={filtered}
                renderRow={(r, i) => {
                    const photoUrl = getAdmPhoto(r);
                    const photo = photoUrl && String(photoUrl).trim() !== '' ? photoUrl : null;
                    const img = photo
                        ? <img src={photo} className="w-8 h-8 rounded-full border object-cover transform transition-all duration-200 hover:scale-[3] hover:z-50 relative shadow-sm" alt="" style={{ transformOrigin: 'left center' }} />
                        : <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold border border-indigo-100">{String(getAdmName(r) || '--').substring(0, 2).toUpperCase()}</div>;
                    return (
                        <tr key={i} className="t-row">
                            <td className="font-mono text-sm opacity-50">{i + 1}</td>
                            <td>{img}</td>
                            <td className="font-mono text-xs">{getAdmStudId(r)}</td>
                            <td className="font-bold">{getAdmName(r)}</td>
                            {showBranchCol && <td><span className="text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-600 font-semibold">{getAdmBranch(r)}</span></td>}
                            <td>{getAdmCourse(r)}</td>
                            <td className="text-xs">{getAdmBatch(r)}</td>
                            <td><Badge text={getAdmStatus(r) || 'Active'} variant={getAdmStatus(r) === 'Inactive' ? 'red' : 'green'} /></td>
                            <td>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => openEdit(r)} title="Edit"
                                        className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors">
                                        <Edit size={16} />
                                    </button>
                                    {isAdmin && (
                                        <button onClick={() => setConfirmDelete({ id: getAdmStudId(r), name: getAdmName(r) })} title="Delete"
                                            className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    );
                }}
            />

            {/* ── Edit Modal ── */}
            <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="✏️ Edit Admission" width="w-[500px]">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold opacity-50 mb-1 block">Student Name</label>
                        <input className="inp" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div>
                        <label className="text-xs font-bold opacity-50 mb-1 block">Course</label>
                        <select className="inp" value={editForm.course} onChange={e => setEditForm(p => ({ ...p, course: e.target.value }))}>
                            <option value="">Select</option>
                            {(dropdowns.courses || []).map(c => <option key={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold opacity-50 mb-1 block">Batch</label>
                        <select className="inp" value={editForm.batch} onChange={e => setEditForm(p => ({ ...p, batch: e.target.value }))}>
                            {(dropdowns.batches || ['08-10 AM', '10-12 PM', '04-06 PM']).map(b => <option key={b}>{b}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold opacity-50 mb-1 block">Status</label>
                        <select className="inp" value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}>
                            <option>Active</option><option>Inactive</option><option>Completed</option>
                        </select>
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                    <button className="px-4 py-2 rounded text-gray-500 font-bold hover:bg-gray-100" onClick={() => setShowEditModal(false)}>Cancel</button>
                    <button className="btn" onClick={handleEditSave} disabled={editSaving}>{editSaving ? 'Saving...' : 'Update'}</button>
                </div>
            </Modal>

            {/* ── Delete Confirm ── */}
            <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Admission">
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
