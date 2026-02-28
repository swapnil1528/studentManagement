/**
 * Notices — Admin notice management page.
 * Publish notices for students, employees, or all users.
 */

import { useState } from 'react';
import { saveNotice } from '../../services/api';
import { showToast } from '../../components/ui/Toast';

export default function Notices() {
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        title: '', audience: 'All', expiry: '', msg: '',
    });

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handlePublish = async () => {
        if (!form.title || !form.msg) {
            alert('Please fill all fields');
            return;
        }
        setSaving(true);
        const result = await saveNotice(form);
        if (result?.success) {
            showToast('Notice Published');
            setForm({ title: '', audience: 'All', expiry: '', msg: '' });
        }
        setSaving(false);
    };

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Manage Notices</h1>
            <div className="card max-w-xl">
                <label className="block text-sm font-bold text-gray-700 mb-1">Title</label>
                <input className="inp" placeholder="e.g. Holiday Announcement" value={form.title} onChange={(e) => handleChange('title', e.target.value)} />

                <label className="block text-sm font-bold text-gray-700 mb-1">Audience</label>
                <select className="inp" value={form.audience} onChange={(e) => handleChange('audience', e.target.value)}>
                    <option value="All">All Users</option>
                    <option value="Student">Students Only</option>
                    <option value="Employee">Employees Only</option>
                </select>

                <label className="block text-sm font-bold text-gray-700 mb-1">Valid Until</label>
                <input className="inp" type="date" value={form.expiry} onChange={(e) => handleChange('expiry', e.target.value)} />

                <label className="block text-sm font-bold text-gray-700 mb-1">Message</label>
                <textarea className="inp h-32" placeholder="Type your notice here..." value={form.msg} onChange={(e) => handleChange('msg', e.target.value)} />

                <button className="btn w-full" onClick={handlePublish} disabled={saving}>
                    {saving ? 'Publishing...' : 'Publish Notice'}
                </button>
            </div>
        </div>
    );
}
