/**
 * Admissions — Admin admissions management page.
 * Shows all admitted students. Supports: Edit batch/fees, Delete.
 */

import { useState } from 'react';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { updateAdmission, deleteAdmission } from '../../services/api';
import { showToast } from '../../components/ui/Toast';

const COLUMNS = [
    { key: 'photo', label: 'Photo' },
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'course', label: 'Course' },
    { key: 'batch', label: 'Batch' },
    { key: 'status', label: 'Status' },
    { key: 'action', label: 'Actions' },
];

// Admission row indices:
// r[0]=rowIndex, r[1]=admId, r[2]=studentId, r[3]=name,
// r[4]=date, r[5]=branch, r[6]=?, r[7]=course, r[8]=batch,
// r[9]=fees, r[10]=discount, r[11]=status, r[12]=photo

export default function Admissions({ adminData, onReload }) {
    const admissions = adminData?.admissions || [];
    const dropdowns = adminData?.dropdowns || {};

    // ── Edit state ─────────────────────────────────────────────
    const [showEditModal, setShowEditModal] = useState(false);
    const [editSaving, setEditSaving] = useState(false);
    const [editId, setEditId] = useState(null);
    const [editForm, setEditForm] = useState({
        name: '', course: '', batch: '', fees: '', discount: 0, status: 'Active',
    });

    // ── Delete state ───────────────────────────────────────────
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // ── Open Edit modal ────────────────────────────────────────
    const openEdit = (r) => {
        setEditId(r[1] || r[0]);   // prefer admId (r[1]), fallback rowIndex
        setEditForm({
            name: r[3] || '',
            course: r[7] || '',
            batch: r[8] || '08-10 AM',
            fees: r[9] || '',
            discount: r[10] || 0,
            status: r[11] || 'Active',
        });
        setShowEditModal(true);
    };

    const handleEditSave = async () => {
        if (!editForm.course) { alert('Please select a course'); return; }
        setEditSaving(true);
        const result = await updateAdmission(editId, editForm);
        if (result?.success) {
            showToast('Admission Updated ✅');
            setShowEditModal(false);
            onReload?.();
        } else {
            alert(result?.error || 'Update failed');
        }
        setEditSaving(false);
    };

    // ── Delete ─────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!confirmDelete) return;
        setDeleting(true);
        const result = await deleteAdmission(confirmDelete.id);
        if (result?.success) {
            showToast('Admission Deleted 🗑️');
            setConfirmDelete(null);
            onReload?.();
        } else {
            alert(result?.error || 'Delete failed');
        }
        setDeleting(false);
    };

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Admissions</h1>

            <DataTable
                columns={COLUMNS}
                data={admissions}
                renderRow={(r, i) => {
                    const img = r[12] && r[12].length > 10
                        ? <img src={r[12]} className="w-8 h-8 rounded-full border" alt="" />
                        : <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs">NA</div>;
                    return (
                        <tr key={i} className="t-row">
                            <td>{img}</td>
                            <td>{r[1] || r[2]}</td>
                            <td className="font-bold">{r[3]}</td>
                            <td>{r[7]}</td>
                            <td>{r[8]}</td>
                            <td><Badge text={r[11] || 'Active'} variant={r[11] === 'Inactive' ? 'red' : 'green'} /></td>
                            <td>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    {/* Edit */}
                                    <button
                                        onClick={() => openEdit(r)}
                                        style={{
                                            padding: '4px 10px', borderRadius: 8,
                                            border: '1.5px solid #e0d9ff',
                                            background: '#f5f3ff', color: '#7c3aed',
                                            fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                        }}
                                    >
                                        ✏️ Edit
                                    </button>

                                    {/* Delete */}
                                    <button
                                        onClick={() => setConfirmDelete({ id: r[1] || r[0], name: r[3] })}
                                        style={{
                                            padding: '4px 10px', borderRadius: 8,
                                            border: '1.5px solid #fecdd3',
                                            background: '#fff1f2', color: '#e11d48',
                                            fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                        }}
                                    >
                                        🗑️ Delete
                                    </button>
                                </div>
                            </td>
                        </tr>
                    );
                }}
            />

            {/* ── Edit Admission Modal ── */}
            <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="✏️ Edit Admission" width="w-[500px]">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold opacity-50 mb-1 block">Student Name</label>
                        <input className="inp" style={{ background: '#f3f4f6' }} value={editForm.name} readOnly />
                    </div>
                    <div>
                        <label className="text-xs font-bold opacity-50 mb-1 block">Course</label>
                        <select className="inp" value={editForm.course} onChange={e => setEditForm(p => ({ ...p, course: e.target.value }))}>
                            <option value="">Select Course</option>
                            {(dropdowns.courses || []).map(c => <option key={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold opacity-50 mb-1 block">Batch Timing</label>
                        <select className="inp" value={editForm.batch} onChange={e => setEditForm(p => ({ ...p, batch: e.target.value }))}>
                            {(dropdowns.batches || ['08-10 AM', '10-12 PM', '04-06 PM']).map(b => <option key={b}>{b}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold opacity-50 mb-1 block">Fees (₹)</label>
                        <input className="inp" type="number" placeholder="Course Fees" value={editForm.fees} onChange={e => setEditForm(p => ({ ...p, fees: e.target.value }))} />
                    </div>
                    <div>
                        <label className="text-xs font-bold opacity-50 mb-1 block">Discount (₹)</label>
                        <input className="inp" type="number" placeholder="Discount" value={editForm.discount} onChange={e => setEditForm(p => ({ ...p, discount: e.target.value }))} />
                    </div>
                    <div>
                        <label className="text-xs font-bold opacity-50 mb-1 block">Status</label>
                        <select className="inp" value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}>
                            <option>Active</option>
                            <option>Inactive</option>
                            <option>Completed</option>
                        </select>
                    </div>
                </div>

                {/* Fee summary */}
                {editForm.fees && (
                    <div className="mt-4 p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' }}>
                        <div className="flex justify-between text-sm">
                            <span className="opacity-60">Base Fee:</span>
                            <span className="font-bold">₹{editForm.fees}</span>
                        </div>
                        {Number(editForm.discount) > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="opacity-60">Discount:</span>
                                <span className="font-bold" style={{ color: '#10b981' }}>−₹{editForm.discount}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm font-bold mt-1 pt-1" style={{ borderTop: '1px solid rgba(99,102,241,0.15)' }}>
                            <span>Final Fee:</span>
                            <span style={{ color: '#6366f1' }}>
                                ₹{Math.max(0, Number(editForm.fees) - Number(editForm.discount || 0))}
                            </span>
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-2 mt-4">
                    <button className="px-4 py-2 rounded text-gray-500 font-bold hover:bg-gray-100" onClick={() => setShowEditModal(false)}>
                        Cancel
                    </button>
                    <button className="btn" onClick={handleEditSave} disabled={editSaving}>
                        {editSaving ? 'Saving...' : 'Update'}
                    </button>
                </div>
            </Modal>

            {/* ── Delete Confirm Modal ── */}
            <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Admission">
                <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
                    <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
                        Delete admission for <span style={{ color: '#7c3aed' }}>{confirmDelete?.name}</span>?
                    </p>
                    <p style={{ fontSize: 13, color: '#94a3b8' }}>
                        This will remove the admission record. This action cannot be undone.
                    </p>
                </div>
                <div className="flex gap-3 justify-center">
                    <button
                        className="px-5 py-2 rounded-xl text-gray-500 font-bold hover:bg-gray-100 border"
                        onClick={() => setConfirmDelete(null)}
                    >
                        Cancel
                    </button>
                    <button
                        disabled={deleting}
                        onClick={handleDelete}
                        style={{
                            padding: '8px 24px', borderRadius: 12, border: 'none',
                            background: '#e11d48', color: 'white',
                            fontWeight: 800, fontSize: 14, cursor: 'pointer',
                        }}
                    >
                        {deleting ? 'Deleting...' : 'Yes, Delete'}
                    </button>
                </div>
            </Modal>
        </div>
    );
}
