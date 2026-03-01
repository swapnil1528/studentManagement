/**
 * Registrations — Admin registration management page.
 * Shows registered students. "Admit" button opens Admission modal.
 * Fetches Course Master (with fees) and Batch data from a dedicated API.
 * Admission modal: name (auto), course (Course Master), fees (auto-fill),
 * discount option, batch (Batch sheet). No duplicate course per student.
 */

import { useState, useMemo, useEffect } from 'react';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import { saveCourseAdmission, getCourseFees } from '../../services/api';
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
    const admissions = adminData?.admissions || [];

    // Course Master & Batch data from dedicated API
    const [courseMasterData, setCourseMasterData] = useState([]);
    const [batchData, setBatchData] = useState([]);

    // Fetch Course Master + Batch data on component mount
    useEffect(() => {
        // First try from adminData (if backend has been redeployed with courseMaster/batches)
        if (dropdowns.courseMaster?.length > 0) {
            setCourseMasterData(dropdowns.courseMaster);
        }
        if (dropdowns.batches?.length > 0) {
            setBatchData(dropdowns.batches);
        }

        // Also fetch from dedicated API (works after Code.gs deploy)
        getCourseFees().then(result => {
            if (result?.success) {
                if (result.courses?.length > 0) {
                    setCourseMasterData(result.courses);
                }
                if (result.batches?.length > 0) {
                    setBatchData(result.batches);
                }
            }
        }).catch(() => { });
    }, [dropdowns.courseMaster, dropdowns.batches]);

    // Admission modal state
    const [showAdmitModal, setShowAdmitModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [admitForm, setAdmitForm] = useState({
        admStudId: '', name: '', admCourse: '', admFees: '', discount: 0, finalFees: '', admBatchTime: ''
    });

    // Get courses already assigned to this student (prevent duplicates)
    const studentExistingCourses = useMemo(() => {
        if (!admitForm.admStudId) return [];
        return admissions
            .filter(r => String(r[2]) === String(admitForm.admStudId))
            .map(r => String(r[7]).toLowerCase());
    }, [admitForm.admStudId, admissions]);

    // Available courses (exclude already-assigned ones)
    // Use courseMasterData if available, else fallback to dropdowns.courses
    const availableCourses = useMemo(() => {
        let courseList = courseMasterData.length > 0
            ? courseMasterData
            : (dropdowns.courses || []).map(c => ({ course: c, validity: '', fees: {} }));
        return courseList.filter(cm =>
            !studentExistingCourses.includes(cm.course.toLowerCase())
        );
    }, [courseMasterData, dropdowns.courses, studentExistingCourses]);

    // Current year for auto fee lookup
    const currentYear = new Date().getFullYear();

    // Open Admission modal
    const openAdmitModal = (studentId, studentName) => {
        setAdmitForm({
            admStudId: studentId,
            name: studentName,
            admCourse: '',
            admFees: '',
            discount: 0,
            finalFees: '',
            admBatchTime: batchData.length > 0 ? batchData[0] : '08-10 AM'
        });
        setShowAdmitModal(true);
    };

    // When course is selected, auto-fill fees from Course Master
    const handleCourseChange = (courseName) => {
        const cm = courseMasterData.find(c => c.course === courseName);
        let fee = '';
        if (cm && cm.fees) {
            // Try current year, then nearby years
            fee = cm.fees[String(currentYear)] || cm.fees[currentYear] || '';
            if (!fee) {
                // Try all years, pick the latest with a fee
                const years = Object.keys(cm.fees).sort((a, b) => Number(b) - Number(a));
                for (const y of years) {
                    if (cm.fees[y]) { fee = cm.fees[y]; break; }
                }
            }
        }
        const discount = admitForm.discount || 0;
        const numFee = Number(fee) || 0;
        const finalFees = numFee > 0 ? Math.max(0, numFee - Number(discount)) : '';
        setAdmitForm(p => ({
            ...p,
            admCourse: courseName,
            admFees: numFee > 0 ? String(numFee) : '',
            finalFees: finalFees ? String(finalFees) : ''
        }));
    };

    // When discount changes, recalculate final fees
    const handleDiscountChange = (discountVal) => {
        const disc = Number(discountVal) || 0;
        const baseFee = Number(admitForm.admFees) || 0;
        const finalFees = Math.max(0, baseFee - disc);
        setAdmitForm(p => ({ ...p, discount: disc, finalFees: String(finalFees) }));
    };

    // Handle admission
    const handleAdmit = async () => {
        if (!admitForm.admCourse) {
            alert('Please select a course');
            return;
        }
        if (!admitForm.admBatchTime) {
            alert('Please select a batch');
            return;
        }
        setSaving(true);
        const result = await saveCourseAdmission({
            ...admitForm,
            admFees: admitForm.finalFees || admitForm.admFees
        });
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

            {/* Admission Modal */}
            <Modal isOpen={showAdmitModal} onClose={() => setShowAdmitModal(false)} title="Admission">
                {/* Student Name (read-only, auto-filled) */}
                <label className="text-xs font-bold opacity-50 mb-1 block">Student Name</label>
                <input className="inp" style={{ background: '#f3f4f6' }} value={admitForm.name} readOnly />

                {/* Course Selection (from Course Master, no duplicates) */}
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

                {/* Course Fees (auto-filled from Course Master) */}
                <label className="text-xs font-bold opacity-50 mb-1 block">Course Fees (₹)</label>
                <input className="inp" style={{ background: '#f3f4f6' }} value={admitForm.admFees ? `₹${admitForm.admFees}` : ''} readOnly placeholder="Select a course to see fees" />

                {/* Discount Option */}
                <label className="text-xs font-bold opacity-50 mb-1 block">Discount (₹)</label>
                <input
                    className="inp"
                    type="number"
                    placeholder="Enter discount amount"
                    value={admitForm.discount || ''}
                    onChange={(e) => handleDiscountChange(e.target.value)}
                />

                {/* Final Fees Summary */}
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

                {/* Batch Selection (from Batch sheet) */}
                <label className="text-xs font-bold opacity-50 mb-1 block">Batch</label>
                <select className="inp" value={admitForm.admBatchTime} onChange={(e) => setAdmitForm((p) => ({ ...p, admBatchTime: e.target.value }))}>
                    {batchData.length > 0 ? (
                        batchData.map((b) => <option key={b} value={b}>{b}</option>)
                    ) : (
                        <>
                            <option>08-10 AM</option>
                            <option>10-12 PM</option>
                            <option>04-06 PM</option>
                        </>
                    )}
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
