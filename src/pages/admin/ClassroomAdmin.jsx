import { useState, useEffect } from 'react';
import { apiCall, saveLMSContent } from '../../services/api';
import { setLoading } from '../../components/ui/LoadingBar';
import { showToast } from '../../components/ui/Toast';
import { BookOpen, CheckCircle, FileText, Upload } from 'lucide-react';

export default function ClassroomAdmin({ adminData }) {
    const [activeTab, setActiveTab] = useState('schedule');
    const [assignments, setAssignments] = useState([]);
    const [isLoadingAsn, setIsLoadingAsn] = useState(false);
    const [grading, setGrading] = useState({}); // { id: marks }
    const [savingGrade, setSavingGrade] = useState(null); // id of saving grade

    // LMS/Schedule form
    const dropdowns = adminData?.dropdowns || {};
    const [savingLMS, setSavingLMS] = useState(false);
    const [lmsForm, setLmsForm] = useState({
        course: '', topic: '', type: 'Video', link: '', desc: ''
    });

    useEffect(() => {
        if (activeTab === 'assignments') {
            loadAllAssignments();
        }
    }, [activeTab]);

    const loadAllAssignments = async () => {
        setIsLoadingAsn(true);
        setLoading(true);
        const result = await apiCall('getAllAssignments', {});
        if (result?.success) {
            setAssignments(result.assignments || []);
        }
        setLoading(false);
        setIsLoadingAsn(false);
    };

    const handleGradeSubmit = async (asn) => {
        const grade = grading[asn.id];
        if (!grade) {
            alert('Please enter a grade first');
            return;
        }
        setSavingGrade(asn.id);
        const result = await apiCall('saveAssignmentGrade', {
            id: asn.id,
            grade: grade
        });
        setSavingGrade(null);
        if (result?.success) {
            showToast('Grade saved successfully ✅');
            loadAllAssignments(); // refresh to show updated grade
        } else {
            alert(result?.error || 'Failed to save grade');
        }
    };

    const handleLmsUpload = async () => {
        if (!lmsForm.course || !lmsForm.topic || !lmsForm.link) {
            alert('Please fill Course, Topic, and Link');
            return;
        }
        setSavingLMS(true);
        const result = await saveLMSContent(lmsForm);
        setSavingLMS(false);
        if (result?.success) {
            showToast('Material Published to Classroom ✅');
            setLmsForm({ course: '', topic: '', type: 'Video', link: '', desc: '' });
        } else {
            alert(result?.error || 'Failed to publish material');
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold flex items-center gap-3 text-indigo-900">
                    <BookOpen size={28} className="text-indigo-600" />
                    Google Classroom Dashboard
                </h1>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-gray-200 pb-2">
                <button
                    onClick={() => setActiveTab('schedule')}
                    className={`pb-2 px-4 font-bold text-lg transition-colors border-b-4 ${activeTab === 'schedule' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                    Classwork / Schedule
                </button>
                <button
                    onClick={() => setActiveTab('assignments')}
                    className={`pb-2 px-4 font-bold text-lg transition-colors border-b-4 ${activeTab === 'assignments' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                    Student Submissions
                </button>
            </div>

            {/* Schedule / Classwork Tab */}
            {activeTab === 'schedule' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Material Upload Form */}
                    <div className="card shadow-md border-t-4 border-indigo-500">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Upload size={20} className="text-indigo-500" />
                            Publish New Material
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold opacity-50 mb-1 block">Target Course *</label>
                                <select className="inp" value={lmsForm.course} onChange={(e) => setLmsForm({ ...lmsForm, course: e.target.value })}>
                                    <option value="">Select Course</option>
                                    {(dropdowns.courses || []).map((c) => <option key={c}>{c}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold opacity-50 mb-1 block">Topic / Lecture Name *</label>
                                <input className="inp" placeholder="e.g. Day 1: Introduction" value={lmsForm.topic} onChange={(e) => setLmsForm({ ...lmsForm, topic: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold opacity-50 mb-1 block">Type *</label>
                                    <select className="inp" value={lmsForm.type} onChange={(e) => setLmsForm({ ...lmsForm, type: e.target.value })}>
                                        <option>Video</option>
                                        <option>PDF</option>
                                        <option>Assignment</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold opacity-50 mb-1 block">Resource Link *</label>
                                    <input className="inp" placeholder="Drive/YouTube URL" value={lmsForm.link} onChange={(e) => setLmsForm({ ...lmsForm, link: e.target.value })} />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold opacity-50 mb-1 block">Description / Instructions</label>
                                <textarea className="inp min-h-[80px]" placeholder="Optional instructions for students..." value={lmsForm.desc} onChange={(e) => setLmsForm({ ...lmsForm, desc: e.target.value })} />
                            </div>

                            <button className="btn w-full py-3 text-lg flex justify-center items-center gap-2" onClick={handleLmsUpload} disabled={savingLMS}>
                                {savingLMS ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Publish to Students'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assignments / Submissions Tab */}
            {activeTab === 'assignments' && (
                <div className="card shadow-md">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <FileText size={20} className="text-indigo-500" />
                            Recent Student Submissions
                        </h2>
                        <button className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm font-semibold hover:bg-gray-200" onClick={loadAllAssignments}>
                            ↻ Refresh
                        </button>
                    </div>

                    {isLoadingAsn ? (
                        <div className="text-center py-12">
                            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3"></div>
                            <p className="text-gray-400">Loading submissions...</p>
                        </div>
                    ) : assignments.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                            <CheckCircle size={40} className="mx-auto text-gray-300 mb-2" />
                            <p className="text-gray-500 font-semibold">No submissions yet.</p>
                            <p className="text-xs text-gray-400 mt-1">When students submit homework, they will appear here.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {assignments.map((asn, i) => (
                                <div key={i} className="flex justify-between items-center p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition bg-white">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg">
                                            {asn.studentName ? asn.studentName[0].toUpperCase() : 'S'}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-800">{asn.fileName || 'Untitled Assignment'}</h3>
                                            <p className="text-sm font-semibold text-indigo-600">{asn.studentName} <span className="text-gray-400 font-normal">— {asn.course} • {asn.topic}</span></p>
                                            <p className="text-xs text-gray-400 mt-0.5">{asn.date}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {asn.grade ? (
                                            <span className="px-3 py-1 bg-green-50 text-green-700 font-bold rounded-lg text-sm border border-green-200">
                                                Graded: {asn.grade}
                                            </span>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    className="inp py-1.5 px-3 w-20 text-sm"
                                                    placeholder="Marks"
                                                    value={grading[asn.id] || ''}
                                                    onChange={(e) => setGrading({ ...grading, [asn.id]: e.target.value })}
                                                />
                                                <button
                                                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition"
                                                    onClick={() => handleGradeSubmit(asn)}
                                                    disabled={savingGrade === asn.id}
                                                >
                                                    {savingGrade === asn.id ? '...' : 'Save'}
                                                </button>
                                            </div>
                                        )}
                                        <a href={asn.fileUrl} target="_blank" rel="noreferrer" className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 font-semibold text-sm transition hidden sm:inline-block">
                                            View File
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
