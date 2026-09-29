/**
 * FeeCollection - Admin fee collection page.
 * Search for a student, select payment mode, set due date, and record fee payment.
 */

import { useState, useRef, useMemo } from 'react';
import { saveFeeCollection } from '../../services/api';
import { showToast } from '../../components/ui/Toast';
import { useReactToPrint } from 'react-to-print';
import ReceiptTemplate from '../../components/ui/ReceiptTemplate';
import { Calendar, CreditCard, UserCheck, DollarSign } from 'lucide-react';

export default function FeeCollection({ adminData, onReload }) {
    const students = adminData?.activeStudents || [];
    const dropdowns = adminData?.dropdowns || {};
    const [search, setSearch] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [saving, setSaving] = useState(false);
    const [successTx, setSuccessTx] = useState(null);

    const defaultNextDue = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    const [form, setForm] = useState({
        studId: '',
        name: '',
        course: '',
        mode: 'Cash',
        collector: '',
        amount: '',
        dueDate: defaultNextDue
    });

    const receiptRef = useRef();
    const handlePrint = useReactToPrint({
        contentRef: receiptRef,
        documentTitle: `Receipt_${successTx?.id || 'Fee'}`
    });

    const franchiseData = useMemo(() => {
        if (!successTx || !adminData?.franchises || adminData.franchises.length === 0) return null;
        const adm = (adminData.admissions || []).find(a => String(a[2] || a[3]) === String(successTx.id));
        const branch = adm ? (adm[6] || adm[5]) : '';
        const match = adminData.franchises.find(f => String(f.branch).toLowerCase() === String(branch).toLowerCase());
        return match || adminData.franchises[0];
    }, [successTx, adminData]);

    const filtered = search.length >= 2
        ? students.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
        : [];

    const selectStudent = (s) => {
        setForm((p) => ({ ...p, studId: s.id, name: s.name, course: s.course }));
        setSearch(s.name);
        setShowDropdown(false);
    };

    const handleSave = async () => {
        if (!form.studId || !form.amount) {
            alert('Please select a student and enter amount');
            return;
        }
        setSaving(true);
        const result = await saveFeeCollection(form);
        if (result?.success) {
            showToast('Fee Collected Successfully!');

            setSuccessTx({
                id: form.studId,
                name: form.name,
                course: form.course,
                amount: form.amount,
                mode: form.mode,
                dueDate: form.dueDate,
                receiptNo: result?.receiptNo || `REC-${new Date().getTime().toString().slice(-6)}`,
                date: new Date().toLocaleDateString('en-IN')
            });

            setForm({
                studId: '',
                name: '',
                course: '',
                mode: 'Cash',
                collector: '',
                amount: '',
                dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
            });
            setSearch('');
            onReload?.();
        } else {
            alert(result?.error || 'Failed to collect fee');
        }
        setSaving(false);
    };

    if (successTx) {
        return (
            <div className="flex flex-col items-center justify-center p-8 mt-10">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-sm border border-green-200 text-3xl">✅</div>
                <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
                <p className="text-gray-500 mb-4 text-center max-w-sm">
                    Fee of <strong className="text-gray-900">₹{successTx.amount}</strong> collected from <strong className="text-gray-900">{successTx.name}</strong>.
                </p>
                {successTx.dueDate && (
                    <div className="mb-6 px-4 py-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-sm font-semibold flex items-center gap-2">
                        <Calendar size={16} />
                        <span>Next Fee Due Date: {successTx.dueDate}</span>
                    </div>
                )}

                <div className="flex gap-4">
                    <button className="btn px-6 py-2.5 flex items-center gap-2" onClick={() => handlePrint()}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                        Print Receipt
                    </button>
                    <button className="px-6 py-2.5 rounded-lg font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 border cursor-pointer" onClick={() => setSuccessTx(null)}>
                        Collect Another Fee
                    </button>
                </div>

                <div style={{ display: 'none' }}>
                    <ReceiptTemplate ref={receiptRef} transaction={successTx} franchiseData={franchiseData} />
                </div>
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Fee Collection</h1>
            <div className="card max-w-xl mx-auto space-y-4">
                <div className="relative">
                    <label className="text-xs font-bold text-gray-600 mb-1 block">Search & Select Student *</label>
                    <input
                        className="inp w-full"
                        placeholder="Type student name or ID..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); }}
                    />
                    {showDropdown && filtered.length > 0 && (
                        <div className="bg-white border shadow-lg p-2 mb-2 max-h-40 overflow-y-auto rounded absolute z-20 w-full max-w-xl left-0 top-full">
                            {filtered.map((s) => (
                                <div
                                    key={s.id}
                                    className="p-2 hover:bg-indigo-50 cursor-pointer border-b text-sm font-medium rounded text-gray-700 flex justify-between items-center"
                                    onClick={() => selectStudent(s)}
                                >
                                    <span>{s.name}</span>
                                    <span className="text-xs text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">{s.course}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-gray-600 mb-1 block">Student Name</label>
                        <input className="inp bg-gray-50 cursor-not-allowed w-full" value={form.name} readOnly placeholder="Student Name" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-600 mb-1 block">Enrolled Course</label>
                        <input className="inp bg-gray-50 cursor-not-allowed w-full" value={form.course} readOnly placeholder="Course" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-gray-600 mb-1 block">Payment Mode</label>
                        <select className="inp w-full" value={form.mode} onChange={(e) => setForm((p) => ({ ...p, mode: e.target.value }))}>
                            <option value="Cash">Cash</option>
                            <option value="UPI">UPI / QR</option>
                            <option value="Bank Transfer">Bank Transfer / NEFT</option>
                            <option value="Cheque">Cheque</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-600 mb-1 block">Collected By</label>
                        <select className="inp w-full" value={form.collector} onChange={(e) => setForm((p) => ({ ...p, collector: e.target.value }))}>
                            <option value="">Select Collector</option>
                            {(dropdowns.employees || []).map((e) => <option key={e} value={e}>{e}</option>)}
                        </select>
                    </div>
                </div>

                {/* NEXT FEE DUE DATE INPUT */}
                <div>
                    <label className="text-xs font-bold text-amber-700 mb-1 flex items-center gap-1">
                        <Calendar size={14} />
                        <span>Next Fee Due Date *</span>
                    </label>
                    <input
                        className="inp w-full border-amber-300 focus:border-amber-500 font-semibold"
                        type="date"
                        value={form.dueDate || ''}
                        onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
                    />
                </div>

                {/* AMOUNT INPUT */}
                <div className="relative">
                    <label className="text-xs font-bold text-gray-600 mb-1 block">Paid Amount (₹) *</label>
                    <div className="relative">
                        <span className="absolute left-3 top-3 text-gray-500 font-bold">₹</span>
                        <input
                            className="inp pl-8 text-lg font-bold w-full"
                            type="number"
                            placeholder="Enter Amount (e.g. 2000)"
                            value={form.amount}
                            onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                        />
                    </div>
                </div>

                <button className="btn w-full py-3 text-lg mt-2 font-bold cursor-pointer" onClick={handleSave} disabled={saving}>
                    {saving ? 'Processing Collection...' : 'Collect Fee & Save Due Date'}
                </button>
            </div>
        </div>
    );
}
