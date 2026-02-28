/**
 * ExamResults — Admin exam result entry page.
 * Search for a student, enter exam details and marks.
 */

import { useState } from 'react';
import { saveExamResult } from '../../services/api';
import { showToast } from '../../components/ui/Toast';

export default function ExamResults({ adminData }) {
    const students = adminData?.activeStudents || [];
    const [search, setSearch] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        studId: '', name: '', course: '', date: '', examName: '', marks: '', total: '',
    });

    const filtered = search.length >= 2
        ? students.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
        : [];

    const selectStudent = (s) => {
        setForm((p) => ({ ...p, studId: s.id, name: s.name, course: s.course }));
        setSearch(s.name);
        setShowDropdown(false);
    };

    const handleSave = async () => {
        if (!form.studId || !form.examName || !form.marks) {
            alert('Please fill all fields');
            return;
        }
        setSaving(true);
        const result = await saveExamResult(form);
        if (result?.success) {
            showToast('Result Saved');
            setForm({ studId: '', name: '', course: '', date: '', examName: '', marks: '', total: '' });
            setSearch('');
        }
        setSaving(false);
    };

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Exam Results</h1>
            <div className="card max-w-xl">
                {/* Student Search */}
                <input
                    className="inp"
                    placeholder="Search Student..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); }}
                />
                {showDropdown && filtered.length > 0 && (
                    <div className="bg-gray-50 border p-2 mb-2 rounded">
                        {filtered.map((s) => (
                            <div
                                key={s.id}
                                className="p-2 hover:bg-gray-100 cursor-pointer border-b text-sm"
                                onClick={() => selectStudent(s)}
                            >
                                {s.name}
                            </div>
                        ))}
                    </div>
                )}

                <input className="inp bg-gray-100" value={form.name} readOnly placeholder="Student Name" />
                <input className="inp bg-gray-100" value={form.course} readOnly placeholder="Course" />
                <input className="inp" type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
                <div className="grid grid-cols-2 gap-2">
                    <input className="inp" placeholder="Exam Name" value={form.examName} onChange={(e) => setForm((p) => ({ ...p, examName: e.target.value }))} />
                    <input className="inp" placeholder="Marks" type="number" value={form.marks} onChange={(e) => setForm((p) => ({ ...p, marks: e.target.value }))} />
                    <input className="inp" placeholder="Total" type="number" value={form.total} onChange={(e) => setForm((p) => ({ ...p, total: e.target.value }))} />
                </div>
                <button className="btn w-full" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save'}
                </button>
            </div>
        </div>
    );
}
