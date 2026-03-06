/**
 * FeeCollection — Admin fee collection page.
 * Search for a student, select payment mode, and record fee payment.
 */

import { useState, useRef, useMemo } from 'react';
import { saveFeeCollection } from '../../services/api';
import { showToast } from '../../components/ui/Toast';
import { useReactToPrint } from 'react-to-print';
import ReceiptTemplate from '../../components/ui/ReceiptTemplate';

export default function FeeCollection({ adminData, onReload }) {
    const students = adminData?.activeStudents || [];
    const dropdowns = adminData?.dropdowns || {};
    const [search, setSearch] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [saving, setSaving] = useState(false);
    const [successTx, setSuccessTx] = useState(null); // stores the successful transaction for printing
    const [form, setForm] = useState({
        studId: '', name: '', course: '', mode: 'Cash', collector: '', amount: '',
    });

    const receiptRef = useRef();
    const handlePrint = useReactToPrint({
        contentRef: receiptRef,
        documentTitle: `Receipt_${successTx?.id || 'Fee'}`
    });

    // Determine franchise data recursively
    const franchiseData = useMemo(() => {
        if (!successTx || !adminData?.franchises) return null;
        // Find the student's branch
        const adm = (adminData.admissions || []).find(a => String(a[2] || a[3]) === String(successTx.id));
        const branch = adm ? (adm[6] || adm[5]) : ''; // r[6] Branch
        return adminData.franchises.find(f => String(f.branch).toLowerCase() === String(branch).toLowerCase());
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

            // Store details for receipt
            setSuccessTx({
                id: form.studId,
                name: form.name,
                course: form.course,
                amount: form.amount,
                mode: form.mode,
                receiptNo: result?.receiptNo || `REC-${new Date().getTime().toString().slice(-6)}`,
                date: new Date().toLocaleDateString('en-IN')
            });

            setForm({ studId: '', name: '', course: '', mode: 'Cash', collector: '', amount: '' });
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
                <p className="text-gray-500 mb-8 text-center max-w-sm">
                    Fee of <strong className="text-gray-900">₹{successTx.amount}</strong> collected from <strong className="text-gray-900">{successTx.name}</strong>.
                </p>

                <div className="flex gap-4">
                    <button className="btn px-6 py-2.5 flex items-center gap-2" onClick={() => handlePrint()}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                        Print Receipt
                    </button>
                    <button className="px-6 py-2.5 rounded-lg font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 border" onClick={() => setSuccessTx(null)}>
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
            <div className="card max-w-xl mx-auto">
                <input
                    className="inp relative z-10"
                    placeholder="Search Student..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); }}
                />
                {showDropdown && filtered.length > 0 && (
                    <div className="bg-white border shadow-lg p-2 mb-2 max-h-40 overflow-y-auto rounded absolute z-20 w-full max-w-xl -mt-2">
                        {filtered.map((s) => (
                            <div
                                key={s.id}
                                className="p-2 hover:bg-indigo-50 cursor-pointer border-b text-sm font-medium rounded text-gray-700"
                                onClick={() => selectStudent(s)}
                            >
                                {s.name} <span className="text-xs text-indigo-500 font-bold ml-1">({s.course})</span>
                            </div>
                        ))}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <input className="inp bg-gray-50 cursor-not-allowed" value={form.name} readOnly placeholder="Student Name" />
                    <input className="inp bg-gray-50 cursor-not-allowed" value={form.course} readOnly placeholder="Course" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <select className="inp" value={form.mode} onChange={(e) => setForm((p) => ({ ...p, mode: e.target.value }))}>
                        <option>Cash</option>
                        <option>UPI</option>
                        <option>Bank Transfer</option>
                        <option>Cheque</option>
                    </select>
                    <select className="inp" value={form.collector} onChange={(e) => setForm((p) => ({ ...p, collector: e.target.value }))}>
                        <option value="">Select Collector</option>
                        {(dropdowns.employees || []).map((e) => <option key={e}>{e}</option>)}
                    </select>
                </div>

                <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-500 font-bold">₹</span>
                    <input
                        className="inp pl-8 text-lg font-bold"
                        type="number"
                        placeholder="Amount"
                        value={form.amount}
                        onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                    />
                </div>
                <button className="btn w-full py-3 text-lg mt-2" onClick={handleSave} disabled={saving}>
                    {saving ? 'Processing...' : 'Collect Fee'}
                </button>
            </div>
        </div>
    );
}
