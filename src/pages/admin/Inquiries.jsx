/**
 * Inquiries — Admin inquiry management page.
 * Lists all inquiries. Supports: New, Edit, Delete, Register.
 */

import { useState } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { saveInquiry, updateInquiry, deleteInquiry, registerStudent } from '../../services/api';
import { showToast } from '../../components/ui/Toast';

const BLANK_FORM = {
    name: '', mobile: '', parentMobile: '', branch: '', course: '', batch: '', village: '',
    edu: '', gender: 'Male', medium: 'English', board: 'State',
    stream: 'Arts', remark: '', status: 'New'
};

const COLUMNS = [
    { key: 'sr', label: '#' },
    { key: 'name', label: 'Name' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'course', label: 'Course' },
    { key: 'village', label: 'Village' },
    { key: 'status', label: 'Status' },
    { key: 'action', label: 'Actions' },
];

export default function Inquiries({ adminData, onReload }) {
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editId, setEditId] = useState(null);    // null = new, otherwise row[0]
    const [form, setForm] = useState(BLANK_FORM);

    const [showRegModal, setShowRegModal] = useState(false);
    const [regSaving, setRegSaving] = useState(false);
    const [regForm, setRegForm] = useState({ inquiryId: '', aadhar: '', dob: '', photo: '' });

    const [confirmDelete, setConfirmDelete] = useState(null); // { id, name }
    const [deleting, setDeleting] = useState(false);

    const inquiries = adminData?.inquiries || [];
    const dropdowns = adminData?.dropdowns || {};

    const handleChange = (field, value) => setForm(p => ({ ...p, [field]: value }));

    // ── Open New Inquiry ───────────────────────────────────────
    const openNew = () => {
        setEditId(null);
        setForm(BLANK_FORM);
        setShowModal(true);
    };

    // ── Open Edit Inquiry ──────────────────────────────────────
    const openEdit = (r) => {
        setEditId(r[0]);
        setForm({
            name: r[3] || '',
            mobile: r[4] || '',
            parentMobile: r[15] || '', // mapping new field to end of array
            branch: r[5] || '',
            course: r[6] || '',
            batch: r[16] || '',
            village: r[8] || '',
            edu: r[9] || '',
            gender: r[10] || 'Male',
            medium: r[11] || 'English',
            board: r[12] || 'State',
            stream: r[13] || 'Arts',
            remark: r[14] || '',
            status: r[7] || 'New'
        });
        setShowModal(true);
    };

    // ── Save (new or edit) ─────────────────────────────────────
    const handleSave = async () => {
        if (!form.name || !form.mobile) { alert('Please fill Name and Mobile'); return; }
        setSaving(true);
        const result = editId
            ? await updateInquiry(editId, form)
            : await saveInquiry(form);
        if (result?.success) {
            showToast(editId ? 'Inquiry Updated ✅' : 'Inquiry Saved ✅');
            setShowModal(false);
            onReload?.();
        } else {
            alert(result?.error || 'Save failed');
        }
        setSaving(false);
    };

    // ── Delete ─────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!confirmDelete) return;
        setDeleting(true);
        const result = await deleteInquiry(confirmDelete.id);
        if (result?.success) {
            showToast('Inquiry Deleted 🗑️');
            setConfirmDelete(null);
            onReload?.();
        } else {
            alert(result?.error || 'Delete failed. Ensure "deleteInq" is implemented in Code.gs');
        }
        setDeleting(false);
    };

    // ── Register Student ───────────────────────────────────────
    const openRegModal = (inquiryId) => {
        setRegForm({ inquiryId, aadhar: '', dob: '', photo: '' });
        setShowRegModal(true);
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => setRegForm(p => ({ ...p, photo: ev.target.result }));
        reader.readAsDataURL(file);
    };

    const handleRegister = async () => {
        if (!regForm.aadhar) { alert('Please enter Aadhar No'); return; }
        setRegSaving(true);
        const result = await registerStudent(regForm);
        if (result?.success) {
            showToast('Student Registered Successfully! 🎉');
            setShowRegModal(false);

            // Auto Update status to Confirmed locally so it reflects on UI immediately
            // Optionally, you can just rely on onReload, but this is faster.
            onReload?.();
        } else {
            alert(result?.error || 'Registration failed');
        }
        setRegSaving(false);
    };

    const getStatusVariant = (status) => {
        if (status === 'Confirmed') return 'green';
        if (status === 'Cancelled') return 'red';
        if (status === 'Postponed') return 'yellow';
        return 'blue';
    };

    return (
        <div>
            <div className="flex justify-between mb-4">
                <h1 className="text-2xl font-bold">Inquiries</h1>
                <button className="btn" onClick={openNew}>+ New Inquiry</button>
            </div>

            <DataTable
                columns={COLUMNS}
                data={inquiries}
                renderRow={(r, i) => (
                    <tr key={i} className="t-row">
                        <td className="font-mono text-sm opacity-50">{i + 1}</td>
                        <td><div className="font-bold text-gray-700">{r[3]}</div></td>
                        <td>{r[4]}</td>
                        <td>{r[6]}</td>
                        <td>{r[8]}</td>
                        <td><Badge text={r[7] || 'New'} variant={getStatusVariant(r[7])} /></td>
                        <td>
                            <div className="flex items-center gap-2">
                                {/* Edit */}
                                <button
                                    onClick={() => openEdit(r)}
                                    title="Edit Inquiry"
                                    className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                                >
                                    <Edit size={16} />
                                </button>

                                {/* Delete */}
                                <button
                                    onClick={() => setConfirmDelete({ id: r[0], name: r[3] })}
                                    title="Delete Inquiry"
                                    className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>

                                {/* Register */}
                                {r[7] !== 'Confirmed' && (
                                    <button
                                        onClick={() => openRegModal(r[0])}
                                        className="btn py-1 px-3 text-xs ml-2"
                                    >
                                        Register
                                    </button>
                                )}
                            </div>
                        </td>
                    </tr>
                )}
            />

            {/* ── New / Edit Inquiry Modal ── */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editId ? '✏️ Edit Inquiry' : '+ New Inquiry'}
                width="w-[800px]"
            >
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="text-xs font-bold opacity-50 mb-1 block">Student Name *</label>
                        <input className="inp" placeholder="Student Name" value={form.name} onChange={(e) => handleChange('name', e.target.value)} />
                    </div>
                    <div>
                        <label className="text-xs font-bold opacity-50 mb-1 block">Mobile *</label>
                        <input className="inp" placeholder="Mobile" value={form.mobile} onChange={(e) => handleChange('mobile', e.target.value)} />
                    </div>
                    <div>
                        <label className="text-xs font-bold opacity-50 mb-1 block">Parent Mobile</label>
                        <input className="inp" placeholder="Parent Mobile" value={form.parentMobile} onChange={(e) => handleChange('parentMobile', e.target.value)} />
                    </div>

                    <div>
                        <label className="text-xs font-bold opacity-50 mb-1 block">Branch</label>
                        <select className="inp" value={form.branch} onChange={(e) => handleChange('branch', e.target.value)}>
                            <option value="">Select Branch</option>
                            {(dropdowns.branches || []).map((b) => <option key={b}>{b}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold opacity-50 mb-1 block">Course</label>
                        <select className="inp" value={form.course} onChange={(e) => handleChange('course', e.target.value)}>
                            <option value="">Select Course</option>
                            {(dropdowns.courses || []).map((c) => <option key={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold opacity-50 mb-1 block">Batch Timing</label>
                        <select className="inp" value={form.batch} onChange={(e) => handleChange('batch', e.target.value)}>
                            <option value="">Select Batch</option>
                            {(dropdowns.batches || ['08-10 AM', '10-12 PM', '04-06 PM']).map(b => <option key={b}>{b}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-bold opacity-50 mb-1 block">Village</label>
                        <select className="inp" value={form.village} onChange={(e) => handleChange('village', e.target.value)}>
                            <option value="">Select Village</option>
                            {(dropdowns.villages || []).map((v) => <option key={v}>{v}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold opacity-50 mb-1 block">Education</label>
                        <select className="inp" value={form.edu} onChange={(e) => handleChange('edu', e.target.value)}>
                            <option value="">Select Education</option>
                            {(dropdowns.education || []).map((e) => <option key={e}>{e}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold opacity-50 mb-1 block">Gender</label>
                        <select className="inp" value={form.gender} onChange={(e) => handleChange('gender', e.target.value)}>
                            <option>Male</option><option>Female</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-bold opacity-50 mb-1 block">Medium</label>
                        <select className="inp" value={form.medium} onChange={(e) => handleChange('medium', e.target.value)}>
                            <option>English</option><option>Marathi</option><option>Hindi</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold opacity-50 mb-1 block">Board</label>
                        <select className="inp" value={form.board} onChange={(e) => handleChange('board', e.target.value)}>
                            <option>State</option><option>CBSE</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold opacity-50 mb-1 block">Stream</label>
                        <select className="inp" value={form.stream} onChange={(e) => handleChange('stream', e.target.value)}>
                            <option>Arts</option><option>Commerce</option><option>Science</option>
                        </select>
                    </div>

                    <div className="col-span-2">
                        <label className="text-xs font-bold opacity-50 mb-1 block">Remarks</label>
                        <textarea className="inp" placeholder="Remarks" value={form.remark} onChange={(e) => handleChange('remark', e.target.value)} />
                    </div>
                    <div>
                        <label className="text-xs font-bold opacity-50 mb-1 block">Status</label>
                        <select className="inp" value={form.status} onChange={(e) => handleChange('status', e.target.value)}>
                            <option>New</option>
                            <option>Follow Up</option>
                            <option>Postponed</option>
                            <option>Cancelled</option>
                            <option>Confirmed</option>
                        </select>
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                    <button className="px-4 py-2 rounded text-gray-500 font-bold hover:bg-gray-100" onClick={() => setShowModal(false)}>
                        Cancel
                    </button>
                    <button className="btn" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : editId ? 'Update' : 'Save'}
                    </button>
                </div>
            </Modal>

            {/* ── Register Student Modal ── */}
            <Modal isOpen={showRegModal} onClose={() => setShowRegModal(false)} title="Register Student">
                <input className="inp" placeholder="Aadhar No" value={regForm.aadhar}
                    onChange={(e) => setRegForm(p => ({ ...p, aadhar: e.target.value }))} />
                <input className="inp" type="date" value={regForm.dob}
                    onChange={(e) => setRegForm(p => ({ ...p, dob: e.target.value }))} />
                <div className="mb-4">
                    <label className="text-xs font-bold text-gray-500">Student Photo</label>
                    <input className="text-sm block mt-1 w-full" type="file" accept="image/*" onChange={handlePhotoChange} />
                </div>
                <div className="flex justify-end gap-2">
                    <button className="px-4 py-2 rounded text-gray-500 font-bold hover:bg-gray-100" onClick={() => setShowRegModal(false)}>
                        Cancel
                    </button>
                    <button className="btn" onClick={handleRegister} disabled={regSaving}>
                        {regSaving ? 'Registering...' : 'Confirm Registration'}
                    </button>
                </div>
            </Modal>

            {/* ── Delete Confirm Modal ── */}
            <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Inquiry">
                <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
                    <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
                        Delete inquiry for <span style={{ color: '#7c3aed' }}>{confirmDelete?.name}</span>?
                    </p>
                    <p style={{ fontSize: 13, color: '#94a3b8' }}>This action cannot be undone.</p>
                </div>
                <div className="flex gap-3 justify-center">
                    <button className="px-5 py-2 rounded-xl text-gray-500 font-bold hover:bg-gray-100 border" onClick={() => setConfirmDelete(null)}>
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
