/**
 * ClassroomAdmin — Full LMS Dashboard for Admins
 * Tabs: Classwork (publish + edit/delete materials), Submissions (grade), Quizzes (create), Exam Marks (results)
 */
import { useState, useEffect } from 'react';
import { apiCall, saveLMSContent, getLMSMaterials, updateLMSContent, deleteLMSContent, saveQuiz, getQuizResults } from '../../services/api';
import { setLoading } from '../../components/ui/LoadingBar';
import { showToast } from '../../components/ui/Toast';
import { BookOpen, CheckCircle, FileText, Upload, Edit2, Trash2, Plus, X, ChevronDown, ChevronUp, BarChart2, Play } from 'lucide-react';

// ─── Helper: get YouTube embed URL ───────────────────────────────────────────
function getYouTubeEmbed(url) {
    if (!url || typeof url !== 'string') return null;
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
        /youtube\.com\/embed\/([^&\n?#]+)/,
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m) return `https://www.youtube.com/embed/${m[1]}`;
    }
    return null;
}

function getDriveEmbed(url) {
    if (!url || typeof url !== 'string') return null;
    const m = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
    return null;
}

// ─── Inline Media Preview ─────────────────────────────────────────────────────
function MediaPreview({ link, type }) {
    const [open, setOpen] = useState(false);
    const ytEmbed = getYouTubeEmbed(link);
    const driveEmbed = getDriveEmbed(link);
    const embedUrl = ytEmbed || driveEmbed;
    const isVideo = type?.toLowerCase().includes('video') || !!ytEmbed || !!driveEmbed;
    const isPdf = type?.toLowerCase().includes('pdf');

    if (!embedUrl && !isPdf) return null;

    return (
        <div style={{ marginTop: 10 }}>
            <button
                onClick={() => setOpen(v => !v)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)',
                    borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
                    fontSize: 12, fontWeight: 700, color: '#7c3aed',
                }}
            >
                <Play size={13} /> {open ? 'Hide Preview' : isVideo ? 'Play Video' : 'Preview'}
                {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            {open && (
                <div style={{ marginTop: 8, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(124,58,237,0.15)' }}>
                    <iframe
                        src={embedUrl || link}
                        width="100%" height="320"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        style={{ display: 'block', border: 'none' }}
                        title="Media Preview"
                    />
                </div>
            )}
        </div>
    );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyBox({ icon, text, sub }) {
    return (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <div className="text-4xl mb-2">{icon}</div>
            <p className="text-gray-500 font-semibold">{text}</p>
            <p className="text-xs text-gray-400 mt-1">{sub}</p>
        </div>
    );
}

export default function ClassroomAdmin({ adminData }) {
    const [activeTab, setActiveTab] = useState('classwork');
    const dropdowns = adminData?.dropdowns || {};

    // ── Classwork / Materials state ──────────────────────────────────────────
    const [materials, setMaterials] = useState([]);
    const [loadingMaterials, setLoadingMaterials] = useState(false);
    const [savingLMS, setSavingLMS] = useState(false);
    const [editMaterial, setEditMaterial] = useState(null); // null or material obj
    const [showEditModal, setShowEditModal] = useState(false);
    const [lmsForm, setLmsForm] = useState({ course: '', topic: '', type: 'Video', link: '', desc: '' });

    // ── TOC state ────────────────────────────────────────────────────────────
    const [tocCourse, setTocCourse] = useState('');

    // ── Assignments state ─────────────────────────────────────────────────────
    const [assignments, setAssignments] = useState([]);
    const [isLoadingAsn, setIsLoadingAsn] = useState(false);
    const [grading, setGrading] = useState({});
    const [savingGrade, setSavingGrade] = useState(null);

    // ── Quiz creation state ───────────────────────────────────────────────────
    const [quizForm, setQuizForm] = useState({ course: '', title: '', dueDate: '' });
    const [questions, setQuestions] = useState([{ q: '', a: '', b: '', c: '', d: '', correct: 'a' }]);
    const [savingQuiz, setSavingQuiz] = useState(false);

    // ── Exam marks state ──────────────────────────────────────────────────────
    const [quizResults, setQuizResults] = useState([]);
    const [loadingResults, setLoadingResults] = useState(false);

    // Load materials when tab active
    useEffect(() => {
        if (activeTab === 'classwork') loadMaterials();
        if (activeTab === 'submissions') loadAllAssignments();
        if (activeTab === 'exammarks') loadQuizResults();
    }, [activeTab]);

    const loadMaterials = async () => {
        setLoadingMaterials(true);
        const result = await getLMSMaterials('');
        setLoadingMaterials(false);
        if (result?.success) setMaterials(result.materials || []);
    };

    const loadAllAssignments = async () => {
        setIsLoadingAsn(true);
        setLoading(true);
        const result = await apiCall('getAllAssignments', {});
        if (result?.success) setAssignments(result.assignments || []);
        setLoading(false);
        setIsLoadingAsn(false);
    };

    const loadQuizResults = async () => {
        setLoadingResults(true);
        const result = await getQuizResults();
        setLoadingResults(false);
        if (result?.success) setQuizResults(result.results || []);
    };

    // ── Publish material ──────────────────────────────────────────────────────
    const handleLmsUpload = async () => {
        if (!lmsForm.course || !lmsForm.topic || !lmsForm.link) {
            alert('Please fill Course, Topic, and Link');
            return;
        }
        setSavingLMS(true);
        const result = await saveLMSContent(lmsForm);
        setSavingLMS(false);
        if (result?.success) {
            showToast('Material Published ✅');
            setLmsForm({ course: '', topic: '', type: 'Video', link: '', desc: '' });
            loadMaterials();
        } else {
            alert(result?.error || 'Failed to publish material');
        }
    };

    // ── Delete material ───────────────────────────────────────────────────────
    const handleDeleteMaterial = async (mat) => {
        if (!confirm(`Delete "${mat.topic}"? This cannot be undone.`)) return;
        const result = await deleteLMSContent(mat.id);
        if (result?.success) { showToast('Material deleted'); loadMaterials(); }
        else alert(result?.error || 'Delete failed');
    };

    // ── Open edit modal ───────────────────────────────────────────────────────
    const openEdit = (mat) => {
        setEditMaterial({ ...mat });
        setShowEditModal(true);
    };

    const handleEditSave = async () => {
        if (!editMaterial.course || !editMaterial.topic || !editMaterial.link) {
            alert('Please fill required fields');
            return;
        }
        setSavingLMS(true);
        const result = await updateLMSContent(editMaterial.id, {
            course: editMaterial.course,
            topic: editMaterial.topic,
            type: editMaterial.type,
            link: editMaterial.link,
            desc: editMaterial.desc,
        });
        setSavingLMS(false);
        if (result?.success) {
            showToast('Material updated ✅');
            setShowEditModal(false);
            setEditMaterial(null);
            loadMaterials();
        } else {
            alert(result?.error || 'Update failed');
        }
    };

    // ── Grade submission ──────────────────────────────────────────────────────
    const handleGradeSubmit = async (asn) => {
        const grade = grading[asn.id];
        if (!grade) { alert('Please enter a grade first'); return; }
        setSavingGrade(asn.id);
        const result = await apiCall('saveAssignmentGrade', { id: asn.id, grade });
        setSavingGrade(null);
        if (result?.success) { showToast('Grade saved ✅'); loadAllAssignments(); }
        else alert(result?.error || 'Failed to save grade');
    };

    // ── Publish quiz ──────────────────────────────────────────────────────────
    const handlePublishQuiz = async () => {
        if (!quizForm.course || !quizForm.title || questions.length === 0) {
            alert('Please fill course, title, and add at least one question');
            return;
        }
        for (const [i, q] of questions.entries()) {
            if (!q.q || !q.a || !q.b) { alert(`Question ${i + 1} is incomplete`); return; }
        }
        setSavingQuiz(true);
        const totalMarks = questions.length;
        const result = await saveQuiz({
            course: quizForm.course,
            title: quizForm.title,
            dueDate: quizForm.dueDate,
            questions: questions.map(q => ({ q: q.q, options: { a: q.a, b: q.b, c: q.c, d: q.d }, correct: q.correct })),
            totalMarks,
        });
        setSavingQuiz(false);
        if (result?.success) {
            showToast('Quiz Published to Students ✅');
            setQuizForm({ course: '', title: '', dueDate: '' });
            setQuestions([{ q: '', a: '', b: '', c: '', d: '', correct: 'a' }]);
        } else {
            alert(result?.error || 'Failed to publish quiz');
        }
    };

    const addQuestion = () => setQuestions(prev => [...prev, { q: '', a: '', b: '', c: '', d: '', correct: 'a' }]);
    const updateQ = (i, field, val) => setQuestions(prev => prev.map((q, idx) => idx === i ? { ...q, [field]: val } : q));
    const removeQ = (i) => setQuestions(prev => prev.filter((_, idx) => idx !== i));

    // ── TOC filtered materials ────────────────────────────────────────────────
    const tocCourses = [...new Set(materials.map(m => m.course))];
    const filteredMaterials = tocCourse ? materials.filter(m => m.course === tocCourse) : materials;

    const TABS = [
        { id: 'classwork', label: '📚 Classwork', desc: 'Publish & manage materials' },
        { id: 'submissions', label: '📤 Submissions', desc: 'Grade student work' },
        { id: 'quizzes', label: '📝 Quizzes', desc: 'Create exams & quizzes' },
        { id: 'exammarks', label: '🏆 Exam Marks', desc: 'View student results' },
    ];

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold flex items-center gap-3 text-indigo-900">
                    <BookOpen size={28} className="text-indigo-600" />
                    LMS Dashboard
                </h1>
            </div>

            {/* Tab Bar */}
            <div className="flex gap-2 mb-6 flex-wrap">
                {TABS.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === t.id
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                            : 'bg-white text-gray-500 border border-gray-200 hover:border-indigo-300 hover:text-indigo-600'}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── CLASSWORK TAB ── */}
            {activeTab === 'classwork' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* TOC Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="card shadow-sm border-t-4 border-indigo-400 sticky top-4">
                            <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wider mb-3">📋 Table of Contents</h3>
                            <button
                                onClick={() => setTocCourse('')}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold mb-1 transition ${!tocCourse ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100 text-gray-600'}`}
                            >
                                All Courses
                            </button>
                            {tocCourses.map(c => (
                                <button
                                    key={c}
                                    onClick={() => setTocCourse(c)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold mb-1 transition ${tocCourse === c ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100 text-gray-600'}`}
                                >
                                    {c}
                                    <span className="float-right text-xs opacity-60">{materials.filter(m => m.course === c).length}</span>
                                </button>
                            ))}
                            {tocCourses.length === 0 && <p className="text-xs text-gray-400 italic">No materials yet</p>}
                        </div>
                    </div>

                    {/* Main Area */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Publish Form */}
                        <div className="card shadow-md border-t-4 border-indigo-500">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <Upload size={20} className="text-indigo-500" />
                                Publish New Material
                            </h2>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold opacity-50 mb-1 block">Course *</label>
                                        <select className="inp" value={lmsForm.course} onChange={e => setLmsForm({ ...lmsForm, course: e.target.value })}>
                                            <option value="">Select Course</option>
                                            {(dropdowns.courses || []).map(c => <option key={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold opacity-50 mb-1 block">Type *</label>
                                        <select className="inp" value={lmsForm.type} onChange={e => setLmsForm({ ...lmsForm, type: e.target.value })}>
                                            <option>Video</option>
                                            <option>PDF</option>
                                            <option>Assignment</option>
                                            <option>Notes</option>
                                            <option>Live Class</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold opacity-50 mb-1 block">Topic / Lecture Name *</label>
                                    <input className="inp" placeholder="e.g. Day 1: Introduction to Python" value={lmsForm.topic} onChange={e => setLmsForm({ ...lmsForm, topic: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold opacity-50 mb-1 block">Resource Link *</label>
                                    <input className="inp" placeholder="YouTube / Google Drive / Any URL" value={lmsForm.link} onChange={e => setLmsForm({ ...lmsForm, link: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold opacity-50 mb-1 block">Description / Instructions</label>
                                    <textarea className="inp min-h-[70px]" placeholder="Optional instructions..." value={lmsForm.desc} onChange={e => setLmsForm({ ...lmsForm, desc: e.target.value })} />
                                </div>
                                <button className="btn w-full py-3 text-lg flex justify-center items-center gap-2" onClick={handleLmsUpload} disabled={savingLMS}>
                                    {savingLMS ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '🚀 Publish to Students'}
                                </button>
                            </div>
                        </div>

                        {/* Published Materials List */}
                        <div className="card shadow-md">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <FileText size={20} className="text-indigo-500" />
                                    Published Materials
                                    {tocCourse && <span className="text-sm font-normal text-indigo-400 ml-2">— {tocCourse}</span>}
                                </h2>
                                <button className="text-xs px-3 py-1.5 bg-gray-100 rounded-lg font-semibold hover:bg-gray-200" onClick={loadMaterials}>↻ Refresh</button>
                            </div>
                            {loadingMaterials ? (
                                <div className="text-center py-10"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" /></div>
                            ) : filteredMaterials.length === 0 ? (
                                <EmptyBox icon="📚" text="No materials published yet" sub="Use the form above to publish content to students." />
                            ) : (
                                <div className="space-y-3">
                                    {filteredMaterials.map(mat => (
                                        <div key={mat.id} className="rounded-xl border border-gray-100 p-4 bg-white shadow-sm">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-start gap-3 flex-1">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-xl flex-shrink-0">
                                                        {mat.type?.toLowerCase().includes('video') ? '🎬' : mat.type?.toLowerCase().includes('pdf') ? '📕' : mat.type?.toLowerCase().includes('assignment') ? '📝' : '📌'}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-bold text-gray-800 truncate">{mat.topic}</div>
                                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                            <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full">{mat.course}</span>
                                                            <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">{mat.type}</span>
                                                            {mat.date && <span className="text-xs text-gray-400">{new Date(mat.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
                                                        </div>
                                                        {mat.desc && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{mat.desc}</p>}
                                                        <MediaPreview link={mat.link} type={mat.type} />
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 flex-shrink-0">
                                                    <button
                                                        onClick={() => openEdit(mat)}
                                                        className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                                                        title="Edit"
                                                    >
                                                        <Edit2 size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteMaterial(mat)}
                                                        className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── SUBMISSIONS TAB ── */}
            {activeTab === 'submissions' && (
                <div className="card shadow-md">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <FileText size={20} className="text-indigo-500" />
                            Student Submissions
                        </h2>
                        <button className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm font-semibold hover:bg-gray-200" onClick={loadAllAssignments}>↻ Refresh</button>
                    </div>
                    {isLoadingAsn ? (
                        <div className="text-center py-12"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" /></div>
                    ) : assignments.length === 0 ? (
                        <EmptyBox icon="📂" text="No submissions yet" sub="When students submit homework, they will appear here." />
                    ) : (
                        <div className="space-y-4">
                            {assignments.map((asn, i) => (
                                <div key={i} className="flex justify-between items-center p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition bg-white">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg">
                                            {asn.studentName ? asn.studentName[0].toUpperCase() : 'S'}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-800">{asn.fileName || 'Untitled'}</h3>
                                            <p className="text-sm font-semibold text-indigo-600">{asn.studentName} <span className="text-gray-400 font-normal">— {asn.course} • {asn.topic}</span></p>
                                            <p className="text-xs text-gray-400 mt-0.5">{asn.date}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {asn.grade ? (
                                            <span className="px-3 py-1 bg-green-50 text-green-700 font-bold rounded-lg text-sm border border-green-200">Graded: {asn.grade}</span>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    className="inp py-1.5 px-3 w-20 text-sm"
                                                    placeholder="Marks"
                                                    value={grading[asn.id] || ''}
                                                    onChange={e => setGrading({ ...grading, [asn.id]: e.target.value })}
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

            {/* ── QUIZZES TAB ── */}
            {activeTab === 'quizzes' && (
                <div className="card shadow-md">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <CheckCircle size={20} className="text-indigo-500" />
                        Create Quiz / Exam
                    </h2>
                    <div className="space-y-5 max-w-2xl">
                        {/* Quiz Meta */}
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="text-xs font-bold opacity-50 mb-1 block">Course *</label>
                                <select className="inp" value={quizForm.course} onChange={e => setQuizForm({ ...quizForm, course: e.target.value })}>
                                    <option value="">Select Course</option>
                                    {(dropdowns.courses || []).map(c => <option key={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold opacity-50 mb-1 block">Quiz Title *</label>
                                <input className="inp" placeholder="e.g. Unit 1 Test" value={quizForm.title} onChange={e => setQuizForm({ ...quizForm, title: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs font-bold opacity-50 mb-1 block">Due Date</label>
                                <input className="inp" type="date" value={quizForm.dueDate} onChange={e => setQuizForm({ ...quizForm, dueDate: e.target.value })} />
                            </div>
                        </div>

                        {/* Questions */}
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <label className="text-sm font-bold text-gray-700">Questions ({questions.length})</label>
                                <button
                                    onClick={addQuestion}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 transition"
                                >
                                    <Plus size={13} /> Add Question
                                </button>
                            </div>
                            <div className="space-y-4">
                                {questions.map((q, i) => (
                                    <div key={i} className="rounded-xl border border-gray-200 p-4 bg-gray-50 relative">
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Q{i + 1}</span>
                                            {questions.length > 1 && (
                                                <button onClick={() => removeQ(i)} className="text-red-400 hover:text-red-600 transition">
                                                    <X size={16} />
                                                </button>
                                            )}
                                        </div>
                                        <input
                                            className="inp mb-3"
                                            placeholder="Question text *"
                                            value={q.q}
                                            onChange={e => updateQ(i, 'q', e.target.value)}
                                        />
                                        <div className="grid grid-cols-2 gap-3">
                                            {['a', 'b', 'c', 'd'].map(opt => (
                                                <div key={opt} className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-gray-500 w-4 uppercase">{opt}</span>
                                                    <input
                                                        className="inp flex-1"
                                                        placeholder={`Option ${opt.toUpperCase()}${opt === 'a' || opt === 'b' ? ' *' : ''}`}
                                                        value={q[opt]}
                                                        onChange={e => updateQ(i, opt, e.target.value)}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-3 flex items-center gap-2">
                                            <label className="text-xs font-bold text-gray-500">Correct Answer:</label>
                                            {['a', 'b', 'c', 'd'].map(opt => (
                                                <label key={opt} className={`flex items-center gap-1 cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold transition ${q.correct === opt ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
                                                    <input type="radio" name={`correct-${i}`} value={opt} checked={q.correct === opt} onChange={() => updateQ(i, 'correct', opt)} className="sr-only" />
                                                    {opt.toUpperCase()}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            className="btn w-full py-3 text-lg flex justify-center items-center gap-2"
                            onClick={handlePublishQuiz}
                            disabled={savingQuiz}
                        >
                            {savingQuiz
                                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                : `🚀 Publish Quiz (${questions.length} Questions)`}
                        </button>
                    </div>
                </div>
            )}

            {/* ── EXAM MARKS TAB ── */}
            {activeTab === 'exammarks' && (
                <div className="card shadow-md">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <BarChart2 size={20} className="text-indigo-500" />
                            Exam / Quiz Results
                        </h2>
                        <button className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm font-semibold hover:bg-gray-200" onClick={loadQuizResults}>↻ Refresh</button>
                    </div>
                    {loadingResults ? (
                        <div className="text-center py-12"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" /></div>
                    ) : quizResults.length === 0 ? (
                        <EmptyBox icon="🏆" text="No quiz results yet" sub="Student scores will appear here after they take a quiz." />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-xs font-bold text-gray-400 uppercase border-b border-gray-100">
                                        <th className="pb-3 text-left pl-2">Student</th>
                                        <th className="pb-3 text-left">Quiz</th>
                                        <th className="pb-3 text-left">Course</th>
                                        <th className="pb-3 text-center">Score</th>
                                        <th className="pb-3 text-center">%ile</th>
                                        <th className="pb-3 text-left">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {quizResults.map((r, i) => {
                                        const pct = Number(r.percentage) || 0;
                                        const passed = pct >= 40;
                                        return (
                                            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition">
                                                <td className="py-3 pl-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                                                            {r.studentName ? r.studentName[0].toUpperCase() : 'S'}
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-gray-800">{r.studentName}</div>
                                                            <div className="text-xs text-gray-400">{r.studentId}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 font-semibold text-gray-700">{r.quizTitle}</td>
                                                <td className="py-3">
                                                    <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold">{r.course}</span>
                                                </td>
                                                <td className="py-3 text-center font-bold text-gray-800">{r.score}/{r.total}</td>
                                                <td className="py-3 text-center">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                                        {pct}%
                                                    </span>
                                                </td>
                                                <td className="py-3 text-xs text-gray-400">{r.date ? new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ── EDIT MODAL ── */}
            {showEditModal && editMaterial && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => { if (e.target === e.currentTarget) setShowEditModal(false); }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-xl font-bold flex items-center gap-2"><Edit2 size={18} className="text-indigo-500" /> Edit Material</h3>
                            <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold opacity-50 mb-1 block">Course *</label>
                                    <select className="inp" value={editMaterial.course} onChange={e => setEditMaterial({ ...editMaterial, course: e.target.value })}>
                                        <option value="">Select Course</option>
                                        {(dropdowns.courses || []).map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold opacity-50 mb-1 block">Type</label>
                                    <select className="inp" value={editMaterial.type} onChange={e => setEditMaterial({ ...editMaterial, type: e.target.value })}>
                                        <option>Video</option><option>PDF</option><option>Assignment</option><option>Notes</option><option>Live Class</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold opacity-50 mb-1 block">Topic *</label>
                                <input className="inp" value={editMaterial.topic} onChange={e => setEditMaterial({ ...editMaterial, topic: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs font-bold opacity-50 mb-1 block">Link *</label>
                                <input className="inp" value={editMaterial.link} onChange={e => setEditMaterial({ ...editMaterial, link: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs font-bold opacity-50 mb-1 block">Description</label>
                                <textarea className="inp min-h-[70px]" value={editMaterial.desc || ''} onChange={e => setEditMaterial({ ...editMaterial, desc: e.target.value })} />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button className="btn flex-1 py-3" onClick={handleEditSave} disabled={savingLMS}>
                                    {savingLMS ? '⏳ Saving...' : '✅ Save Changes'}
                                </button>
                                <button className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50" onClick={() => setShowEditModal(false)}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
