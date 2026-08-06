/**
 * ClassroomAdmin — Full LMS Dashboard for Admins
 * Tabs: Classwork (publish + edit/delete materials), Submissions (grade), Quizzes (create), Exam Marks (results)
 */
import { useState, useEffect, useRef } from 'react';
import { apiCall, saveLMSContent, getLMSMaterials, updateLMSContent, deleteLMSContent, saveQuiz, getQuizzes, deleteQuiz, getQuizResults, getCourseSessions, saveCourseSessions } from '../../services/api';
import { setLoading } from '../../components/ui/LoadingBar';
import { showToast } from '../../components/ui/Toast';
import { exportCsv, exportPdf } from '../../utils/exportUtils';
import { BookOpen, CheckCircle, FileText, Upload, Edit2, Trash2, Plus, X, ChevronDown, ChevronUp, BarChart2, Play, Download, FileSpreadsheet, Printer, Clock } from 'lucide-react';

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

const CLASSROOM_TABS = ['classwork', 'submissions', 'quizzes', 'articulate', 'exammarks', 'testhistory'];

export default function ClassroomAdmin({ adminData }) {
    const getInitialTab = () => {
        const hash = (window.location.hash || '').replace('#', '').trim().toLowerCase();
        return CLASSROOM_TABS.includes(hash) ? hash : 'classwork';
    };

    const [activeTab, setActiveTabState] = useState(getInitialTab);

    const setActiveTab = (tab) => {
        setActiveTabState(tab);
        window.history.replaceState(null, '', `#${tab}`);
    };

    useEffect(() => {
        const handleHashChange = () => {
            const hash = (window.location.hash || '').replace('#', '').trim().toLowerCase();
            if (CLASSROOM_TABS.includes(hash)) {
                setActiveTabState(hash);
            }
        };
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

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

    // ── Quiz creation & history state ─────────────────────────────────────────
    const [quizForm, setQuizForm] = useState({ course: '', title: '', dueDate: '', timeLimit: '15', shuffleQuestions: true, shuffleOptions: true });
    const [questions, setQuestions] = useState([{ q: '', a: '', b: '', c: '', d: '', type: 'single', correct: 'a', translations: { hi: { q: '', options: { a: '', b: '', c: '', d: '' } }, mr: { q: '', options: { a: '', b: '', c: '', d: '' } } } }]);
    const [qActiveLang, setQActiveLang] = useState({});
    const [savingQuiz, setSavingQuiz] = useState(false);
    const [translatingQ, setTranslatingQ] = useState(null); // index of question currently auto-translating
    const [bulkProgress, setBulkProgress] = useState(null); // { current: 1, total: 20 } progress tracking
    const [publishedQuizzes, setPublishedQuizzes] = useState([]);
    const [loadingQuizzes, setLoadingQuizzes] = useState(false);
    const [editingQuizId, setEditingQuizId] = useState(null);
    const quizFormRef = useRef(null);

    // ── Articulate Course Builder State ──
    const [articulateCourse, setArticulateCourse] = useState('MS-CIT');
    const [adminSessions, setAdminSessions] = useState([
        {
            id: 'session-1',
            title: 'Session #01 MS-CIT (Basic Computer, SmartPhone and Typing Skills)',
            topics: [
                { id: 's1-t1', title: 'MS-CIT Introduction & Basic Computer Overview', type: 'video', url: 'https://www.w3schools.com/html/mov_bbb.mp4', duration: '04:55' },
                { id: 's1-t2', title: 'Understanding Self-Learning & Digital Skills', type: 'video', url: 'https://www.w3schools.com/html/mov_bbb.mp4', duration: '06:20' },
                { id: 's1-t3', title: 'Session #01 Knowledge Check Quiz', type: 'quiz', questions: [{ q: 'Which of the following is an input device used for technical drawings?', options: { a: 'Plotter', b: 'Printer', c: 'Speaker', d: 'Monitor' }, correct: 'a' }] },
                { id: 's1-t4', title: 'Session #01 Practical Assignment', type: 'assignment', instruction: 'Upload a Word Document summarizing today\'s session.' }
            ]
        }
    ]);
    const [savingSessions, setSavingSessions] = useState(false);
    const [loadingSessions, setLoadingSessions] = useState(false);

    const fetchAdminSessions = async (courseName) => {
        if (!courseName) return;
        setLoadingSessions(true);
        try {
            const res = await getCourseSessions(courseName);
            if (res?.success && Array.isArray(res.sessions) && res.sessions.length > 0) {
                setAdminSessions(res.sessions);
            }
        } catch (e) {
            console.error('Error fetching admin sessions:', e);
        } finally {
            setLoadingSessions(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'articulate') {
            fetchAdminSessions(articulateCourse);
        }
    }, [activeTab, articulateCourse]);

    const handleSaveAdminSessions = async () => {
        if (!articulateCourse) {
            alert('Please select or enter a course name');
            return;
        }
        setSavingSessions(true);
        try {
            const res = await saveCourseSessions(articulateCourse, adminSessions);
            if (res?.success) {
                showToast(`Course Sessions for "${articulateCourse}" saved & published successfully! 🎉`);
            } else {
                alert(res?.error || 'Failed to save sessions');
            }
        } catch (e) {
            alert('Error saving sessions: ' + e.message);
        } finally {
            setSavingSessions(false);
        }
    };

    const handleAddSession = () => {
        const nextNum = adminSessions.length + 1;
        const sNum = String(nextNum).padStart(2, '0');
        const newSession = {
            id: `session-${Date.now()}`,
            title: `Session #${sNum} ${articulateCourse} (New Learning Module)`,
            topics: [
                { id: `s${nextNum}-t1`, title: `Topic 1: Introduction`, type: 'video', url: 'https://www.w3schools.com/html/mov_bbb.mp4', duration: '05:00' },
                { id: `s${nextNum}-t2`, title: `Topic 2: Knowledge Check Quiz`, type: 'quiz', questions: [{ q: 'Sample Question?', options: { a: 'Option A', b: 'Option B', c: 'Option C', d: 'Option D' }, correct: 'a' }] }
            ]
        };
        setAdminSessions([...adminSessions, newSession]);
    };

    const handleDeleteSession = (sIdx) => {
        if (window.confirm(`Delete Session #${sIdx + 1}?`)) {
            setAdminSessions(adminSessions.filter((_, idx) => idx !== sIdx));
        }
    };

    const handleAddTopic = (sIdx) => {
        const updated = [...adminSessions];
        if (!updated[sIdx].topics) updated[sIdx].topics = [];
        const nextTNum = updated[sIdx].topics.length + 1;
        updated[sIdx].topics.push({
            id: `s${sIdx + 1}-t${Date.now()}`,
            title: `New Topic ${nextTNum}`,
            type: 'video',
            url: '',
            duration: '05:00'
        });
        setAdminSessions(updated);
    };

    const handleDeleteTopic = (sIdx, tIdx) => {
        const updated = [...adminSessions];
        updated[sIdx].topics = updated[sIdx].topics.filter((_, idx) => idx !== tIdx);
        setAdminSessions(updated);
    };

    const handleUpdateTopic = (sIdx, tIdx, field, val) => {
        const updated = [...adminSessions];
        updated[sIdx].topics[tIdx][field] = val;
        setAdminSessions(updated);
    };

    // ── Exam marks & Test history state ──────────────────────────────────────
    const [quizResults, setQuizResults] = useState([]);
    const [loadingResults, setLoadingResults] = useState(false);
    const [thSearch, setThSearch] = useState('');
    const [thCourseFilter, setThCourseFilter] = useState('');
    const [thQuizFilter, setThQuizFilter] = useState('');
    const [thFromDate, setThFromDate] = useState('');
    const [thToDate, setThToDate] = useState('');
    const [thViewMode, setThViewMode] = useState('all'); // 'all' | 'testwise' | 'studentwise'
    const [selectedTestDetail, setSelectedTestDetail] = useState(null); // quizTitle drill-down
    const [selectedStudentDetail, setSelectedStudentDetail] = useState(null); // studentId drill-down
    const [thAnalysisModal, setThAnalysisModal] = useState(null);

    // Load materials when tab active
    useEffect(() => {
        if (activeTab === 'classwork') loadMaterials();
        if (activeTab === 'submissions') loadAllAssignments();
        if (activeTab === 'quizzes') loadPublishedQuizzes();
        if (activeTab === 'exammarks') loadQuizResults();
        if (activeTab === 'testhistory') { loadQuizResults(); loadPublishedQuizzes(); }
    }, [activeTab]);

    const loadPublishedQuizzes = async () => {
        setLoadingQuizzes(true);
        const result = await getQuizzes([]);
        setLoadingQuizzes(false);
        if (result?.success) setPublishedQuizzes(result.quizzes || []);
    };

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

    // ── Publish / Edit quiz ───────────────────────────────────────────────────
    const handlePublishQuiz = async () => {
        if (!quizForm.course || !quizForm.title || questions.length === 0) {
            alert('Please fill course, title, and add at least one question');
            return;
        }
        for (const [i, q] of questions.entries()) {
            if (!q.q || !q.a || !q.b) { alert(`Question ${i + 1} is incomplete in English`); return; }
        }
        setSavingQuiz(true);
        const totalMarks = questions.length;
        const result = await saveQuiz({
            id: editingQuizId || undefined,
            course: quizForm.course,
            title: quizForm.title,
            dueDate: quizForm.dueDate,
            timeLimit: Number(quizForm.timeLimit) || 0,
            shuffleQuestions: quizForm.shuffleQuestions !== false,
            shuffleOptions: quizForm.shuffleOptions !== false,
            questions: questions.map(q => {
                const cleanTranslations = {};
                if (q.translations) {
                    Object.keys(q.translations).forEach(l => {
                        const tr = q.translations[l];
                        if (tr && (tr.q || tr.options?.a || tr.options?.b)) {
                            cleanTranslations[l] = {
                                q: tr.q || '',
                                options: {
                                    a: tr.options?.a || '',
                                    b: tr.options?.b || '',
                                    c: tr.options?.c || '',
                                    d: tr.options?.d || '',
                                }
                            };
                        }
                    });
                }
                return {
                    q: q.q,
                    type: q.type || 'single',
                    options: { a: q.a, b: q.b, c: q.c, d: q.d },
                    correct: q.correct,
                    translations: cleanTranslations,
                };
            }),
            totalMarks,
        });
        setSavingQuiz(false);
        if (result?.success) {
            showToast(editingQuizId ? 'Quiz Updated Successfully! ✅' : 'Quiz Published to Students ✅');
            setEditingQuizId(null);
            setQuizForm({ course: '', title: '', dueDate: '', timeLimit: '15', shuffleQuestions: true, shuffleOptions: true });
            setQuestions([{ q: '', a: '', b: '', c: '', d: '', type: 'single', correct: 'a', translations: { hi: { q: '', options: { a: '', b: '', c: '', d: '' } }, mr: { q: '', options: { a: '', b: '', c: '', d: '' } } } }]);
            setQActiveLang({});
            loadPublishedQuizzes();
        } else {
            alert(result?.error || 'Failed to save quiz');
        }
    };

    const handleEditQuiz = (qz) => {
        setEditingQuizId(qz.id);
        setQuizForm({
            course: qz.course || '',
            title: qz.title || '',
            dueDate: qz.dueDate || '',
            timeLimit: String(qz.timeLimit ?? 15),
            shuffleQuestions: qz.shuffleQuestions !== false,
            shuffleOptions: qz.shuffleOptions !== false,
        });
        if (Array.isArray(qz.questions) && qz.questions.length > 0) {
            setQuestions(qz.questions.map(q => ({
                q: q.q || '',
                a: q.options?.a || '',
                b: q.options?.b || '',
                c: q.options?.c || '',
                d: q.options?.d || '',
                type: q.type || (String(q.correct || '').includes(',') ? 'multiple' : 'single'),
                correct: q.correct || 'a',
                translations: q.translations || {
                    hi: { q: '', options: { a: '', b: '', c: '', d: '' } },
                    mr: { q: '', options: { a: '', b: '', c: '', d: '' } }
                }
            })));
        } else {
            setQuestions([{ q: '', a: '', b: '', c: '', d: '', type: 'single', correct: 'a', translations: { hi: { q: '', options: { a: '', b: '', c: '', d: '' } }, mr: { q: '', options: { a: '', b: '', c: '', d: '' } } } }]);
        }
        showToast(`Editing Quiz: ${qz.title}`);
        quizFormRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingQuizId(null);
        setQuizForm({ course: '', title: '', dueDate: '', timeLimit: '15', shuffleQuestions: true, shuffleOptions: true });
        setQuestions([{ q: '', a: '', b: '', c: '', d: '', type: 'single', correct: 'a', translations: { hi: { q: '', options: { a: '', b: '', c: '', d: '' } }, mr: { q: '', options: { a: '', b: '', c: '', d: '' } } } }]);
        setQActiveLang({});
    };

    const handleDeleteQuiz = async (qz) => {
        if (!confirm(`Are you sure you want to delete quiz "${qz.title}"?`)) return;
        setLoadingQuizzes(true);
        const res = await deleteQuiz(qz.id);
        setLoadingQuizzes(false);
        if (res?.success) {
            showToast('Quiz deleted 🗑️');
            loadPublishedQuizzes();
        } else {
            alert(res?.error || 'Failed to delete quiz');
        }
    };

    const addQuestion = () => setQuestions(prev => [...prev, { q: '', a: '', b: '', c: '', d: '', type: 'single', correct: 'a', translations: { hi: { q: '', options: { a: '', b: '', c: '', d: '' } }, mr: { q: '', options: { a: '', b: '', c: '', d: '' } } } }]);
    const updateQ = (i, field, val) => setQuestions(prev => prev.map((q, idx) => idx === i ? { ...q, [field]: val } : q));
    const updateQTranslation = (i, lang, field, val) => {
        setQuestions(prev => prev.map((q, idx) => {
            if (idx !== i) return q;
            const currentTrans = q.translations || {};
            const langObj = currentTrans[lang] || { q: '', options: { a: '', b: '', c: '', d: '' } };
            let updatedLangObj;
            if (field === 'q') {
                updatedLangObj = { ...langObj, q: val };
            } else {
                updatedLangObj = { ...langObj, options: { ...(langObj.options || {}), [field]: val } };
            }
            return { ...q, translations: { ...currentTrans, [lang]: updatedLangObj } };
        }));
    };

    // Academic & Technical Glossary for Hindi & Marathi Quiz Translations
    const ACADEMIC_GLOSSARY = {
        hi: {
            'none of the above': 'उपरोक्त में से कोई नहीं',
            'none of these': 'इनमें से कोई नहीं',
            'all of the above': 'उपरोक्त सभी',
            'all of these': 'इनमें से सभी',
            'both a and b': 'A और B दोनों',
            'both b and c': 'B और C दोनों',
            'both a and c': 'A और C दोनों',
            'true': 'सत्य',
            'false': 'असत्य',
            'yes': 'हाँ',
            'no': 'नहीं',
            'computer': 'कंप्यूटर',
            'hardware': 'हार्डवेयर',
            'software': 'सॉफ्टवेयर',
            'operating system': 'ऑपरेटिंग सिस्टम',
            'database': 'डेटाबेस',
            'keyboard': 'कीबोर्ड',
            'mouse': 'माउस',
            'monitor': 'मॉनीटर',
            'printer': 'प्रिंटर',
            'network': 'नेटवर्क',
            'memory': 'मेमोरी',
            'storage': 'स्टोरेज',
            'input': 'इनपुट',
            'output': 'आउटपुट',
            'file': 'फ़ाइल',
            'folder': 'फ़ोल्डर',
            'browser': 'ब्राउज़र',
            'website': 'वेबसाइट'
        },
        mr: {
            'none of the above': 'यापैकी काहीही नाही',
            'none of these': 'यापैकी काहीही नाही',
            'all of the above': 'वरील सर्व',
            'all of these': 'वरील सर्व',
            'both a and b': 'A आणि B दोन्ही',
            'both b and c': 'B आणि C दोन्ही',
            'both a and c': 'A आणि C दोन्ही',
            'true': 'सत्य (बरोबर)',
            'false': 'असत्य (चूक)',
            'yes': 'होय',
            'no': 'नाही',
            'computer': 'संगणक',
            'hardware': 'हार्डवेअर',
            'software': 'सॉफ्टवेअर',
            'operating system': 'ऑपरेटिंग सिस्टम',
            'database': 'डेटाबेस',
            'keyboard': 'कीबोर्ड',
            'mouse': 'माउस',
            'monitor': 'मॉनिटर',
            'printer': 'प्रिंटर',
            'network': 'नेटवर्क',
            'memory': 'स्मृती (मेमरी)',
            'storage': 'साठवणूक (स्टोरेज)',
            'input': 'इनपुट',
            'output': 'आउटपुट',
            'file': 'फाईल',
            'folder': 'फोल्डर',
            'browser': 'ब्राउझर',
            'website': 'वेबसाइट'
        }
    };

    const preprocessEnglishText = (text) => {
        if (!text || !text.trim()) return '';
        let s = text.trim();
        // Fix typos like "mouse in input device ?" -> "mouse is an input device ?"
        s = s.replace(/\b([a-zA-Z0-9_-]+)\s+in\s+(an?\s+)?(input|output|storage|hardware|software)\s+device\b/gi, '$1 is a $3 device');
        s = s.replace(/\b([a-zA-Z0-9_-]+)\s+in\s+device\b/gi, '$1 is a device');
        s = s.replace(/\bin input device\b/gi, 'is an input device');
        s = s.replace(/\bin output device\b/gi, 'is an output device');
        s = s.replace(/\bwhat in\b/gi, 'what is');
        s = s.replace(/\bwhich in\b/gi, 'which is');
        s = s.replace(/\binpute\b/gi, 'input');
        s = s.replace(/\boutpute\b/gi, 'output');
        s = s.replace(/\bdevise\b/gi, 'device');
        return s;
    };

    // Device Name Transliteration Map (preserves technical names phonetically in Devanagari)
    const DEVICE_TRANSLITERATION = {
        mr: {
            'plotter': 'प्लॉटर',
            'plotters': 'प्लॉटर',
            'flatbed scanner': 'फ्लॅटबेड स्कॅनर',
            'flatbed scanners': 'फ्लॅटबेड स्कॅनर',
            'scanner': 'स्कॅनर',
            'scanners': 'स्कॅनर',
            'barcode reader': 'बारकोड रीडर',
            'barcode readers': 'बारकोड रीडर',
            'joystick': 'जॉयस्टिक',
            'joysticks': 'जॉयस्टिक',
            'trackball': 'ट्रॅकबॉल',
            'trackballs': 'ट्रॅकबॉल',
            'stylus': 'स्टायलस',
            'touchscreen': 'टचस्क्रीन',
            'touch screen': 'टचस्क्रीन',
            'projector': 'प्रोजेक्टर',
            'projectors': 'प्रोजेक्टर',
            'microprocessor': 'मायक्रोप्रोसेसर',
            'microprocessors': 'मायक्रोप्रोसेसर',
            'motherboard': 'मदरबोर्ड',
            'router': 'राऊटर',
            'modem': 'मोडेम',
            'webcam': 'वेबकॅम',
            'web camera': 'वेब कॅमेरा',
            'microphone': 'मायक्रोफोन',
            'speaker': 'स्पीकर',
            'speakers': 'स्पीकर',
            'headphones': 'हेडफोन',
            'pen drive': 'पेनड्राईव्ह',
            'pendrive': 'पेनड्राईव्ह',
            'flash drive': 'फ्लॅश ड्राईव्ह',
            'hard disk': 'हार्ड डिस्क',
            'solid state drive': 'सॉलिड स्टेट ड्राईव्ह',
            'ssd': 'एसएसडी (SSD)',
            'cpu': 'सीपीयू (CPU)',
            'ram': 'रॅम (RAM)',
            'rom': 'रॉम (ROM)',
            'usb': 'युएसबी (USB)',
        },
        hi: {
            'plotter': 'प्लॉटर',
            'plotters': 'प्लॉटर',
            'flatbed scanner': 'फ्लैटबेड स्कैनर',
            'flatbed scanners': 'फ्लैटबेड स्कैनर',
            'scanner': 'स्कैनर',
            'scanners': 'स्कैनर',
            'barcode reader': 'बारकोड रीडर',
            'barcode readers': 'बारकोड रीडर',
            'joystick': 'जॉयस्टिक',
            'joysticks': 'जॉयस्टिक',
            'trackball': 'ट्रैकबॉल',
            'trackballs': 'ट्रैकबॉल',
            'stylus': 'स्टायलस',
            'touchscreen': 'टचस्क्रीन',
            'touch screen': 'टचस्क्रीन',
            'projector': 'प्रोजेक्टर',
            'projectors': 'प्रोजेक्टर',
            'microprocessor': 'माइक्रोप्रोसेसर',
            'microprocessors': 'माइक्रोप्रोसेसर',
            'motherboard': 'मदरबोर्ड',
            'router': 'राउटर',
            'modem': 'मोडेम',
            'webcam': 'वेबकैम',
            'web camera': 'वेब कैमरा',
            'microphone': 'माइक्रोफोन',
            'speaker': 'स्पीकर',
            'speakers': 'स्पीकर',
            'headphones': 'हेडफोन',
            'pen drive': 'पेनड्राइव',
            'pendrive': 'पेनड्राइव',
            'flash drive': 'फ्लैश ड्राइव',
            'hard disk': 'हार्ड डिस्क',
            'solid state drive': 'सॉलिड स्टेट ड्राइव',
            'ssd': 'एसएसडी (SSD)',
            'cpu': 'सीपीयू (CPU)',
            'ram': 'रैम (RAM)',
            'rom': 'रोम (ROM)',
            'usb': 'यूएसबी (USB)',
        }
    };

    const postprocessTranslation = (translated, targetLang, originalEng) => {
        if (!translated) return '';
        let res = translated;

        // Phonetic Device Transliteration Replacement
        if (DEVICE_TRANSLITERATION[targetLang]) {
            Object.entries(DEVICE_TRANSLITERATION[targetLang]).forEach(([engTerm, devanagari]) => {
                const regexEng = new RegExp(`\\b${engTerm}\\b`, 'gi');
                res = res.replace(regexEng, devanagari);
            });
        }

        if (targetLang === 'mr') {
            // Fix literal translation artifacts & mistransliterations for Marathi
            res = res.replace(/प्लोतर/gi, 'प्लॉटर');
            res = res.replace(/प्लॉटर्स/gi, 'प्लॉटर');
            res = res.replace(/फ्लदबेद/gi, 'फ्लॅटबेड');
            res = res.replace(/स्कानर/gi, 'स्कॅनर');
            res = res.replace(/इनपुट डिव्हाइसमध्ये ([^?]+)\?/gi, '$1 हे इनपुट डिव्हाइस आहे का?');
            res = res.replace(/डिव्हाइसमध्ये ([^?]+)\?/gi, '$1 हे डिव्हाइस आहे का?');
            res = res.replace(/इन्पुट/g, 'इनपुट');
            res = res.replace(/डिव्हाईस/g, 'डिव्हाइस');

            if (originalEng.toLowerCase().includes('is ') || originalEng.toLowerCase().includes(' is')) {
                if (res.includes('आहे') && !res.includes('आहे का')) {
                    res = res.replace(/आहे\s*\?/g, 'आहे का?');
                }
            }
        }

        if (targetLang === 'hi') {
            // Fix literal translation artifacts & mistransliterations for Hindi
            res = res.replace(/प्लोतर/gi, 'प्लॉटर');
            res = res.replace(/प्लॉटर्स/gi, 'प्लॉटर');
            res = res.replace(/स्कानर/gi, 'स्कैनर');
            res = res.replace(/इनपुट डिवाइस में ([^?]+)\?/gi, 'क्या $1 एक इनपुट डिवाइस है?');
            res = res.replace(/डिवाइस में ([^?]+)\?/gi, 'क्या $1 एक डिवाइस है?');
            res = res.replace(/इन्पुट/g, 'इनपुट');

            if (originalEng.toLowerCase().startsWith('is ') && !res.startsWith('क्या')) {
                res = 'क्या ' + res;
            }
        }

        return res;
    };

    const translateText = async (text, targetLang) => {
        if (!text || !text.trim()) return '';
        const cleanedEng = preprocessEnglishText(text);
        const cleanLower = cleanedEng.toLowerCase();

        // Check exact glossary match first
        if (ACADEMIC_GLOSSARY[targetLang] && ACADEMIC_GLOSSARY[targetLang][cleanLower]) {
            return ACADEMIC_GLOSSARY[targetLang][cleanLower];
        }

        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(cleanedEng)}`;
            const res = await fetch(url);
            const data = await res.json();
            let translated = '';
            if (Array.isArray(data) && Array.isArray(data[0])) {
                translated = data[0].map(item => item[0]).join('');
            }
            if (translated && ACADEMIC_GLOSSARY[targetLang] && ACADEMIC_GLOSSARY[targetLang][cleanLower]) {
                return ACADEMIC_GLOSSARY[targetLang][cleanLower];
            }
            return postprocessTranslation(translated || cleanedEng, targetLang, cleanedEng);
        } catch (e) {
            console.error(`Translation error for ${targetLang}:`, e);
            return text;
        }
    };

    const handleAutoTranslateQuestion = async (i, targetLang = null) => {
        const q = questions[i];
        if (!q || (!q.q && !q.a && !q.b)) {
            alert('Please enter English Question text and Options first');
            return;
        }
        setTranslatingQ(i);
        try {
            const langs = targetLang ? [targetLang] : ['hi', 'mr'];
            const newTranslations = { ...(q.translations || {}) };

            for (const lang of langs) {
                const currentLangObj = newTranslations[lang] || { q: '', options: { a: '', b: '', c: '', d: '' } };

                // Translate question text
                const translatedQ = q.q ? await translateText(q.q, lang) : currentLangObj.q;

                // Translate options
                const optKeys = ['a', 'b', 'c', 'd'];
                const translatedOptions = { ...(currentLangObj.options || {}) };
                for (const key of optKeys) {
                    if (q[key] && q[key].trim()) {
                        translatedOptions[key] = await translateText(q[key], lang);
                    }
                }

                newTranslations[lang] = {
                    q: translatedQ || currentLangObj.q,
                    options: translatedOptions
                };
            }

            setQuestions(prev => prev.map((item, idx) => idx === i ? { ...item, translations: newTranslations } : item));
            showToast(`Question ${i + 1} Auto-Translated successfully! ✨`);
        } catch (e) {
            alert('Auto-translation failed: ' + e.message);
        } finally {
            setTranslatingQ(null);
        }
    };

    const handleAutoTranslateAllQuestions = async (targetLang = null) => {
        if (questions.length === 0) return;
        const hasEnglishText = questions.some(q => q.q || q.a || q.b);
        if (!hasEnglishText) {
            alert('Please enter or import English questions first.');
            return;
        }

        const langLabel = targetLang ? (targetLang === 'hi' ? 'Hindi' : 'Marathi') : 'BOTH Hindi & Marathi';
        if (!window.confirm(`Auto-translate ALL ${questions.length} questions into ${langLabel} using Academic Glossary?`)) return;

        setBulkProgress({ current: 0, total: questions.length });

        const langs = targetLang ? [targetLang] : ['hi', 'mr'];
        const updatedQuestions = [...questions];

        for (let i = 0; i < updatedQuestions.length; i++) {
            setBulkProgress({ current: i + 1, total: updatedQuestions.length });
            const q = updatedQuestions[i];
            if (!q.q && !q.a && !q.b) continue;

            const newTranslations = { ...(q.translations || {}) };

            for (const lang of langs) {
                const currentLangObj = newTranslations[lang] || { q: '', options: { a: '', b: '', c: '', d: '' } };

                const translatedQ = q.q ? await translateText(q.q, lang) : currentLangObj.q;

                const optKeys = ['a', 'b', 'c', 'd'];
                const translatedOptions = { ...(currentLangObj.options || {}) };
                for (const key of optKeys) {
                    if (q[key] && q[key].trim()) {
                        translatedOptions[key] = await translateText(q[key], lang);
                    }
                }

                newTranslations[lang] = {
                    q: translatedQ || currentLangObj.q,
                    options: translatedOptions
                };
            }

            updatedQuestions[i] = { ...q, translations: newTranslations };
            await new Promise(r => setTimeout(r, 60));
        }

        setQuestions(updatedQuestions);
        setBulkProgress(null);
        showToast(`Successfully translated ALL ${questions.length} questions into ${langLabel}! ✨`);
    };

    const removeQ = (i) => setQuestions(prev => prev.filter((_, idx) => idx !== i));

    const toggleCorrectOption = (questionIndex, optKey) => {
        setQuestions(prev => prev.map((q, idx) => {
            if (idx !== questionIndex) return q;
            if (q.type === 'multiple') {
                const currentArr = typeof q.correct === 'string' ? q.correct.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : [];
                let nextArr;
                if (currentArr.includes(optKey)) {
                    nextArr = currentArr.filter(x => x !== optKey);
                } else {
                    nextArr = [...currentArr, optKey].sort();
                }
                return { ...q, correct: nextArr.join(',') || 'a' };
            } else {
                return { ...q, correct: optKey };
            }
        }));
    };

    const toggleQuestionType = (questionIndex, type) => {
        setQuestions(prev => prev.map((q, idx) => {
            if (idx !== questionIndex) return q;
            let newCorrect = q.correct;
            if (type === 'single' && typeof newCorrect === 'string' && newCorrect.includes(',')) {
                newCorrect = newCorrect.split(',')[0] || 'a';
            }
            return { ...q, type, correct: newCorrect };
        }));
    };

    // ── Bulk Excel / CSV Upload & Sample Download ────────────────────────────
    const excelInputRef = useRef(null);

    const handleDownloadSampleCsv = () => {
        const headers = ['Question Text', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Answer (a/b/c/d or a,c)', 'Question Type (single/multiple)'];
        const rows = [
            ['Which unit of CPU performs mathematical calculations?', 'Arithmetic Logic Unit (ALU)', 'Control Unit', 'Memory Unit', 'Bus Unit', 'a', 'single'],
            ['Select all input devices from the list below:', 'Keyboard', 'Monitor', 'Mouse', 'Printer', 'a,c', 'multiple'],
            ['Which of the following are Operating Systems?', 'Windows 11', 'MS Word', 'Linux Ubuntu', 'MS PowerPoint', 'a,c', 'multiple'],
            ['What is the binary representation of decimal 10?', '1010', '1100', '1001', '1111', 'a', 'single']
        ];
        exportCsv('Sample_Quiz_Template_With_MultiSelect', headers, rows);
        showToast('Sample Excel Template Downloaded! 📥');
    };

    const handleExcelImport = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const text = evt.target.result;
                const lines = text.split(/\r\n|\n/).map(l => l.trim()).filter(l => l.length > 0);
                if (lines.length <= 1) {
                    alert('Uploaded file is empty or missing data rows');
                    return;
                }

                const parseCsvLine = (line) => {
                    const result = [];
                    let cur = '';
                    let inQuotes = false;
                    for (let i = 0; i < line.length; i++) {
                        const c = line[i];
                        if (c === '"') {
                            if (inQuotes && line[i + 1] === '"') {
                                cur += '"';
                                i++;
                            } else {
                                inQuotes = !inQuotes;
                            }
                        } else if (c === ',' && !inQuotes) {
                            result.push(cur.trim());
                            cur = '';
                        } else {
                            cur += c;
                        }
                    }
                    result.push(cur.trim());
                    return result;
                };

                const parsedQuestions = [];
                for (let i = 1; i < lines.length; i++) {
                    const cols = parseCsvLine(lines[i]);
                    if (cols.length >= 2 && cols[0]) {
                        const q = cols[0] || '';
                        const a = cols[1] || '';
                        const b = cols[2] || '';
                        const c = cols[3] || '';
                        const d = cols[4] || '';
                        let rawCorrect = (cols[5] || 'a').toLowerCase().trim().replace(/[|;]/g, ',');
                        let qType = (cols[6] || '').toLowerCase().trim();

                        if (rawCorrect.includes(',') || qType === 'multiple') {
                            qType = 'multiple';
                            const validOpts = rawCorrect.split(',').map(s => s.trim()).filter(s => ['a', 'b', 'c', 'd'].includes(s));
                            rawCorrect = validOpts.length > 0 ? Array.from(new Set(validOpts)).sort().join(',') : 'a';
                        } else {
                            qType = 'single';
                            if (!['a', 'b', 'c', 'd'].includes(rawCorrect)) rawCorrect = 'a';
                        }

                        parsedQuestions.push({ q, a, b, c, d, type: qType, correct: rawCorrect });
                    }
                }

                if (parsedQuestions.length > 0) {
                    setQuestions(parsedQuestions);
                    showToast(`Loaded ${parsedQuestions.length} questions from Excel! 🎉`);
                } else {
                    alert('No valid questions found in the file.');
                }
            } catch (err) {
                console.error(err);
                alert('Failed to parse Excel/CSV file');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    // ── Export Quiz Results to Excel & PDF ────────────────────────────────────
    const handleExportExcelResults = () => {
        if (!quizResults.length) return alert('No results to export');
        const headers = ['Sr No', 'Student ID', 'Student Name', 'Quiz Title', 'Course', 'Score', 'Total', 'Percentage (%)', 'Duration', 'Date'];
        const rows = quizResults.map((r, i) => [
            i + 1,
            r.studentId,
            r.studentName,
            r.quizTitle,
            r.course,
            r.score,
            r.total,
            `${Number(r.percentage) || 0}%`,
            r.duration || '—',
            r.date ? new Date(r.date).toLocaleString('en-IN') : '—'
        ]);
        exportCsv('Quiz_Results', headers, rows);
        showToast('Quiz Results exported as Excel CSV! 📊');
    };

    const handleExportPdfResults = () => {
        if (!quizResults.length) return alert('No results to export');
        const headers = ['Sr No', 'Student ID', 'Student Name', 'Quiz Title', 'Course', 'Score', 'Total', '%ile', 'Duration', 'Date'];
        const rows = quizResults.map((r, i) => [
            i + 1,
            r.studentId,
            r.studentName,
            r.quizTitle,
            r.course,
            r.score,
            r.total,
            `${Number(r.percentage) || 0}%`,
            r.duration || '—',
            r.date ? new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
        ]);
        exportPdf('Classroom Quiz Results Report', headers, rows);
    };

    // Helper to get franchise header details
    const getFranchiseDetails = (branchName = '') => {
        const franchiseList = adminData?.franchises || [];
        let match = null;
        if (branchName) {
            match = franchiseList.find(f => String(f.branch || '').toLowerCase() === String(branchName).toLowerCase());
        }
        if (!match && franchiseList.length > 0) {
            match = franchiseList[0];
        }
        const centerName = match?.centerName && match.centerName !== 'Institute Marksheet Report' ? match.centerName : 'DURGE COMPUTER CLASSES';
        const centerAddress = match?.address || '';
        const centerPhone = match?.mobile ? (match.mobile.startsWith('+91') ? match.mobile : `• Phone: +91 ${match.mobile}`) : '';
        const centerBranch = match?.branch || branchName || '';
        return { centerName, centerAddress, centerPhone, centerBranch };
    };

    // ── Print Individual Student Quiz Marksheet (Branch Header) ─────────────
    const handlePrintStudentMarksheet = (r) => {
        const { centerName, centerAddress, centerPhone, centerBranch } = getFranchiseDetails(r.branch || r.course);

        const matchedQuiz = (publishedQuizzes || []).find(q => String(q.id) === String(r.quizId) || String(q.title).toLowerCase() === String(r.quizTitle).toLowerCase());
        const questionsList = matchedQuiz?.questions || [];
        const userAnswersMap = typeof r.answers === 'object' ? r.answers : (() => { try { return JSON.parse(r.answers || '{}'); } catch (e) { return {}; } })();

        const pct = Number(r.percentage) || (r.total > 0 ? Math.round((r.score / r.total) * 100) : 0);
        const passed = pct >= 40;

        const printWin = window.open('', '_blank', 'width=850,height=900');
        if (!printWin) return alert('Please allow popups to print report.');

        const qRows = (questionsList || []).map((q, i) => {
            const studentAns = userAnswersMap?.[i] || 'Not Answered';
            const correctOpt = q.correct || 'a';
            const isRight = String(studentAns).toLowerCase() === String(correctOpt).toLowerCase();
            const studentText = q.options?.[studentAns] ? `${String(studentAns).toUpperCase()}. ${q.options[studentAns]}` : String(studentAns).toUpperCase();
            const correctText = `${String(correctOpt).toUpperCase()}. ${q.options?.[correctOpt] || ''}`;

            return `
                <tr style="border-bottom:1px solid #e2e8f0;">
                    <td style="padding:10px;font-weight:bold;">Q${i + 1}</td>
                    <td style="padding:10px;">${q.q}</td>
                    <td style="padding:10px;color:${isRight ? '#059669' : '#dc2626'};font-weight:bold;">${studentText}</td>
                    <td style="padding:10px;color:#059669;font-weight:bold;">${correctText}</td>
                    <td style="padding:10px;font-weight:bold;color:${isRight ? '#059669' : '#dc2626'};">${isRight ? '✓ Correct' : '✕ Incorrect'}</td>
                </tr>
            `;
        }).join('');

        printWin.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Quiz Marksheet - ${r.quizTitle} - ${r.studentName}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; background: #fff; }
                    .header { text-align: center; border-bottom: 2px solid #7c3aed; padding-bottom: 16px; margin-bottom: 24px; }
                    .logo { font-size: 24px; font-weight: 900; color: #1e1b4b; text-transform: uppercase; letter-spacing: 0.5px; }
                    .sub { font-size: 13px; color: #475569; margin-top: 4px; font-weight: 600; }
                    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; padding: 16px; border-radius: 12px; margin-bottom: 24px; font-size: 14px; border: 1px solid #e2e8f0; }
                    .badge { padding: 6px 14px; border-radius: 20px; font-weight: 800; font-size: 14px; display: inline-block; }
                    .badge-pass { background: #d1fae5; color: #065f46; }
                    .badge-fail { background: #fee2e2; color: #991b1b; }
                    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
                    th { background: #7c3aed; color: #fff; padding: 10px; text-align: left; }
                    @media print { button { display: none; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">${centerName}</div>
                    <div class="sub">${centerAddress} ${centerPhone}</div>
                    ${centerBranch ? `<div style="font-size:12px;color:#7c3aed;font-weight:700;margin-top:4px;">Branch: ${centerBranch}</div>` : ''}
                </div>
                <div class="grid">
                    <div><strong>Student Name:</strong> ${r.studentName}</div>
                    <div><strong>Student ID / Roll:</strong> ${r.studentId}</div>
                    <div><strong>Course / Class:</strong> ${r.course}</div>
                    <div><strong>Quiz / Test Name:</strong> ${r.quizTitle}</div>
                    <div><strong>Score Obtained:</strong> ${r.score} / ${r.total} (${pct}%)</div>
                    <div><strong>Attempt Duration:</strong> ⏱️ ${r.duration || 'N/A'}</div>
                    <div><strong>Date Taken:</strong> ${r.date ? new Date(r.date).toLocaleDateString('en-IN') : 'N/A'}</div>
                    <div><strong>Result Status:</strong> <span class="badge ${passed ? 'badge-pass' : 'badge-fail'}">${passed ? 'PASSED ✅' : 'NEEDS IMPROVEMENT ⚠️'}</span></div>
                </div>

                ${questionsList.length > 0 ? `
                <h3 style="color:#7c3aed;margin-top:24px;">Question & Option Analysis</h3>
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Question Text</th>
                            <th>Student Answer</th>
                            <th>Correct Answer</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${qRows}
                    </tbody>
                </table>` : ''}

                <div style="margin-top: 40px; text-align: center; color: #94a3b8; font-size: 12px;">
                    Generated by ${centerName} • ${new Date().toLocaleString('en-IN')}
                </div>
                <script>
                    window.onload = function() { window.print(); };
                </script>
            </body>
            </html>
        `);
        printWin.document.close();
    };

    // ── Print All Test History Summary (Branch Header) ──────────────────────
    const handlePrintAllTestHistory = (list) => {
        if (!list || !list.length) return alert('No test history records to print.');
        const { centerName, centerAddress, centerPhone } = getFranchiseDetails();

        const printWin = window.open('', '_blank', 'width=950,height=900');
        if (!printWin) return alert('Please allow popups to print report.');

        const rowsHtml = list.map((r, i) => {
            const pct = Number(r.percentage) || (r.total > 0 ? Math.round((r.score / r.total) * 100) : 0);
            const passed = pct >= 40;
            return `
                <tr style="border-bottom:1px solid #e2e8f0;font-size:12px;">
                    <td style="padding:8px;">${i + 1}</td>
                    <td style="padding:8px;font-weight:bold;">${r.studentName}<br><span style="font-size:10px;color:#64748b;">${r.studentId}</span></td>
                    <td style="padding:8px;font-weight:bold;color:#4338ca;">${r.course}</td>
                    <td style="padding:8px;font-weight:bold;">${r.quizTitle}</td>
                    <td style="padding:8px;font-weight:bold;text-align:center;">${r.score}/${r.total}</td>
                    <td style="padding:8px;text-align:center;font-weight:bold;color:${passed ? '#059669' : '#dc2626'};">${pct}% (${passed ? 'PASS' : 'FAIL'})</td>
                    <td style="padding:8px;text-align:center;">${r.duration || '—'}</td>
                    <td style="padding:8px;">${r.date ? new Date(r.date).toLocaleDateString('en-IN') : '—'}</td>
                </tr>
            `;
        }).join('');

        printWin.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>All Student Test History Report</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; color: #1e293b; background: #fff; }
                    .header { text-align: center; border-bottom: 2px solid #7c3aed; padding-bottom: 14px; margin-bottom: 20px; }
                    .logo { font-size: 24px; font-weight: 900; color: #1e1b4b; text-transform: uppercase; }
                    .sub { font-size: 13px; color: #475569; margin-top: 4px; font-weight: 600; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th { background: #7c3aed; color: #fff; padding: 9px; text-align: left; font-size: 12px; }
                    @media print { button { display: none; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">${centerName}</div>
                    <div class="sub">${centerAddress} ${centerPhone}</div>
                    <div style="font-size:14px;color:#7c3aed;font-weight:800;margin-top:6px;">All Student Quiz & Test History Report</div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Student</th>
                            <th>Class / Course</th>
                            <th>Test / Quiz Name</th>
                            <th style="text-align:center;">Marks</th>
                            <th style="text-align:center;">% Result</th>
                            <th style="text-align:center;">Duration</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>

                <div style="margin-top: 30px; text-align: center; color: #94a3b8; font-size: 11px;">
                    Generated by ${centerName} • Total Records: ${list.length} • ${new Date().toLocaleString('en-IN')}
                </div>
                <script>
                    window.onload = function() { window.print(); };
                </script>
            </body>
            </html>
        `);
        printWin.document.close();
    };

    // ── Print Test Class Marksheets Report (All Students for Selected Test) ──
    const handlePrintTestClassReport = (testTitle, courseName, list) => {
        if (!list || !list.length) return alert('No student test attempts found for this quiz.');
        const { centerName, centerAddress, centerPhone } = getFranchiseDetails();

        const printWin = window.open('', '_blank', 'width=950,height=900');
        if (!printWin) return alert('Please allow popups to print report.');

        let passCount = 0;
        let failCount = 0;
        let totalPctSum = 0;

        const rowsHtml = list.map((r, i) => {
            const pct = Number(r.percentage) || (r.total > 0 ? Math.round((r.score / r.total) * 100) : 0);
            const passed = pct >= 40;
            if (passed) passCount++; else failCount++;
            totalPctSum += pct;

            return `
                <tr style="border-bottom:1px solid #e2e8f0;font-size:13px;">
                    <td style="padding:10px;text-align:center;font-weight:bold;">${i + 1}</td>
                    <td style="padding:10px;font-weight:bold;color:#1e1b4b;">${r.studentName}<br><span style="font-size:11px;color:#64748b;font-weight:normal;">Roll/ID: ${r.studentId}</span></td>
                    <td style="padding:10px;font-weight:bold;color:#4338ca;">${r.course || courseName || '—'}</td>
                    <td style="padding:10px;text-align:center;font-weight:bold;font-size:14px;">${r.score} / ${r.total}</td>
                    <td style="padding:10px;text-align:center;font-weight:extrabold;color:${passed ? '#059669' : '#dc2626'};">${pct}% (${passed ? 'PASSED ✅' : 'FAILED ⚠️'})</td>
                    <td style="padding:10px;text-align:center;color:#475569;">⏱️ ${r.duration || '—'}</td>
                    <td style="padding:10px;color:#64748b;font-size:12px;">${r.date ? new Date(r.date).toLocaleDateString('en-IN') : '—'}</td>
                </tr>
            `;
        }).join('');

        const avgPct = Math.round(totalPctSum / (list.length || 1));

        printWin.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Class Quiz Report - ${testTitle}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; background: #fff; }
                    .header { text-align: center; border-bottom: 2px solid #7c3aed; padding-bottom: 16px; margin-bottom: 20px; }
                    .logo { font-size: 24px; font-weight: 900; color: #1e1b4b; text-transform: uppercase; letter-spacing: 0.5px; }
                    .sub { font-size: 13px; color: #475569; margin-top: 4px; font-weight: 600; }
                    .meta-bar { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: #f8fafc; padding: 14px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 20px; font-size: 13px; text-align: center; }
                    .meta-bar div { font-weight: bold; }
                    .meta-bar span { font-weight: 900; color: #7c3aed; font-size: 16px; display: block; margin-top: 2px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th { background: #7c3aed; color: #fff; padding: 10px; text-align: left; font-size: 13px; }
                    @media print { button { display: none; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">${centerName}</div>
                    <div class="sub">${centerAddress} ${centerPhone}</div>
                    <div style="font-size:16px;color:#7c3aed;font-weight:800;margin-top:6px;">Classroom Quiz Performance Report: ${testTitle}</div>
                    ${courseName ? `<div style="font-size:13px;color:#64748b;font-weight:700;margin-top:2px;">Class / Course: ${courseName}</div>` : ''}
                </div>

                <div class="meta-bar">
                    <div>Total Students<span>${list.length}</span></div>
                    <div>Passed Students<span style="color:#059669;">${passCount}</span></div>
                    <div>Failed Students<span style="color:#dc2626;">${failCount}</span></div>
                    <div>Class Average Score<span>${avgPct}%</span></div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="text-align:center;">#</th>
                            <th>Student Name & ID</th>
                            <th>Class / Course</th>
                            <th style="text-align:center;">Marks Score</th>
                            <th style="text-align:center;">Percentage & Status</th>
                            <th style="text-align:center;">Duration</th>
                            <th>Date Attempted</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>

                <div style="margin-top: 40px; text-align: center; color: #94a3b8; font-size: 11px;">
                    Generated by ${centerName} • ${new Date().toLocaleString('en-IN')}
                </div>
                <script>
                    window.onload = function() { window.print(); };
                </script>
            </body>
            </html>
        `);
        printWin.document.close();
    };

    // ── TOC filtered materials ────────────────────────────────────────────────
    const tocCourses = [...new Set(materials.map(m => m.course))];
    const filteredMaterials = tocCourse ? materials.filter(m => m.course === tocCourse) : materials;

    const TABS = [
        { id: 'classwork', label: '📚 Classwork', desc: 'Publish & manage materials' },
        { id: 'submissions', label: '📤 Submissions', desc: 'Grade student work' },
        { id: 'quizzes', label: '📝 Quizzes', desc: 'Create exams & quizzes' },
        { id: 'articulate', label: '🎓 Articulate Sessions', desc: 'Build step-by-step course sessions & track ERA progress' },
        { id: 'exammarks', label: '🏆 Exam Marks', desc: 'View student results' },
        { id: 'testhistory', label: '📊 Test History', desc: 'Detailed student test reports & marksheets' },
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
                <div className="space-y-6">
                    {/* Published Quizzes History List */}
                    <div className="card shadow-md">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold flex items-center gap-2 text-indigo-900">
                                <BookOpen size={20} className="text-indigo-600" />
                                Published Quizzes & Exams ({publishedQuizzes.length})
                            </h2>
                            <button
                                onClick={loadPublishedQuizzes}
                                className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition"
                            >
                                🔄 Refresh List
                            </button>
                        </div>

                        {loadingQuizzes ? (
                            <div className="text-center py-8 text-gray-500 font-semibold">Loading published quizzes...</div>
                        ) : publishedQuizzes.length === 0 ? (
                            <EmptyBox icon="📝" text="No Quizzes Published Yet" sub="Created quizzes will appear here with options to edit or delete" />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead>
                                        <tr className="bg-indigo-50/50 text-indigo-900 border-b border-indigo-100 font-bold text-xs uppercase">
                                            <th className="p-3">Quiz Title</th>
                                            <th className="p-3">Course</th>
                                            <th className="p-3">Time Limit</th>
                                            <th className="p-3">Questions</th>
                                            <th className="p-3">Due Date</th>
                                            <th className="p-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {publishedQuizzes.map(qz => (
                                            <tr key={qz.id} className="hover:bg-gray-50/80 transition">
                                                <td className="p-3 font-bold text-gray-800 flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                                    {qz.title}
                                                </td>
                                                <td className="p-3">
                                                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md font-semibold text-xs">
                                                        {qz.course}
                                                    </span>
                                                </td>
                                                <td className="p-3">
                                                    <span className="flex items-center gap-1 font-semibold text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-md w-fit">
                                                        <Clock size={12} /> {qz.timeLimit ? `${qz.timeLimit} Mins` : 'No Limit'}
                                                    </span>
                                                </td>
                                                <td className="p-3 font-semibold text-gray-600">
                                                    {Array.isArray(qz.questions) ? qz.questions.length : 0} Questions
                                                </td>
                                                <td className="p-3 text-xs text-gray-500">
                                                    {qz.dueDate ? new Date(qz.dueDate).toLocaleDateString('en-IN') : 'No Due Date'}
                                                </td>
                                                <td className="p-3 text-right space-x-2">
                                                    <button
                                                        onClick={() => handleEditQuiz(qz)}
                                                        className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs rounded-lg transition inline-flex items-center gap-1"
                                                        title="Edit Quiz"
                                                    >
                                                        <Edit2 size={13} /> Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteQuiz(qz)}
                                                        className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold text-xs rounded-lg transition inline-flex items-center gap-1"
                                                        title="Delete Quiz"
                                                    >
                                                        <Trash2 size={13} /> Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Create / Edit Quiz Form */}
                    <div ref={quizFormRef} className="card shadow-md border-2 border-indigo-100">
                        <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
                            <h2 className="text-xl font-bold flex items-center gap-2 text-indigo-900">
                                <CheckCircle size={20} className="text-indigo-500" />
                                {editingQuizId ? `✏️ Edit Quiz: ${quizForm.title || 'Untitled'}` : 'Create Quiz / Exam'}
                            </h2>
                            {/* Excel Bulk Upload & Sample Template Buttons */}
                            <div className="flex items-center gap-2 flex-wrap">
                                {editingQuizId && (
                                    <button
                                        type="button"
                                        onClick={handleCancelEdit}
                                        className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl text-xs font-bold transition"
                                    >
                                        <X size={14} /> Cancel Edit
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={handleDownloadSampleCsv}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold transition border border-emerald-200"
                                >
                                    <Download size={14} /> Download Sample Excel Template
                                </button>
                                <button
                                    type="button"
                                    onClick={() => excelInputRef.current?.click()}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition border border-indigo-200"
                                >
                                    <FileSpreadsheet size={14} /> Upload Excel / CSV Quiz
                                </button>
                                <input
                                    ref={excelInputRef}
                                    type="file"
                                    accept=".csv, .xlsx, .xls, .txt"
                                    onChange={handleExcelImport}
                                    className="hidden"
                                />
                            </div>
                        </div>
                        <div className="space-y-5 max-w-3xl">
                            {/* Quiz Meta */}
                            <div className="grid grid-cols-4 gap-4">
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
                                    <label className="text-xs font-bold opacity-50 mb-1 block">Time Limit (Mins) *</label>
                                    <select className="inp" value={quizForm.timeLimit} onChange={e => setQuizForm({ ...quizForm, timeLimit: e.target.value })}>
                                        <option value="15">15 Minutes</option>
                                        <option value="30">30 Minutes</option>
                                        <option value="45">45 Minutes</option>
                                        <option value="60">60 Minutes (1 Hr)</option>
                                        <option value="90">90 Minutes (1.5 Hrs)</option>
                                        <option value="120">120 Minutes (2 Hrs)</option>
                                        <option value="0">No Time Limit</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold opacity-50 mb-1 block">Due Date</label>
                                    <input className="inp" type="date" value={quizForm.dueDate} onChange={e => setQuizForm({ ...quizForm, dueDate: e.target.value })} />
                                </div>
                            </div>

                            {/* Shuffle Toggles */}
                            <div className="flex flex-wrap items-center gap-6 p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs font-bold text-indigo-900">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={quizForm.shuffleQuestions !== false}
                                        onChange={e => setQuizForm({ ...quizForm, shuffleQuestions: e.target.checked })}
                                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                    />
                                    <span>🔀 Shuffle Questions Order</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={quizForm.shuffleOptions !== false}
                                        onChange={e => setQuizForm({ ...quizForm, shuffleOptions: e.target.checked })}
                                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                    />
                                    <span>🔀 Shuffle Options (A, B, C, D)</span>
                                </label>
                            </div>

                            {/* Questions */}
                            <div>
                                <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm font-bold text-gray-700">Questions ({questions.length})</label>
                                        {bulkProgress && (
                                            <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2.5 py-1 rounded-full animate-pulse flex items-center gap-1.5">
                                                <div className="w-3 h-3 border-2 border-purple-700 border-t-transparent rounded-full animate-spin" />
                                                Translating Q{bulkProgress.current} of {bulkProgress.total}...
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 flex-wrap">
                                        {questions.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => handleAutoTranslateAllQuestions()}
                                                disabled={!!bulkProgress}
                                                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
                                                title="Auto-translate all imported questions into Hindi & Marathi using Academic Glossary"
                                            >
                                                {bulkProgress ? '⏳ Translating All...' : '🚀 Translate ALL Questions (Hindi & Marathi)'}
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={addQuestion}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 transition"
                                        >
                                            <Plus size={13} /> Add Question
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    {questions.map((q, i) => {
                                        const isMulti = q.type === 'multiple';
                                        const correctArr = typeof q.correct === 'string' ? q.correct.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : [];
                                        const curLang = qActiveLang[i] || 'en';

                                        return (
                                            <div key={i} className="rounded-xl border border-gray-200 p-4 bg-gray-50 relative shadow-sm space-y-3">
                                                <div className="flex justify-between items-center gap-2 flex-wrap">
                                                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Q{i + 1}</span>

                                                    {/* Question Type Switcher */}
                                                    <div className="flex items-center gap-1 bg-white border border-gray-200 p-1 rounded-lg text-xs font-bold">
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleQuestionType(i, 'single')}
                                                            className={`px-2.5 py-1 rounded-md transition ${!isMulti ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
                                                        >
                                                            Radio (Single Choice)
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleQuestionType(i, 'multiple')}
                                                            className={`px-2.5 py-1 rounded-md transition ${isMulti ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
                                                        >
                                                            ☑️ Checkbox (Multi Choice)
                                                        </button>
                                                    </div>

                                                    {questions.length > 1 && (
                                                        <button onClick={() => removeQ(i)} className="text-red-400 hover:text-red-600 transition">
                                                            <X size={16} />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Multi-Language Tabs & Auto-Translate Action */}
                                                <div className="flex justify-between items-center gap-2 flex-wrap bg-gray-200/70 p-1 rounded-xl text-xs font-bold">
                                                    <div className="flex items-center gap-1 flex-wrap">
                                                        <button
                                                            type="button"
                                                            onClick={() => setQActiveLang(p => ({ ...p, [i]: 'en' }))}
                                                            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${curLang === 'en' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-300'}`}
                                                        >
                                                            🇬🇧 English (Default)
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setQActiveLang(p => ({ ...p, [i]: 'hi' }))}
                                                            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${curLang === 'hi' ? 'bg-amber-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-300'}`}
                                                        >
                                                            🇮🇳 हिन्दी (Hindi) {q.translations?.hi?.q ? <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full">✓ Saved</span> : ''}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setQActiveLang(p => ({ ...p, [i]: 'mr' }))}
                                                            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${curLang === 'mr' ? 'bg-orange-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-300'}`}
                                                        >
                                                            🇮🇳 मराठी (Marathi) {q.translations?.mr?.q ? <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full">✓ Saved</span> : ''}
                                                        </button>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleAutoTranslateQuestion(i)}
                                                        disabled={translatingQ === i}
                                                        className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg transition shadow-sm flex items-center gap-1 ml-auto cursor-pointer"
                                                        title="Auto-translate English text into Hindi and Marathi"
                                                    >
                                                        {translatingQ === i ? (
                                                            <>
                                                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                                <span>Translating...</span>
                                                            </>
                                                        ) : (
                                                            <span>🪄 Auto-Translate Q{i + 1}</span>
                                                        )}
                                                    </button>
                                                </div>

                                                {/* Language Tab Content */}
                                                {curLang === 'en' && (
                                                    <div className="space-y-3">
                                                        <input
                                                            className="inp bg-white"
                                                            placeholder="Question text in English *"
                                                            value={q.q}
                                                            onChange={e => updateQ(i, 'q', e.target.value)}
                                                        />
                                                        <div className="grid grid-cols-2 gap-3">
                                                            {['a', 'b', 'c', 'd'].map(opt => (
                                                                <div key={opt} className="flex items-center gap-2">
                                                                    <span className="text-xs font-bold text-gray-500 w-4 uppercase">{opt}</span>
                                                                    <input
                                                                        className="inp flex-1 bg-white"
                                                                        placeholder={`Option ${opt.toUpperCase()}${opt === 'a' || opt === 'b' ? ' *' : ''}`}
                                                                        value={q[opt]}
                                                                        onChange={e => updateQ(i, opt, e.target.value)}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {curLang === 'hi' && (
                                                    <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 space-y-3">
                                                        <div className="flex justify-between items-center text-xs font-bold text-amber-900 flex-wrap gap-2">
                                                            <span>🇮🇳 हिन्दी प्रश्न व विकल्प (Hindi Translation - Optional)</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleAutoTranslateQuestion(i, 'hi')}
                                                                disabled={translatingQ === i}
                                                                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-[11px] transition cursor-pointer flex items-center gap-1"
                                                            >
                                                                {translatingQ === i ? '⏳ Translating...' : '🪄 Auto-Translate to Hindi'}
                                                            </button>
                                                        </div>
                                                        <input
                                                            className="inp bg-white border-amber-200"
                                                            placeholder="हिन्दी में प्रश्न दर्ज करें (e.g. कंप्यूटर क्या है?)..."
                                                            value={q.translations?.hi?.q || ''}
                                                            onChange={e => updateQTranslation(i, 'hi', 'q', e.target.value)}
                                                        />
                                                        <div className="grid grid-cols-2 gap-3">
                                                            {['a', 'b', 'c', 'd'].map(opt => (
                                                                <div key={opt} className="flex items-center gap-2">
                                                                    <span className="text-xs font-bold text-amber-800 w-4 uppercase">{opt}</span>
                                                                    <input
                                                                        className="inp flex-1 bg-white border-amber-200"
                                                                        placeholder={`विकल्प ${opt.toUpperCase()} (Hindi)`}
                                                                        value={q.translations?.hi?.options?.[opt] || ''}
                                                                        onChange={e => updateQTranslation(i, 'hi', opt, e.target.value)}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {curLang === 'mr' && (
                                                    <div className="p-3 bg-orange-50/70 rounded-xl border border-orange-200 space-y-3">
                                                        <div className="flex justify-between items-center text-xs font-bold text-orange-900 flex-wrap gap-2">
                                                            <span>🇮🇳 मराठी प्रश्न व पर्याय (Marathi Translation - Optional)</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleAutoTranslateQuestion(i, 'mr')}
                                                                disabled={translatingQ === i}
                                                                className="px-2.5 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-[11px] transition cursor-pointer flex items-center gap-1"
                                                            >
                                                                {translatingQ === i ? '⏳ Translating...' : '🪄 Auto-Translate to Marathi'}
                                                            </button>
                                                        </div>
                                                        <input
                                                            className="inp bg-white border-orange-200"
                                                            placeholder="मराठीत प्रश्न प्रविष्ट करा (e.g. संगणक म्हणजे काय?)..."
                                                            value={q.translations?.mr?.q || ''}
                                                            onChange={e => updateQTranslation(i, 'mr', 'q', e.target.value)}
                                                        />
                                                        <div className="grid grid-cols-2 gap-3">
                                                            {['a', 'b', 'c', 'd'].map(opt => (
                                                                <div key={opt} className="flex items-center gap-2">
                                                                    <span className="text-xs font-bold text-orange-800 w-4 uppercase">{opt}</span>
                                                                    <input
                                                                        className="inp flex-1 bg-white border-orange-200"
                                                                        placeholder={`पर्याय ${opt.toUpperCase()} (Marathi)`}
                                                                        value={q.translations?.mr?.options?.[opt] || ''}
                                                                        onChange={e => updateQTranslation(i, 'mr', opt, e.target.value)}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="pt-2 flex items-center gap-2 flex-wrap border-t border-gray-200/60">
                                                    <label className="text-xs font-bold text-gray-500">
                                                        {isMulti ? 'Select ALL Correct Answers (Checkboxes):' : 'Correct Answer:'}
                                                    </label>
                                                    {['a', 'b', 'c', 'd'].map(opt => {
                                                        const isSelected = isMulti ? correctArr.includes(opt) : q.correct === opt;
                                                        return (
                                                            <button
                                                                type="button"
                                                                key={opt}
                                                                onClick={() => toggleCorrectOption(i, opt)}
                                                                className={`flex items-center gap-1 cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold transition ${isSelected ? (isMulti ? 'bg-purple-600 text-white' : 'bg-green-500 text-white') : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                                                            >
                                                                {isMulti ? (isSelected ? '☑️' : '☐') : ''} Option {opt.toUpperCase()}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <button
                                className="btn w-full py-3 text-lg flex justify-center items-center gap-2"
                                onClick={handlePublishQuiz}
                                disabled={savingQuiz}
                            >
                                {savingQuiz
                                    ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    : editingQuizId
                                        ? `💾 Update Quiz (${questions.length} Questions)`
                                        : `🚀 Publish Quiz (${questions.length} Questions)`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── ARTICULATE SESSIONS & ERA PROGRESS TAB ── */}
            {activeTab === 'articulate' && (
                <div className="space-y-6">
                    {/* Header Card */}
                    <div className="card shadow-md border-t-4 border-cyan-500">
                        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2 text-cyan-900">
                                    <BookOpen size={22} className="text-cyan-600" />
                                    Articulate LMS Course & Session Content Builder
                                </h2>
                                <p className="text-xs text-gray-500 mt-1">
                                    Create step-by-step sequential learning sessions, attach video lessons, topic quizzes, and practical assignments.
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleSaveAdminSessions}
                                    disabled={savingSessions}
                                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-xl font-extrabold text-sm shadow-md transition flex items-center gap-2"
                                >
                                    {savingSessions ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        '💾 Save & Publish Course Syllabus'
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Course Selector */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-cyan-50/50 p-4 rounded-2xl border border-cyan-100 mb-4">
                            <div>
                                <label className="text-xs font-bold text-cyan-800 uppercase tracking-wider mb-1 block">
                                    Target Course *
                                </label>
                                <select
                                    className="inp bg-white"
                                    value={articulateCourse}
                                    onChange={(e) => setArticulateCourse(e.target.value)}
                                >
                                    <option value="MS-CIT">MS-CIT</option>
                                    <option value="KLiC Tally">KLiC Tally</option>
                                    <option value="Web Development">Web Development</option>
                                    <option value="Python Programming">Python Programming</option>
                                    {(dropdowns.courses || []).filter(c => !['MS-CIT', 'KLiC Tally', 'Web Development', 'Python Programming'].includes(c)).map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-end">
                                <button
                                    onClick={() => fetchAdminSessions(articulateCourse)}
                                    disabled={loadingSessions}
                                    className="px-4 py-2 bg-white text-cyan-700 border border-cyan-300 hover:bg-cyan-50 rounded-xl font-bold text-xs transition"
                                >
                                    {loadingSessions ? 'Loading...' : '📥 Reload Sessions from Cloud'}
                                </button>
                            </div>
                        </div>

                        {/* Action Bar */}
                        <div className="flex justify-between items-center">
                            <h3 className="font-extrabold text-gray-800 text-base flex items-center gap-2">
                                📋 Sequential Session Tree ({adminSessions.length} Sessions)
                            </h3>
                            <button
                                onClick={handleAddSession}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition flex items-center gap-1.5 shadow"
                            >
                                <Plus size={15} /> Add New Session
                            </button>
                        </div>
                    </div>

                    {/* Sessions Accordion List */}
                    <div className="space-y-4">
                        {adminSessions.map((session, sIdx) => (
                            <div key={session.id || sIdx} className="card border border-gray-200 shadow-sm hover:border-cyan-300 transition">
                                <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-100">
                                    <div className="flex items-center gap-3 flex-1">
                                        <span className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-800 font-extrabold text-sm flex items-center justify-center">
                                            {sIdx + 1}
                                        </span>
                                        <input
                                            type="text"
                                            className="inp font-bold text-sm text-gray-800 flex-1"
                                            value={session.title}
                                            onChange={(e) => {
                                                const updated = [...adminSessions];
                                                updated[sIdx].title = e.target.value;
                                                setAdminSessions(updated);
                                            }}
                                            placeholder="Session Title..."
                                        />
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleAddTopic(sIdx)}
                                            className="px-3 py-1.5 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 rounded-lg font-bold text-xs border border-cyan-200 flex items-center gap-1"
                                        >
                                            <Plus size={13} /> Add Topic
                                        </button>
                                        <button
                                            onClick={() => handleDeleteSession(sIdx)}
                                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                                            title="Delete Session"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Sub-topics List */}
                                <div className="space-y-3 pl-4 border-l-2 border-cyan-100">
                                    {session.topics?.map((topic, tIdx) => (
                                        <div key={topic.id || tIdx} className="p-3 bg-gray-50 rounded-xl border border-gray-200 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                                            <div className="md:col-span-3">
                                                <input
                                                    type="text"
                                                    className="inp text-xs font-bold bg-white"
                                                    value={topic.title}
                                                    onChange={(e) => handleUpdateTopic(sIdx, tIdx, 'title', e.target.value)}
                                                    placeholder="Topic Title..."
                                                />
                                            </div>

                                            <div className="md:col-span-2">
                                                <select
                                                    className="inp text-xs bg-white font-semibold"
                                                    value={topic.type || 'video'}
                                                    onChange={(e) => handleUpdateTopic(sIdx, tIdx, 'type', e.target.value)}
                                                >
                                                    <option value="video">📹 Video Lesson</option>
                                                    <option value="quiz">📝 Knowledge Quiz</option>
                                                    <option value="assignment">📤 Practical Task</option>
                                                </select>
                                            </div>

                                            {(!topic.type || topic.type === 'video') && (
                                                <div className="md:col-span-6 grid grid-cols-3 gap-2">
                                                    <input
                                                        type="text"
                                                        className="inp text-xs col-span-2 bg-white"
                                                        value={topic.url || ''}
                                                        onChange={(e) => handleUpdateTopic(sIdx, tIdx, 'url', e.target.value)}
                                                        placeholder="Video URL (YouTube/MP4)..."
                                                    />
                                                    <input
                                                        type="text"
                                                        className="inp text-xs bg-white"
                                                        value={topic.duration || '05:00'}
                                                        onChange={(e) => handleUpdateTopic(sIdx, tIdx, 'duration', e.target.value)}
                                                        placeholder="Duration (05:00)..."
                                                    />
                                                </div>
                                            )}

                                            {topic.type === 'quiz' && (
                                                <div className="md:col-span-6">
                                                    <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 block">
                                                        📝 Topic Quiz (Awards +100 Internal Score Points to Students)
                                                    </span>
                                                </div>
                                            )}

                                            {topic.type === 'assignment' && (
                                                <div className="md:col-span-6">
                                                    <input
                                                        type="text"
                                                        className="inp text-xs bg-white"
                                                        value={topic.instruction || ''}
                                                        onChange={(e) => handleUpdateTopic(sIdx, tIdx, 'instruction', e.target.value)}
                                                        placeholder="Practical Assignment Instructions..."
                                                    />
                                                </div>
                                            )}

                                            <div className="md:col-span-1 text-right">
                                                <button
                                                    onClick={() => handleDeleteTopic(sIdx, tIdx)}
                                                    className="p-1 text-rose-500 hover:bg-rose-100 rounded-lg transition"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {(!session.topics || session.topics.length === 0) && (
                                        <p className="text-xs text-gray-400 italic py-2">No topics added yet. Click "+ Add Topic" above.</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── EXAM MARKS TAB ── */}
            {activeTab === 'exammarks' && (
                <div className="card shadow-md">
                    <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <BarChart2 size={20} className="text-indigo-500" />
                            Exam / Quiz Results
                        </h2>
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                onClick={handleExportExcelResults}
                                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-bold transition"
                            >
                                <FileSpreadsheet size={14} /> Export Excel
                            </button>
                            <button
                                onClick={handleExportPdfResults}
                                className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg text-xs font-bold transition"
                            >
                                <Printer size={14} /> Export PDF
                            </button>
                            <button className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200" onClick={loadQuizResults}>↻ Refresh</button>
                        </div>
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
                                        <th className="pb-3 text-center">Duration</th>
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
                                                <td className="py-3 text-center text-xs font-semibold text-gray-600">
                                                    {r.duration ? `⏱️ ${r.duration}` : '—'}
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

            {/* ── TEST HISTORY TAB ── */}
            {activeTab === 'testhistory' && (
                <div className="space-y-6">
                    {/* Filters & Actions Header */}
                    <div className="card shadow-md">
                        <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2 text-indigo-900">
                                    <BarChart2 size={20} className="text-indigo-600" />
                                    Student Test History & Marksheets ({quizResults.length})
                                </h2>
                                <p className="text-xs text-gray-500 mt-1">View history by Test Name, Student, or Date range. Print official class reports and student marksheets with branch headers.</p>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <button
                                    onClick={() => handlePrintAllTestHistory(
                                        quizResults.filter(r => {
                                            const matchesSearch = !thSearch || String(r.studentName || '').toLowerCase().includes(thSearch.toLowerCase()) || String(r.studentId || '').toLowerCase().includes(thSearch.toLowerCase());
                                            const matchesCourse = !thCourseFilter || String(r.course) === String(thCourseFilter);
                                            const matchesQuiz = !thQuizFilter || String(r.quizTitle) === String(thQuizFilter);
                                            const rDate = r.date ? new Date(r.date).toISOString().split('T')[0] : '';
                                            const matchesFrom = !thFromDate || (rDate && rDate >= thFromDate);
                                            const matchesTo = !thToDate || (rDate && rDate <= thToDate);
                                            return matchesSearch && matchesCourse && matchesQuiz && matchesFrom && matchesTo;
                                        })
                                    )}
                                    className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-xs font-bold transition shadow-sm"
                                >
                                    <Printer size={14} /> Print Summary Report
                                </button>
                                <button
                                    onClick={handleExportExcelResults}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold transition"
                                >
                                    <FileSpreadsheet size={14} /> Export Excel
                                </button>
                                <button
                                    onClick={handleExportPdfResults}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-xl text-xs font-bold transition"
                                >
                                    <Printer size={14} /> Export PDF
                                </button>
                                <button className="px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition" onClick={loadQuizResults}>↻ Refresh</button>
                            </div>
                        </div>

                        {/* View Mode Switcher */}
                        <div className="flex gap-2 mb-6 border-b border-gray-100 pb-4 flex-wrap">
                            <button
                                onClick={() => setThViewMode('all')}
                                className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${thViewMode === 'all'
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                                📋 All Records Table
                            </button>
                            <button
                                onClick={() => setThViewMode('testwise')}
                                className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${thViewMode === 'testwise'
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                                📝 Test Name Wise View
                            </button>
                            <button
                                onClick={() => setThViewMode('studentwise')}
                                className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${thViewMode === 'studentwise'
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                                👤 Student Wise View
                            </button>
                        </div>

                        {/* Search & Date Filter Controls */}
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6 bg-gray-50/80 p-4 rounded-xl border border-gray-200/80">
                            <div className="md:col-span-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">🔍 Search Student Name / Roll ID</label>
                                <input
                                    type="text"
                                    className="inp bg-white"
                                    placeholder="Search by name or roll number..."
                                    value={thSearch}
                                    onChange={e => setThSearch(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">🏫 Class / Course</label>
                                <select className="inp bg-white" value={thCourseFilter} onChange={e => setThCourseFilter(e.target.value)}>
                                    <option value="">All Classes / Courses</option>
                                    {[...new Set(quizResults.map(r => r.course).filter(Boolean))].map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">📅 From Date</label>
                                <input
                                    type="date"
                                    className="inp bg-white"
                                    value={thFromDate}
                                    onChange={e => setThFromDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">📅 To Date</label>
                                <input
                                    type="date"
                                    className="inp bg-white"
                                    value={thToDate}
                                    onChange={e => setThToDate(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Master Filtered Data */}
                        {loadingResults ? (
                            <div className="text-center py-12"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" /></div>
                        ) : quizResults.length === 0 ? (
                            <EmptyBox icon="📊" text="No student test history available" sub="Attempted student test results will appear here." />
                        ) : (() => {
                            const filtered = quizResults.filter(r => {
                                const matchesSearch = !thSearch || String(r.studentName || '').toLowerCase().includes(thSearch.toLowerCase()) || String(r.studentId || '').toLowerCase().includes(thSearch.toLowerCase());
                                const matchesCourse = !thCourseFilter || String(r.course) === String(thCourseFilter);
                                const matchesQuiz = !thQuizFilter || String(r.quizTitle) === String(thQuizFilter);
                                const rDate = r.date ? new Date(r.date).toISOString().split('T')[0] : '';
                                const matchesFrom = !thFromDate || (rDate && rDate >= thFromDate);
                                const matchesTo = !thToDate || (rDate && rDate <= thToDate);
                                return matchesSearch && matchesCourse && matchesQuiz && matchesFrom && matchesTo;
                            });

                            if (filtered.length === 0) {
                                return <EmptyBox icon="🔍" text="No matching test records found" sub="Try adjusting search criteria, course, or date filters." />;
                            }

                            // ── VIEW MODE: TEST NAME WISE ──────────────────────────────────
                            if (thViewMode === 'testwise') {
                                const testGroups = {};
                                filtered.forEach(r => {
                                    const key = `${r.quizTitle}___${r.course}`;
                                    if (!testGroups[key]) {
                                        testGroups[key] = { quizTitle: r.quizTitle, course: r.course, list: [] };
                                    }
                                    testGroups[key].list.push(r);
                                });

                                return (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {Object.values(testGroups).map((g, idx) => {
                                            const totalAttempts = g.list.length;
                                            const avgPct = Math.round(g.list.reduce((sum, item) => sum + (Number(item.percentage) || 0), 0) / (totalAttempts || 1));
                                            const maxScore = Math.max(...g.list.map(i => Number(i.score) || 0));
                                            const totalMarks = g.list[0]?.total || 0;

                                            return (
                                                <div key={idx} className="p-5 rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/30 hover:border-indigo-300 hover:shadow-lg transition flex flex-col justify-between space-y-4">
                                                    <div>
                                                        <div className="flex justify-between items-start mb-2">
                                                            <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-md font-bold text-xs">
                                                                {g.course}
                                                            </span>
                                                            <span className="text-xs font-bold text-gray-500 bg-white px-2 py-1 rounded-md border border-gray-200">
                                                                {totalAttempts} Student{totalAttempts > 1 ? 's' : ''} Attempted
                                                            </span>
                                                        </div>
                                                        <h3 className="font-extrabold text-gray-900 text-base mb-1 cursor-pointer hover:text-indigo-600 transition" onClick={() => setSelectedTestDetail(g)}>
                                                            📝 {g.quizTitle}
                                                        </h3>
                                                        <div className="grid grid-cols-2 gap-2 text-xs mt-3 bg-white p-3 rounded-xl border border-gray-100">
                                                            <div>
                                                                <span className="text-gray-400 font-semibold block">Class Avg %:</span>
                                                                <strong className="text-indigo-700 font-extrabold text-sm">{avgPct}%</strong>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-400 font-semibold block">Highest Score:</span>
                                                                <strong className="text-emerald-700 font-extrabold text-sm">{maxScore} / {totalMarks}</strong>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 pt-2 border-t border-indigo-50">
                                                        <button
                                                            onClick={() => setSelectedTestDetail(g)}
                                                            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition text-center"
                                                        >
                                                            👁️ View Student Attempts ({totalAttempts})
                                                        </button>
                                                        <button
                                                            onClick={() => handlePrintTestClassReport(g.quizTitle, g.course, g.list)}
                                                            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl font-bold text-xs transition flex items-center gap-1"
                                                            title="Print All Student Marks with Branch Header"
                                                        >
                                                            <Printer size={13} /> Print
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            }

                            // ── VIEW MODE: STUDENT WISE ────────────────────────────────────
                            if (thViewMode === 'studentwise') {
                                const studentGroups = {};
                                filtered.forEach(r => {
                                    const key = r.studentId || r.studentName;
                                    if (!studentGroups[key]) {
                                        studentGroups[key] = { studentName: r.studentName, studentId: r.studentId, course: r.course, list: [] };
                                    }
                                    studentGroups[key].list.push(r);
                                });

                                return (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {Object.values(studentGroups).map((s, idx) => {
                                            const totalQuizzes = s.list.length;
                                            const avgPct = Math.round(s.list.reduce((sum, item) => sum + (Number(item.percentage) || 0), 0) / (totalQuizzes || 1));

                                            return (
                                                <div key={idx} className="p-5 rounded-2xl border border-indigo-100 bg-white hover:border-indigo-300 hover:shadow-lg transition flex flex-col justify-between space-y-4">
                                                    <div>
                                                        <div className="flex items-center gap-3 mb-3">
                                                            <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-extrabold text-base shadow-md">
                                                                {s.studentName ? s.studentName[0].toUpperCase() : 'S'}
                                                            </div>
                                                            <div>
                                                                <h3 className="font-extrabold text-gray-900 text-base">{s.studentName}</h3>
                                                                <p className="text-xs text-gray-400 font-mono">ID: {s.studentId}</p>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                            <div>
                                                                <span className="text-gray-500 font-semibold block">Tests Taken:</span>
                                                                <strong className="text-gray-900 font-extrabold text-sm">{totalQuizzes} Quiz{totalQuizzes > 1 ? 'zes' : ''}</strong>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-500 font-semibold block">Overall Score %:</span>
                                                                <strong className="text-indigo-700 font-extrabold text-sm">{avgPct}%</strong>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                                                        <button
                                                            onClick={() => setSelectedStudentDetail(s)}
                                                            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition text-center"
                                                        >
                                                            👁️ View Quizzes ({totalQuizzes})
                                                        </button>
                                                        <button
                                                            onClick={() => handlePrintAllTestHistory(s.list)}
                                                            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl font-bold text-xs transition flex items-center gap-1"
                                                            title="Print Student Report Card"
                                                        >
                                                            <Printer size={13} /> Print
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            }

                            // ── VIEW MODE: ALL RECORDS TABLE ───────────────────────────────
                            return (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm border-collapse">
                                        <thead>
                                            <tr className="bg-indigo-50/60 text-indigo-950 font-bold text-xs uppercase border-b border-indigo-100">
                                                <th className="p-3 text-left">Student Info</th>
                                                <th className="p-3 text-left">Class / Course</th>
                                                <th className="p-3 text-left">Test / Quiz Name</th>
                                                <th className="p-3 text-center">Marks</th>
                                                <th className="p-3 text-center">Result Status</th>
                                                <th className="p-3 text-center">Duration</th>
                                                <th className="p-3 text-left">Date</th>
                                                <th className="p-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {filtered.map((r, i) => {
                                                const pct = Number(r.percentage) || (r.total > 0 ? Math.round((r.score / r.total) * 100) : 0);
                                                const passed = pct >= 40;
                                                const matchedQuiz = (publishedQuizzes || []).find(q => String(q.id) === String(r.quizId) || String(q.title).toLowerCase() === String(r.quizTitle).toLowerCase());
                                                return (
                                                    <tr key={i} className="hover:bg-gray-50/80 transition">
                                                        <td className="p-3">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                                                                    {r.studentName ? r.studentName[0].toUpperCase() : 'S'}
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-gray-900">{r.studentName}</div>
                                                                    <div className="text-xs font-mono text-gray-400">ID: {r.studentId}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-3">
                                                            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md font-bold text-xs">
                                                                {r.course}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 font-bold text-gray-800">{r.quizTitle}</td>
                                                        <td className="p-3 text-center font-bold text-gray-900 text-base">{r.score}/{r.total}</td>
                                                        <td className="p-3 text-center">
                                                            <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold ${passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                                                {pct}% {passed ? 'PASSED ✅' : 'FAILED ⚠️'}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 text-center text-xs font-semibold text-gray-600">
                                                            {r.duration ? `⏱️ ${r.duration}` : '—'}
                                                        </td>
                                                        <td className="p-3 text-xs font-medium text-gray-500">
                                                            {r.date ? new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                                        </td>
                                                        <td className="p-3 text-right space-x-2">
                                                            <button
                                                                onClick={() => setThAnalysisModal({ result: r, quiz: matchedQuiz })}
                                                                className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs rounded-lg transition inline-flex items-center gap-1 border border-indigo-200"
                                                                title="View Question Analysis"
                                                            >
                                                                <BarChart2 size={13} /> Breakdown
                                                            </button>
                                                            <button
                                                                onClick={() => handlePrintStudentMarksheet(r)}
                                                                className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs rounded-lg transition inline-flex items-center gap-1 border border-emerald-200"
                                                                title="Print Marksheet with Branch Header"
                                                            >
                                                                <Printer size={13} /> Print
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* ── DRILL DOWN MODAL: ALL STUDENTS FOR A SPECIFIC TEST NAME ── */}
            {selectedTestDetail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={e => { if (e.target === e.currentTarget) setSelectedTestDetail(null); }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
                        <div className="p-5 bg-gradient-to-r from-indigo-900 to-indigo-700 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    📝 Quiz Student Results: {selectedTestDetail.quizTitle}
                                </h3>
                                <p className="text-xs text-indigo-200 mt-0.5">
                                    Class / Course: <strong className="text-white">{selectedTestDetail.course}</strong> • Total Attempts: {selectedTestDetail.list.length}
                                </p>
                            </div>
                            <button onClick={() => setSelectedTestDetail(null)} className="text-indigo-200 hover:text-white"><X size={20} /></button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-4">
                            <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                <div>
                                    <span className="text-xs font-bold text-indigo-700 uppercase block">Total Students Attempted</span>
                                    <strong className="text-xl font-extrabold text-indigo-950">{selectedTestDetail.list.length} Students</strong>
                                </div>
                                <button
                                    onClick={() => handlePrintTestClassReport(selectedTestDetail.quizTitle, selectedTestDetail.course, selectedTestDetail.list)}
                                    className="px-4 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 font-extrabold text-xs rounded-xl transition shadow-md flex items-center gap-2"
                                >
                                    <Printer size={15} /> Print All Student Marks Report (Branch Header)
                                </button>
                            </div>

                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="bg-gray-100 text-gray-700 font-bold text-xs uppercase border-b border-gray-200">
                                        <th className="p-3 text-left">#</th>
                                        <th className="p-3 text-left">Student Name & Roll ID</th>
                                        <th className="p-3 text-center">Score / Total</th>
                                        <th className="p-3 text-center">Percentage</th>
                                        <th className="p-3 text-center">Duration</th>
                                        <th className="p-3 text-left">Date</th>
                                        <th className="p-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {selectedTestDetail.list.map((r, i) => {
                                        const pct = Number(r.percentage) || (r.total > 0 ? Math.round((r.score / r.total) * 100) : 0);
                                        const passed = pct >= 40;
                                        return (
                                            <tr key={i} className="hover:bg-gray-50 transition">
                                                <td className="p-3 font-bold text-gray-400">{i + 1}</td>
                                                <td className="p-3 font-bold text-gray-900">
                                                    {r.studentName}
                                                    <span className="block text-xs font-normal text-gray-400 font-mono">ID: {r.studentId}</span>
                                                </td>
                                                <td className="p-3 text-center font-extrabold text-gray-900">{r.score} / {r.total}</td>
                                                <td className="p-3 text-center font-bold">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                                        {pct}% ({passed ? 'PASS' : 'FAIL'})
                                                    </span>
                                                </td>
                                                <td className="p-3 text-center text-xs font-semibold text-gray-600">{r.duration || '—'}</td>
                                                <td className="p-3 text-xs text-gray-500">{r.date ? new Date(r.date).toLocaleDateString('en-IN') : '—'}</td>
                                                <td className="p-3 text-right">
                                                    <button
                                                        onClick={() => handlePrintStudentMarksheet(r)}
                                                        className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs rounded-lg transition inline-flex items-center gap-1 border border-emerald-200"
                                                    >
                                                        <Printer size={13} /> Print
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                            <button onClick={() => setSelectedTestDetail(null)} className="px-5 py-2 bg-gray-200 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-300">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── DRILL DOWN MODAL: ALL QUIZZES FOR A SPECIFIC STUDENT ── */}
            {selectedStudentDetail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={e => { if (e.target === e.currentTarget) setSelectedStudentDetail(null); }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
                        <div className="p-5 bg-gradient-to-r from-indigo-900 to-indigo-700 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    👤 Student Quiz History: {selectedStudentDetail.studentName}
                                </h3>
                                <p className="text-xs text-indigo-200 mt-0.5">
                                    Student ID: <strong className="text-white">{selectedStudentDetail.studentId}</strong> • Class: {selectedStudentDetail.course}
                                </p>
                            </div>
                            <button onClick={() => setSelectedStudentDetail(null)} className="text-indigo-200 hover:text-white"><X size={20} /></button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-4">
                            <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                <div>
                                    <span className="text-xs font-bold text-indigo-700 uppercase block">Total Quizzes Taken</span>
                                    <strong className="text-xl font-extrabold text-indigo-950">{selectedStudentDetail.list.length} Quizzes</strong>
                                </div>
                                <button
                                    onClick={() => handlePrintAllTestHistory(selectedStudentDetail.list)}
                                    className="px-4 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 font-extrabold text-xs rounded-xl transition shadow-md flex items-center gap-2"
                                >
                                    <Printer size={15} /> Print Full Academic Test Report (Branch Header)
                                </button>
                            </div>

                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="bg-gray-100 text-gray-700 font-bold text-xs uppercase border-b border-gray-200">
                                        <th className="p-3 text-left">#</th>
                                        <th className="p-3 text-left">Quiz Title</th>
                                        <th className="p-3 text-left">Course</th>
                                        <th className="p-3 text-center">Score / Total</th>
                                        <th className="p-3 text-center">Percentage</th>
                                        <th className="p-3 text-center">Duration</th>
                                        <th className="p-3 text-left">Date</th>
                                        <th className="p-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {selectedStudentDetail.list.map((r, i) => {
                                        const pct = Number(r.percentage) || (r.total > 0 ? Math.round((r.score / r.total) * 100) : 0);
                                        const passed = pct >= 40;
                                        return (
                                            <tr key={i} className="hover:bg-gray-50 transition">
                                                <td className="p-3 font-bold text-gray-400">{i + 1}</td>
                                                <td className="p-3 font-bold text-gray-900">{r.quizTitle}</td>
                                                <td className="p-3 font-semibold text-indigo-600">{r.course}</td>
                                                <td className="p-3 text-center font-extrabold text-gray-900">{r.score} / {r.total}</td>
                                                <td className="p-3 text-center font-bold">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                                        {pct}% ({passed ? 'PASS' : 'FAIL'})
                                                    </span>
                                                </td>
                                                <td className="p-3 text-center text-xs font-semibold text-gray-600">{r.duration || '—'}</td>
                                                <td className="p-3 text-xs text-gray-500">{r.date ? new Date(r.date).toLocaleDateString('en-IN') : '—'}</td>
                                                <td className="p-3 text-right">
                                                    <button
                                                        onClick={() => handlePrintStudentMarksheet(r)}
                                                        className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs rounded-lg transition inline-flex items-center gap-1 border border-emerald-200"
                                                    >
                                                        <Printer size={13} /> Print
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                            <button onClick={() => setSelectedStudentDetail(null)} className="px-5 py-2 bg-gray-200 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-300">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── TEST ANALYSIS BREAKDOWN MODAL FOR ADMIN ── */}
            {thAnalysisModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={e => { if (e.target === e.currentTarget) setThAnalysisModal(null); }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
                        <div className="p-5 bg-gradient-to-r from-indigo-900 to-indigo-700 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <BarChart2 size={20} /> Question Analysis: {thAnalysisModal.result.quizTitle}
                                </h3>
                                <p className="text-xs text-indigo-200 mt-0.5">
                                    Student: <strong className="text-white">{thAnalysisModal.result.studentName}</strong> ({thAnalysisModal.result.studentId}) • Class: {thAnalysisModal.result.course}
                                </p>
                            </div>
                            <button onClick={() => setThAnalysisModal(null)} className="text-indigo-200 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-4">
                            <div className="grid grid-cols-3 gap-3 bg-indigo-50/70 p-4 rounded-xl text-center">
                                <div>
                                    <div className="text-xs font-bold text-indigo-600 uppercase">Score</div>
                                    <div className="text-xl font-extrabold text-indigo-950">{thAnalysisModal.result.score} / {thAnalysisModal.result.total}</div>
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-indigo-600 uppercase">Percentage</div>
                                    <div className="text-xl font-extrabold text-indigo-950">{thAnalysisModal.result.percentage}%</div>
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-indigo-600 uppercase">Duration</div>
                                    <div className="text-xl font-extrabold text-indigo-950">{thAnalysisModal.result.duration || 'N/A'}</div>
                                </div>
                            </div>

                            {(!thAnalysisModal.quiz || !thAnalysisModal.quiz.questions || thAnalysisModal.quiz.questions.length === 0) ? (
                                <div className="p-4 bg-amber-50 text-amber-800 rounded-xl text-sm font-medium border border-amber-200">
                                    ⚠️ Detailed question list is not available for this legacy quiz record.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <h4 className="font-bold text-gray-800 text-sm">Questions & Answers Breakdown:</h4>
                                    {thAnalysisModal.quiz.questions.map((q, idx) => {
                                        const userAnsMap = typeof thAnalysisModal.result.answers === 'object' ? thAnalysisModal.result.answers : (() => { try { return JSON.parse(thAnalysisModal.result.answers || '{}'); } catch (e) { return {}; } })();
                                        const studentChoice = userAnsMap[idx];
                                        const isCorrect = String(studentChoice).toLowerCase() === String(q.correct).toLowerCase();
                                        return (
                                            <div key={idx} className={`p-4 rounded-xl border text-sm ${isCorrect ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'}`}>
                                                <div className="flex justify-between font-bold mb-2">
                                                    <span className="text-gray-900">Q{idx + 1}. {q.q}</span>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                                        {isCorrect ? '✓ Correct' : '✕ Incorrect'}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                    <div>
                                                        <span className="text-gray-500 font-semibold">Student Selected: </span>
                                                        <strong className={isCorrect ? 'text-emerald-700' : 'text-rose-700'}>
                                                            {studentChoice ? `${String(studentChoice).toUpperCase()}. ${q.options?.[studentChoice] || ''}` : 'Not Answered'}
                                                        </strong>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500 font-semibold">Correct Answer: </span>
                                                        <strong className="text-emerald-700">
                                                            {q.correct ? `${String(q.correct).toUpperCase()}. ${q.options?.[q.correct] || ''}` : 'N/A'}
                                                        </strong>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                            <button
                                onClick={() => handlePrintStudentMarksheet(thAnalysisModal.result)}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition flex items-center gap-1.5"
                            >
                                <Printer size={14} /> Print Marksheet Report
                            </button>
                            <button onClick={() => setThAnalysisModal(null)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-300 transition">
                                Close
                            </button>
                        </div>
                    </div>
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
