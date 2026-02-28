/**
 * Registrations — Admin registration management page.
 * Shows registered students with photo, ID, and option to admit.
 */

import { useState } from 'react';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import { registerStudent } from '../../services/api';
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
    const [showRegModal, setShowRegModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [regForm, setRegForm] = useState({ inquiryId: '', aadhar: '', dob: '', photo: '' });

    const openRegModal = (inquiryId) => {
        setRegForm({ inquiryId, aadhar: '', dob: '', photo: '' });
        setShowRegModal(true);
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => setRegForm((p) => ({ ...p, photo: ev.target.result }));
        reader.readAsDataURL(file);
    };

    const handleRegister = async () => {
        setSaving(true);
        const result = await registerStudent(regForm);
        if (result?.success) {
            showToast('Registered Successfully');
            setShowRegModal(false);
            onReload?.();
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
                                <button className="btn py-1 px-3 text-xs" onClick={() => openRegModal(r[0])}>
                                    Admit
                                </button>
                            </td>
                        </tr>
                    );
                }}
            />

            {/* Registration Modal */}
            <Modal isOpen={showRegModal} onClose={() => setShowRegModal(false)} title="Register Student">
                <input className="inp" placeholder="Aadhar No" value={regForm.aadhar} onChange={(e) => setRegForm((p) => ({ ...p, aadhar: e.target.value }))} />
                <input className="inp" type="date" value={regForm.dob} onChange={(e) => setRegForm((p) => ({ ...p, dob: e.target.value }))} />
                <div className="mb-4">
                    <label className="text-xs font-bold text-gray-500">Student Photo</label>
                    <input className="text-sm block mt-1 w-full" type="file" accept="image/*" onChange={handlePhotoChange} />
                </div>
                <div className="flex justify-end gap-2">
                    <button className="px-4 py-2 rounded text-gray-500 font-bold hover:bg-gray-100" onClick={() => setShowRegModal(false)}>Cancel</button>
                    <button className="btn" onClick={handleRegister} disabled={saving}>{saving ? 'Saving...' : 'Confirm'}</button>
                </div>
            </Modal>
        </div>
    );
}
