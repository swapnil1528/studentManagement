/**
 * LMSUpload — Admin LMS content upload page.
 * Upload learning materials (videos, PDFs) for courses.
 */

import { useState } from 'react';
import { saveLMSContent } from '../../services/api';
import { showToast } from '../../components/ui/Toast';

export default function LMSUpload({ adminData }) {
    const dropdowns = adminData?.dropdowns || {};
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        course: '', topic: '', type: 'Video', link: '',
    });

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleUpload = async () => {
        if (!form.course || !form.topic || !form.link) {
            alert('Please fill all fields');
            return;
        }
        setSaving(true);
        const result = await saveLMSContent(form);
        if (result?.success) {
            showToast('Content Uploaded');
            setForm({ course: '', topic: '', type: 'Video', link: '' });
        }
        setSaving(false);
    };

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">LMS Upload</h1>
            <div className="card max-w-xl">
                <select className="inp" value={form.course} onChange={(e) => handleChange('course', e.target.value)}>
                    <option value="">Select Course</option>
                    {(dropdowns.courses || []).map((c) => <option key={c}>{c}</option>)}
                </select>
                <input className="inp" placeholder="Topic" value={form.topic} onChange={(e) => handleChange('topic', e.target.value)} />
                <select className="inp" value={form.type} onChange={(e) => handleChange('type', e.target.value)}>
                    <option>Video</option>
                    <option>PDF</option>
                </select>
                <input className="inp" placeholder="Link (URL)" value={form.link} onChange={(e) => handleChange('link', e.target.value)} />
                <button className="btn w-full" onClick={handleUpload} disabled={saving}>
                    {saving ? 'Uploading...' : 'Upload'}
                </button>
            </div>
        </div>
    );
}
