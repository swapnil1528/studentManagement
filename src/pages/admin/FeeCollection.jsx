/**
 * FeeCollection — Admin fee collection page.
 * Search for a student, select payment mode, and record fee payment.
 */

import { useState } from 'react';
import { saveFeeCollection } from '../../services/api';
import { showToast } from '../../components/ui/Toast';

export default function FeeCollection({ adminData, onReload }) {
    const students = adminData?.activeStudents || [];
    const dropdowns = adminData?.dropdowns || {};
    const [search, setSearch] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        studId: '', name: '', course: '', mode: 'Cash', collector: '', amount: '',
    });

    // Filter students based on search input
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
            showToast('Fee Collected');
            setForm({ studId: '', name: '', course: '', mode: 'Cash', collector: '', amount: '' });
            setSearch('');
            onReload?.();
        }
        setSaving(false);
    };

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Fee Collection</h1>
            <div className="card max-w-xl mx-auto">
                {/* Student Search */}
                <input
                    className="inp"
                    placeholder="Search Student..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); }}
                />
                {showDropdown && filtered.length > 0 && (
                    <div className="bg-gray-50 border p-2 mb-2 max-h-40 overflow-y-auto rounded">
                        {filtered.map((s) => (
                            <div
                                key={s.id}
                                className="p-2 hover:bg-gray-100 cursor-pointer border-b text-sm"
                                onClick={() => selectStudent(s)}
                            >
                                {s.name} <span className="text-xs text-gray-400">({s.course})</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Student details */}
                <input className="inp bg-gray-100" value={form.name} readOnly placeholder="Student Name" />
                <input className="inp bg-gray-100" value={form.course} readOnly placeholder="Course" />

                {/* Payment details */}
                <select className="inp" value={form.mode} onChange={(e) => setForm((p) => ({ ...p, mode: e.target.value }))}>
                    <option>Cash</option>
                    <option>UPI</option>
                </select>
                <select className="inp" value={form.collector} onChange={(e) => setForm((p) => ({ ...p, collector: e.target.value }))}>
                    <option value="">Select Collector</option>
                    {(dropdowns.employees || []).map((e) => <option key={e}>{e}</option>)}
                </select>
                <input
                    className="inp"
                    type="number"
                    placeholder="Amount"
                    value={form.amount}
                    onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                />
                <button className="btn w-full" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Collect'}
                </button>
            </div>
        </div>
    );
}
