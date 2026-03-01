/**
 * Registrations — Admin registration management page.
 * Shows registered students with photo, ID, name, course, date.
 * "Admit" button opens Admission modal with course & batch selection.
 */

import { useState } from 'react';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import { saveCourseAdmission } from '../../services/api';
import { showToast } from '../../components/ui/Toast';

const COLUMNS = [
    { key: 'photo', label: 'Photo' },
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'course', label: 'Course' },
    { key: 'date', label: 'Date' },
    { key: 'action', label: 'Action' },
];

export default function Registrations({ adminData, onReload }) {
    const registrations = adminData?.registrations || [];
    const dropdowns = adminData?.dropdowns || {};

    // Admission modal state
    const [showAdmitModal, setShowAdmitModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [admitForm, setAdmitForm] = useState({
        admStudId: '', name: '', admCourse: '', admFees: '', admBatchTime: '08-10 AM'
    });

    // Open Admission modal for a registered student
    const openAdmitModal = (studentId, studentName) => {
        setAdmitForm({
            admStudId: studentId,
            name: studentName,
            admCourse: '',
            admFees: '',
            admBatchTime: '08-10 AM'
        });
        setShowAdmitModal(true);
    };

    // Handle admission
    const handleAdmit = async () => {
        if (!admitForm.admCourse) {
            alert('Please select a course');
            return;
        }
        setSaving(true);
        const result = await saveCourseAdmission(admitForm);
        if (result?.success) {
            showToast('Student Admitted Successfully!');
            setShowAdmitModal(false);
            onReload?.();
        } else {
            alert(result?.error || 'Failed to admit student');
        }
        setSaving(false);
    };

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Registrations</h1>

            <DataTable
                columns={COLUMNS}
                data={registrations}
                renderRow={(r, i) => {
                    const img = r[11] && r[11].length > 10
                        ? <img src={r[11]} className="w-8 h-8 rounded-full border" alt="" />
                        : <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs">NA</div>;
                    return (
                        <tr key={i} className="t-row">
                            <td>{img}</td>
                            <td>{r[2]}</td>
                            <td className="font-bold">{r[5]}</td>
                            <td>{r[9]}</td>
                            <td>{r[3]}</td>
                            <td>
                                <button className="btn py-1 px-3 text-xs" onClick={() => openAdmitModal(r[2], r[5])}>
                                    Admit
                                </button>
                            </td>
                        </tr>
                    );
                }}
            />

            {/* Admission Modal — Course & Batch selection */}
            <Modal isOpen={showAdmitModal} onClose={() => setShowAdmitModal(false)} title="Admission">
                {/* Student Name (read-only) */}
                <input className="inp" style={{ background: '#f3f4f6' }} value={admitForm.name} readOnly />

                {/* Course Selection */}
                <select className="inp" value={admitForm.admCourse} onChange={(e) => setAdmitForm((p) => ({ ...p, admCourse: e.target.value }))}>
                    <option value="">Select</option>
                    {(dropdowns.courses || []).map((c) => <option key={c}>{c}</option>)}
                </select>

                {/* Course Fee (read-only, can be auto-filled later) */}
                <input className="inp" placeholder="Course Fee" value={admitForm.admFees} onChange={(e) => setAdmitForm((p) => ({ ...p, admFees: e.target.value }))} />

                {/* Batch Time Selection */}
                <select className="inp" value={admitForm.admBatchTime} onChange={(e) => setAdmitForm((p) => ({ ...p, admBatchTime: e.target.value }))}>
                    <option>08-10 AM</option>
                    <option>10-12 PM</option>
                    <option>04-06 PM</option>
                </select>

                {/* Admit Button */}
                <button className="btn w-full mb-2" onClick={handleAdmit} disabled={saving}>
                    {saving ? 'Saving...' : 'Admit'}
                </button>
                <button className="w-full text-gray-500 text-sm py-2" onClick={() => setShowAdmitModal(false)}>
                    Cancel
                </button>
            </Modal>
        </div>
    );
}
