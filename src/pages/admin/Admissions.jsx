/**
 * Admissions — Admin admissions management page.
 * Shows all admitted students with course/batch info.
 */

import { useState } from 'react';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { saveCourseAdmission } from '../../services/api';
import { showToast } from '../../components/ui/Toast';

const COLUMNS = [
    { key: 'photo', label: 'Photo' },
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'course', label: 'Course' },
    { key: 'batch', label: 'Batch' },
    { key: 'status', label: 'Status' },
];

export default function Admissions({ adminData, onReload }) {
    const admissions = adminData?.admissions || [];
    const dropdowns = adminData?.dropdowns || {};
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ admStudId: '', name: '', admCourse: '', admFees: '', admBatchTime: '08-10 AM' });

    // Open admission modal for a student
    const openAdm = (studentId, name) => {
        setForm({ admStudId: studentId, name, admCourse: '', admFees: '', admBatchTime: '08-10 AM' });
        setShowModal(true);
    };

    const handleAdmit = async () => {
        setSaving(true);
        const result = await saveCourseAdmission(form);
        if (result?.success) {
            showToast('Student Admitted');
            setShowModal(false);
            onReload?.();
        }
        setSaving(false);
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
                            <td>{r[1]}</td>
                            <td className="font-bold">{r[3]}</td>
                            <td>{r[7]}</td>
                            <td>{r[8]}</td>
                            <td><Badge text="Active" variant="green" /></td>
                        </tr>
                    );
                }}
            />

            {/* Admission Modal */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Admission">
                <input className="inp bg-gray-100" value={form.name} readOnly />
                <select className="inp" value={form.admCourse} onChange={(e) => setForm((p) => ({ ...p, admCourse: e.target.value }))}>
                    <option value="">Select Course</option>
                    {(dropdowns.courses || []).map((c) => <option key={c}>{c}</option>)}
                </select>
                <input className="inp bg-gray-100" placeholder="Course Fee" value={form.admFees} readOnly />
                <select className="inp" value={form.admBatchTime} onChange={(e) => setForm((p) => ({ ...p, admBatchTime: e.target.value }))}>
                    <option>08-10 AM</option>
                    <option>10-12 PM</option>
                    <option>04-06 PM</option>
                </select>
                <button className="btn w-full mb-2" onClick={handleAdmit} disabled={saving}>{saving ? 'Saving...' : 'Admit'}</button>
                <button className="w-full text-gray-500 text-sm" onClick={() => setShowModal(false)}>Cancel</button>
            </Modal>
        </div>
    );
}
