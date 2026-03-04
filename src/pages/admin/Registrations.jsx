/**
 * Registrations — Admin registration management page.
 * Shows registered students. Supports: Edit, Delete, Admit.
 */

import { useState, useMemo, useEffect } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import { saveCourseAdmission, getCourseFees, updateRegistration, deleteRegistration } from '../../services/api';
import { showToast } from '../../components/ui/Toast';

const BASE_COLUMNS = [
    { key: 'sr', label: '#' },
    { key: 'photo', label: 'Photo' },
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'course', label: 'Course' },
    { key: 'date', label: 'Date' },
    { key: 'action', label: 'Actions' },
];

export default function Registrations({ adminData, user, onReload }) {
    const isAdmin = user?.role === 'admin';
    const COLUMNS = isAdmin
        ? [...BASE_COLUMNS.slice(0, 4), { key: 'branch', label: 'Branch' }, ...BASE_COLUMNS.slice(4)]
        : BASE_COLUMNS;
    const registrations = adminData?.registrations || [];
    const dropdowns = adminData?.dropdowns || {};
    const admissions = adminData?.admissions || [];

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

    // ── Admission modal ────────────────────────────────────────
    const [showAdmitModal, setShowAdmitModal] = useState(false);
    const [admitSaving, setAdmitSaving] = useState(false);
    const [admitForm, setAdmitForm] = useState({
        admStudId: '', name: '', admCourse: '', admFees: '', discount: 0, finalFees: '', admBatchTime: ''
    });

    // ── Edit modal ─────────────────────────────────────────────
    const [showEditModal, setShowEditModal] = useState(false);
    const [editSaving, setEditSaving] = useState(false);
    const [editId, setEditId] = useState(null);
    const [editForm, setEditForm] = useState({
        name: '', mobile: '', aadhar: '', dob: '', course: '', branch: '',
    });

    // ── Confirm delete ─────────────────────────────────────────
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const currentYear = new Date().getFullYear();

    const studentExistingCourses = useMemo(() => {
        if (!admitForm.admStudId) return [];
        return admissions
            .filter(r => String(r[2]) === String(admitForm.admStudId))
            .map(r => String(r[7]).toLowerCase());
    }, [admitForm.admStudId, admissions]);

    const availableCourses = useMemo(() => {
        let courseList = courseMasterData.length > 0
            ? courseMasterData
            : (dropdowns.courses || []).map(c => ({ course: c, validity: '', fees: {} }));
        return courseList.filter(cm =>
            !studentExistingCourses.includes(cm.course.toLowerCase())
        );
    }, [courseMasterData, dropdowns.courses, studentExistingCourses]);

    // ── Open Admit modal ───────────────────────────────────────
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
        if (cm && cm.fees) {
            fee = cm.fees[String(currentYear)] || cm.fees[currentYear] || '';
            if (!fee) {
                const years = Object.keys(cm.fees).sort((a, b) => Number(b) - Number(a));
                for (const y of years) { if (cm.fees[y]) { fee = cm.fees[y]; break; } }
            }
        }
        const discount = admitForm.discount || 0;
        const numFee = Number(fee) || 0;
        const finalFees = numFee > 0 ? Math.max(0, numFee - Number(discount)) : '';
        setAdmitForm(p => ({
            ...p, admCourse: courseName,
            admFees: numFee > 0 ? String(numFee) : '',
            finalFees: finalFees ? String(finalFees) : ''
        }));
    };

    const handleDiscountChange = (discountVal) => {
        const disc = Number(discountVal) || 0;
        const baseFee = Number(admitForm.admFees) || 0;
        setAdmitForm(p => ({ ...p, discount: disc, finalFees: String(Math.max(0, baseFee - disc)) }));
    };

    const handleAdmit = async () => {
        if (!admitForm.admCourse) { alert('Please select a course'); return; }
        if (!admitForm.admBatchTime) { alert('Please select a batch'); return; }
        setAdmitSaving(true);
        const result = await saveCourseAdmission({
            ...admitForm, admFees: admitForm.finalFees || admitForm.admFees
        });
        if (result?.success) {
            showToast('Student Admitted Successfully! 🎉');
            setShowAdmitModal(false);
            onReload?.();
        } else { alert(result?.error || 'Failed to admit student'); }
        setAdmitSaving(false);
    };

    // ── Open Edit modal ────────────────────────────────────────
    const openEdit = (r) => {
        setEditId(r[2]);
        setEditForm({
            name: r[5] || '',
            mobile: r[4] || '',
            aadhar: r[10] || '',
            dob: r[3] || '',
            course: r[9] || '',
            branch: r[6] || '',
        });
        setShowEditModal(true);
    };

    const handleEditSave = async () => {
        if (!editForm.name) { alert('Name is required'); return; }
        setEditSaving(true);
        const result = await updateRegistration(editId, editForm);
        if (result?.success) {
            showToast('Registration Updated ✅');
            setShowEditModal(false);
            onReload?.();
        } else { alert(result?.error || 'Update failed'); }
        setEditSaving(false);
    };

    // ── Delete ─────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!confirmDelete) return;
        setDeleting(true);
        const result = await deleteRegistration(confirmDelete.id);
        if (result?.success) {
            showToast('Registration Deleted 🗑️');
            setConfirmDelete(null);
            onReload?.();
        } else { alert(result?.error || 'Delete failed. Ensure "deleteReg" is in Code.gs'); }
        setDeleting(false);
    };

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Registrations</h1>

            <DataTable
                columns={COLUMNS}
                data={registrations}
                renderRow={(r, i) => {
                    const img = r[11] && r[11].length > 10
                        ? <img src={r[11]} className="w-8 h-8 rounded-full border transform transition-all duration-200 hover:scale-[3] hover:z-50 relative shadow-sm" alt="" style={{ transformOrigin: 'left center' }} />
                        : <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs">NA</div>;
                    return (
                        <tr key={i} className="t-row">
                            <td className="font-mono text-sm opacity-50">{i + 1}</td>
                            <td>{img}</td>
                            <td>{r[2]}</td>
                            <td className="font-bold">{r[5]}</td>
                            <td>{r[9]}</td>
                            <td>{r[3]}</td>
                            <td>
                                <div className="flex items-center gap-2">
                                    {/* Edit */}
                                    <button
                                        onClick={() => openEdit(r)}
                                        title="Edit Registration"
                                        className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                                    >
                                        <Edit size={16} />
                                    </button>

                                    {/* Delete */}
                                    <button
                                        onClick={() => setConfirmDelete({ id: r[2], name: r[5] })}
                                        title="Delete Registration"
                                        className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>

                                    {/* Admit */}
                                    <button
                                        className="btn py-1 px-3 text-xs ml-2"
                                        onClick={() => openAdmitModal(r[2], r[5])}
                                    >
                                        Admit
                                    </button>
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
                <select className="inp" value={admitForm.admCourse} onChange={(e) => handleCourseChange(e.target.value)}>
                    <option value="">Select</option>
                    {availableCourses.map((cm) => (
                        <option key={cm.course} value={cm.course}>{cm.course}</option>
                    ))}
                </select>
                {studentExistingCourses.length > 0 && (
                    <div className="text-xs text-amber-600 mb-2 -mt-2">
                        ⚠️ Already enrolled: {studentExistingCourses.join(', ').toUpperCase()}
                    </div>
                )}

                <label className="text-xs font-bold opacity-50 mb-1 block">Course Fees (₹)</label>
                <input className="inp" style={{ background: '#f3f4f6' }} value={admitForm.admFees ? `₹${admitForm.admFees}` : ''} readOnly placeholder="Select a course to see fees" />

                <label className="text-xs font-bold opacity-50 mb-1 block">Discount (₹)</label>
                <input className="inp" type="number" placeholder="Enter discount amount" value={admitForm.discount || ''} onChange={(e) => handleDiscountChange(e.target.value)} />

                {admitForm.admFees && (
                    <div className="mb-3 p-3 rounded-lg" style={{ background: 'rgba(99,102,241,0.08)' }}>
                        <div className="flex justify-between text-sm">
                            <span className="opacity-60">Base Fee:</span>
                            <span className="font-bold">₹{admitForm.admFees}</span>
                        </div>
                        {admitForm.discount > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="opacity-60">Discount:</span>
                                <span className="font-bold" style={{ color: '#10b981' }}>-₹{admitForm.discount}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm font-bold mt-1 pt-1" style={{ borderTop: '1px solid rgba(99,102,241,0.15)' }}>
                            <span>Final Fee:</span>
                            <span style={{ color: '#6366f1' }}>₹{admitForm.finalFees}</span>
                        </div>
                    </div>
                )}

                <label className="text-xs font-bold opacity-50 mb-1 block">Batch</label>
                <select className="inp" value={admitForm.admBatchTime} onChange={(e) => setAdmitForm(p => ({ ...p, admBatchTime: e.target.value }))}>
                    {batchData.length > 0 ? (
                        batchData.map(b => <option key={b} value={b}>{b}</option>)
                    ) : (
                        <><option>08-10 AM</option><option>10-12 PM</option><option>04-06 PM</option></>
                    )}
                </select>

                <button className="btn w-full mb-2" onClick={handleAdmit} disabled={admitSaving}>
                    {admitSaving ? 'Saving...' : 'Admit'}
                </button>
                <button className="w-full text-gray-500 text-sm py-2" onClick={() => setShowAdmitModal(false)}>Cancel</button>
            </Modal>

            {/* ── Edit Registration Modal ── */}
            <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="✏️ Edit Registration" width="w-[500px]">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold opacity-50 mb-1 block">Student Name</label>
                        <input className="inp" placeholder="Name *" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div>
                        <label className="text-xs font-bold opacity-50 mb-1 block">Mobile</label>
                        <input className="inp" placeholder="Mobile" value={editForm.mobile} onChange={e => setEditForm(p => ({ ...p, mobile: e.target.value }))} />
                    </div>
                    <div>
                        <label className="text-xs font-bold opacity-50 mb-1 block">Aadhar No</label>
                        <input className="inp" placeholder="Aadhar" value={editForm.aadhar} onChange={e => setEditForm(p => ({ ...p, aadhar: e.target.value }))} />
                    </div>
                    <div>
                        <label className="text-xs font-bold opacity-50 mb-1 block">Date of Birth</label>
                        <input className="inp" type="date" value={editForm.dob} onChange={e => setEditForm(p => ({ ...p, dob: e.target.value }))} />
                    </div>
                    <div>
                        <label className="text-xs font-bold opacity-50 mb-1 block">Course</label>
                        <select className="inp" value={editForm.course} onChange={e => setEditForm(p => ({ ...p, course: e.target.value }))}>
                            <option value="">Select Course</option>
                            {(dropdowns.courses || []).map(c => <option key={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold opacity-50 mb-1 block">Branch</label>
                        <select className="inp" value={editForm.branch} onChange={e => setEditForm(p => ({ ...p, branch: e.target.value }))}>
                            <option value="">Select Branch</option>
                            {(dropdowns.branches || []).map(b => <option key={b}>{b}</option>)}
                        </select>
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                    <button className="px-4 py-2 rounded text-gray-500 font-bold hover:bg-gray-100" onClick={() => setShowEditModal(false)}>Cancel</button>
                    <button className="btn" onClick={handleEditSave} disabled={editSaving}>
                        {editSaving ? 'Saving...' : 'Update'}
                    </button>
                </div>
            </Modal>

            {/* ── Delete Confirm Modal ── */}
            <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Registration">
                <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
                    <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
                        Delete registration for <span style={{ color: '#7c3aed' }}>{confirmDelete?.name}</span>?
                    </p>
                    <p style={{ fontSize: 13, color: '#94a3b8' }}>
                        Student ID: {confirmDelete?.id} — This action cannot be undone.
                    </p>
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
