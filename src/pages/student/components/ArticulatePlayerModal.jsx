import React, { useState, useEffect } from 'react';
import { recordTopicProgress } from '../../../services/api';

export default function ArticulatePlayerModal({ isOpen, onClose, courseName = 'MS-CIT', sessions = [], studentId, completedTopicIds = [], pointsEarned = 0, onProgressUpdate, isDark = false }) {
    const [activeSessionIdx, setActiveSessionIdx] = useState(0);
    const [activeTopicIdx, setActiveTopicIdx] = useState(0);
    const [expandedSessions, setExpandedSessions] = useState({ 0: true });
    const [completedTopics, setCompletedTopics] = useState(new Set(completedTopicIds));
    const [fontSize, setFontSize] = useState(15); // base font size in px
    const [lang, setLang] = useState('English');
    const [userAnswers, setUserAnswers] = useState({});
    const [quizSubmitted, setQuizSubmitted] = useState(false);
    const [quizScore, setQuizScore] = useState(0);
    const [uploadingAssignment, setUploadingAssignment] = useState(false);
    const [assignmentFile, setAssignmentFile] = useState(null);
    const [assignmentSubmitted, setAssignmentSubmitted] = useState(false);

    useEffect(() => {
        setCompletedTopics(new Set(completedTopicIds));
    }, [completedTopicIds]);

    if (!isOpen) return null;

    // Fallback default sessions if course session tree is empty
    const activeSessions = sessions && sessions.length > 0 ? sessions : Array.from({ length: 50 }, (_, i) => {
        const sNum = String(i + 1).padStart(2, '0');
        return {
            id: `session-${i + 1}`,
            title: `Session #${sNum} ${courseName} (${i < 10 ? 'Basic Computer, SmartPhone and Typing Skills' : i < 25 ? 'Digital Skills for Daily Life and AI Tools' : 'MS Office Skills & Advanced IT Concepts'})`,
            topics: [
                {
                    id: `s${i + 1}-t1`,
                    title: `${courseName} Introduction & Core Concepts`,
                    type: 'video',
                    url: 'https://www.w3schools.com/html/mov_bbb.mp4',
                    duration: '04:55'
                },
                {
                    id: `s${i + 1}-t2`,
                    title: `Understanding Self-Learning & Digital Literacy`,
                    type: 'video',
                    url: 'https://www.w3schools.com/html/mov_bbb.mp4',
                    duration: '06:20'
                },
                {
                    id: `s${i + 1}-t3`,
                    title: `Session #${sNum} Topic Knowledge Quiz`,
                    type: 'quiz',
                    questions: [
                        { q: 'Which of the following is an input device used for large technical drawings?', options: { a: 'Plotter', b: 'Printer', c: 'Speaker', d: 'Monitor' }, correct: 'a' },
                        { q: 'What is the primary function of RAM in a computer system?', options: { a: 'Permanent Storage', b: 'Temporary High-Speed Memory', c: 'Printing Documents', d: 'Scanning Images' }, correct: 'b' }
                    ]
                },
                {
                    id: `s${i + 1}-t4`,
                    title: `Session #${sNum} Practical Hands-On Assignment`,
                    type: 'assignment',
                    instruction: 'Create a Word Document or Excel sheet summarizing today\'s digital skill topic and upload your file below.'
                }
            ]
        };
    });

    const currentSession = activeSessions[activeSessionIdx] || activeSessions[0];
    const currentTopic = currentSession?.topics?.[activeTopicIdx] || currentSession?.topics?.[0];

    const toggleSessionExpand = (idx) => {
        setExpandedSessions(prev => ({ ...prev, [idx]: !prev[idx] }));
    };

    const handleSelectTopic = (sIdx, tIdx) => {
        setActiveSessionIdx(sIdx);
        setActiveTopicIdx(tIdx);
        setUserAnswers({});
        setQuizSubmitted(false);
        setAssignmentSubmitted(false);
    };

    const handleMarkTopicComplete = async () => {
        if (!currentTopic) return;
        const tId = currentTopic.id;
        const newCompleted = new Set(completedTopics);
        newCompleted.add(tId);
        setCompletedTopics(newCompleted);

        // Record on backend
        const pointsToAward = currentTopic.type === 'quiz' ? 100 : currentTopic.type === 'assignment' ? 150 : 50;
        try {
            if (studentId) {
                await recordTopicProgress(studentId, courseName, tId, pointsToAward, activeSessionIdx + 1);
            }
        } catch (e) {
            console.error('Failed to sync topic progress:', e);
        }

        if (onProgressUpdate) {
            onProgressUpdate(Array.from(newCompleted), pointsEarned + pointsToAward);
        }

        // Auto advance to next topic
        if (activeTopicIdx < currentSession.topics.length - 1) {
            handleSelectTopic(activeSessionIdx, activeTopicIdx + 1);
        } else if (activeSessionIdx < activeSessions.length - 1) {
            setActiveSessionIdx(activeSessionIdx + 1);
            setActiveTopicIdx(0);
            setExpandedSessions(prev => ({ ...prev, [activeSessionIdx + 1]: true }));
        }
    };

    const handleQuizSubmit = () => {
        if (!currentTopic?.questions) return;
        let score = 0;
        currentTopic.questions.forEach((q, idx) => {
            if (userAnswers[idx] === q.correct) score++;
        });
        setQuizScore(score);
        setQuizSubmitted(true);
        handleMarkTopicComplete();
    };

    const handleAssignmentSubmit = (e) => {
        e.preventDefault();
        setUploadingAssignment(true);
        setTimeout(() => {
            setUploadingAssignment(false);
            setAssignmentSubmitted(true);
            handleMarkTopicComplete();
        }, 1200);
    };

    // Calculate total session completion %
    const totalTopicsCount = activeSessions.reduce((acc, s) => acc + (s.topics?.length || 0), 0);
    const completedCount = completedTopics.size;
    const completionPercent = totalTopicsCount > 0 ? Math.round((completedCount / totalTopicsCount) * 100) : 0;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 99999, background: isDark ? '#0f172a' : '#f8fafc',
            display: 'flex', flexDirection: 'column', fontFamily: "'Outfit', 'Inter', system-ui, sans-serif"
        }}>
            {/* ── TOP HEADER BAR (ERA Style) ── */}
            <header style={{
                height: 56, background: '#0284c7', color: '#ffffff',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 20px', boxShadow: '0 2px 10px rgba(0,0,0,0.15)', flexShrink: 0
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontSize: 20 }}>🎓</span>
                    <span style={{ fontWeight: 900, fontSize: 18, letterSpacing: '0.3px' }}>{courseName} — Articulate Learning System</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    {/* Mode Indicator */}
                    <div style={{
                        background: '#ffffff', color: '#0369a1', padding: '4px 14px',
                        borderRadius: 20, fontSize: 12, fontWeight: 800, border: '1px solid #bae6fd'
                    }}>
                        Mode : At ALC
                    </div>

                    {/* Speed Badge */}
                    <div style={{
                        background: 'rgba(255,255,255,0.15)', padding: '4px 12px',
                        borderRadius: 20, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6
                    }}>
                        <span style={{ color: '#4ade80' }}>📊</span> 12.73 Mbps
                    </div>

                    {/* Language Selector */}
                    <select
                        value={lang}
                        onChange={(e) => setLang(e.target.value)}
                        style={{
                            background: 'rgba(255,255,255,0.2)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.4)',
                            padding: '4px 10px', borderRadius: 8, fontSize: 13, fontWeight: 700, outline: 'none', cursor: 'pointer'
                        }}
                    >
                        <option value="English" style={{ color: '#000' }}>English</option>
                        <option value="Hindi" style={{ color: '#000' }}>🇮🇳 हिन्दी (Hindi)</option>
                        <option value="Marathi" style={{ color: '#000' }}>🇮🇳 मराठी (Marathi)</option>
                    </select>

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        style={{
                            background: '#ef4444', color: '#ffffff', border: 'none',
                            padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 900, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 6px rgba(239,68,68,0.3)'
                        }}
                    >
                        ✖ Exit
                    </button>
                </div>
            </header>

            {/* ── MAIN BODY CONTAINER (SPLIT LAYOUT) ── */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                
                {/* ── LEFT ACCORDION SYLLABUS SIDEBAR ── */}
                <div style={{
                    width: 360, background: isDark ? '#1e293b' : '#ffffff',
                    borderRight: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                    display: 'flex', flexDirection: 'column', flexShrink: 0
                }}>
                    <div style={{
                        padding: '16px 20px', borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                        background: isDark ? '#0f172a' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                    }}>
                        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: isDark ? '#f8fafc' : '#0f172a' }}>
                            Content Viewer
                        </h3>
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#0284c7', background: '#e0f2fe', padding: '3px 8px', borderRadius: 10 }}>
                            Progress: {completionPercent}%
                        </span>
                    </div>

                    {/* Sessions Accordion List */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                        {activeSessions.map((session, sIdx) => {
                            const isExpanded = expandedSessions[sIdx];
                            const isCurrentSession = sIdx === activeSessionIdx;

                            return (
                                <div key={session.id || sIdx} style={{ marginBottom: 6 }}>
                                    {/* Session Accordion Header */}
                                    <div
                                        onClick={() => toggleSessionExpand(sIdx)}
                                        style={{
                                            padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                                            background: isCurrentSession ? (isDark ? 'rgba(2,132,199,0.2)' : '#e0f2fe') : (isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc'),
                                            border: `1px solid ${isCurrentSession ? '#0284c7' : isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}`,
                                            display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.15s'
                                        }}
                                    >
                                        <span style={{ fontSize: 12, color: isCurrentSession ? '#0284c7' : '#94a3b8', transition: 'transform 0.15s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                                            ▶
                                        </span>
                                        <span style={{ fontSize: 13, fontWeight: isCurrentSession ? 800 : 700, color: isDark ? '#f1f5f9' : '#1e293b', flex: 1, lineHeight: 1.4 }}>
                                            {session.title}
                                        </span>
                                    </div>

                                    {/* Sub-topics List */}
                                    {isExpanded && (
                                        <div style={{ paddingLeft: 16, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            {session.topics?.map((topic, tIdx) => {
                                                const isCurrentTopic = sIdx === activeSessionIdx && tIdx === activeTopicIdx;
                                                const isDone = completedTopics.has(topic.id);

                                                return (
                                                    <div
                                                        key={topic.id || tIdx}
                                                        onClick={() => handleSelectTopic(sIdx, tIdx)}
                                                        style={{
                                                            padding: '9px 12px', borderRadius: 8, cursor: 'pointer',
                                                            background: isCurrentTopic ? '#0284c7' : isDone ? (isDark ? 'rgba(16,185,129,0.1)' : '#ecfdf5') : 'transparent',
                                                            color: isCurrentTopic ? '#ffffff' : isDone ? '#059669' : isDark ? '#cbd5e1' : '#475569',
                                                            fontSize: 12, fontWeight: isCurrentTopic ? 800 : 600,
                                                            display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.15s',
                                                            border: `1px solid ${isCurrentTopic ? '#0284c7' : isDone ? '#a7f3d0' : 'transparent'}`
                                                        }}
                                                    >
                                                        <span style={{ fontSize: 14 }}>
                                                            {isDone ? '✅' : topic.type === 'quiz' ? '📝' : topic.type === 'assignment' ? '📤' : '📹'}
                                                        </span>
                                                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {topic.title}
                                                        </span>
                                                        {topic.duration && (
                                                            <span style={{ fontSize: 10, opacity: 0.7 }}>
                                                                {topic.duration}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── RIGHT MAIN MEDIA & TOPIC CONTENT AREA ── */}
                <div style={{
                    flex: 1, background: isDark ? '#0f172a' : '#f8fafc',
                    display: 'flex', flexDirection: 'column', overflowY: 'auto'
                }}>
                    {/* Active Topic Header Breadcrumb */}
                    <div style={{
                        padding: '14px 24px', background: isDark ? '#1e293b' : '#ffffff',
                        borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                    }}>
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                {currentSession?.title}
                            </div>
                            <h2 style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 900, color: isDark ? '#f8fafc' : '#0f172a' }}>
                                {currentTopic?.title}
                            </h2>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {completedTopics.has(currentTopic?.id) ? (
                                <span style={{ background: '#10b981', color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 900 }}>
                                    ✓ Completed
                                </span>
                            ) : (
                                <span style={{ background: '#f59e0b', color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 900 }}>
                                    In Progress
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Active Topic Content Display */}
                    <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {/* 1. VIDEO / PRESENTATION TYPE */}
                        {(!currentTopic?.type || currentTopic?.type === 'video') && (
                            <div style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{
                                    width: '100%', maxWidth: 900, aspectRatio: '16/9', background: '#000000',
                                    borderRadius: 16, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', position: 'relative'
                                }}>
                                    {currentTopic?.url ? (
                                        currentTopic.url.includes('youtube') || currentTopic.url.includes('embed') ? (
                                            <iframe
                                                src={currentTopic.url}
                                                title={currentTopic.title}
                                                style={{ width: '100%', height: '100%', border: 'none' }}
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                            />
                                        ) : (
                                            <video
                                                controls
                                                autoPlay
                                                src={currentTopic.url}
                                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                onEnded={handleMarkTopicComplete}
                                            />
                                        )
                                    ) : (
                                        <div style={{ color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                            <span style={{ fontSize: 48 }}>📹</span>
                                            <p style={{ fontWeight: 800, marginTop: 12 }}>{currentTopic?.title}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 2. TOPIC KNOWLEDGE QUIZ TYPE */}
                        {currentTopic?.type === 'quiz' && (
                            <div style={{ maxWidth: 800, width: '100%', margin: '0 auto', background: isDark ? '#1e293b' : '#ffffff', padding: 24, borderRadius: 16, border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}` }}>
                                <h3 style={{ marginTop: 0, color: '#0284c7', fontSize: 16, fontWeight: 900 }}>
                                    📝 Topic Knowledge Check Quiz
                                </h3>

                                {!quizSubmitted ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 16 }}>
                                        {currentTopic.questions?.map((qObj, qIdx) => (
                                            <div key={qIdx} style={{ padding: 16, borderRadius: 12, background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#cbd5e1'}` }}>
                                                <p style={{ fontWeight: 800, fontSize: fontSize, color: isDark ? '#f8fafc' : '#0f172a', margin: '0 0 12px' }}>
                                                    Q{qIdx + 1}. {qObj.q}
                                                </p>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                                    {Object.entries(qObj.options || {}).map(([optKey, optText]) => (
                                                        <button
                                                            key={optKey}
                                                            type="button"
                                                            onClick={() => setUserAnswers(prev => ({ ...prev, [qIdx]: optKey }))}
                                                            style={{
                                                                padding: '10px 14px', borderRadius: 8, border: `2px solid ${userAnswers[qIdx] === optKey ? '#0284c7' : isDark ? '#334155' : '#cbd5e1'}`,
                                                                background: userAnswers[qIdx] === optKey ? 'rgba(2,132,199,0.1)' : 'transparent',
                                                                color: userAnswers[qIdx] === optKey ? '#0284c7' : isDark ? '#cbd5e1' : '#334155',
                                                                fontWeight: 700, cursor: 'pointer', textAlign: 'left'
                                                            }}
                                                        >
                                                            <strong>{optKey.toUpperCase()}.</strong> {optText}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}

                                        <button
                                            onClick={handleQuizSubmit}
                                            style={{
                                                background: '#0284c7', color: '#ffffff', padding: '12px 24px', borderRadius: 10,
                                                border: 'none', fontWeight: 900, fontSize: 14, cursor: 'pointer', alignSelf: 'flex-start'
                                            }}
                                        >
                                            Submit Topic Quiz & Earn Points 🚀
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '30px 0' }}>
                                        <span style={{ fontSize: 48 }}>🎉</span>
                                        <h3 style={{ fontSize: 20, fontWeight: 900, color: '#10b981', margin: '12px 0 6px' }}>
                                            Quiz Completed! Score: {quizScore} / {currentTopic.questions?.length}
                                        </h3>
                                        <p style={{ color: '#64748b', fontSize: 14 }}>
                                            You earned +100 Internal Points! Progress recorded.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 3. PRACTICAL ASSIGNMENT TYPE */}
                        {currentTopic?.type === 'assignment' && (
                            <div style={{ maxWidth: 800, width: '100%', margin: '0 auto', background: isDark ? '#1e293b' : '#ffffff', padding: 24, borderRadius: 16, border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}` }}>
                                <h3 style={{ marginTop: 0, color: '#0284c7', fontSize: 16, fontWeight: 900 }}>
                                    📤 Practical Task & Assignment Upload
                                </h3>
                                <p style={{ fontSize: fontSize, color: isDark ? '#cbd5e1' : '#334155', lineHeight: 1.6 }}>
                                    {currentTopic.instruction || 'Upload your completed practical exercise file (PDF, Word, Excel, or Zip).'}
                                </p>

                                {!assignmentSubmitted ? (
                                    <form onSubmit={handleAssignmentSubmit} style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        <input
                                            type="file"
                                            onChange={(e) => setAssignmentFile(e.target.files[0])}
                                            style={{ padding: 12, borderRadius: 10, border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`, background: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#fff' : '#000' }}
                                        />
                                        <button
                                            type="submit"
                                            disabled={uploadingAssignment}
                                            style={{
                                                background: '#059669', color: '#ffffff', padding: '12px 24px', borderRadius: 10,
                                                border: 'none', fontWeight: 900, fontSize: 14, cursor: 'pointer', alignSelf: 'flex-start'
                                            }}
                                        >
                                            {uploadingAssignment ? 'Uploading File...' : 'Upload & Complete Assignment 📤'}
                                        </button>
                                    </form>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '30px 0' }}>
                                        <span style={{ fontSize: 48 }}>✅</span>
                                        <h3 style={{ fontSize: 18, fontWeight: 900, color: '#10b981', margin: '12px 0 6px' }}>
                                            Assignment Submitted Successfully!
                                        </h3>
                                        <p style={{ color: '#64748b', fontSize: 14 }}>
                                            Earned +150 Internal Points!
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── BOTTOM FOOTER CONTROLS BAR (ERA Style) ── */}
                    <div style={{
                        padding: '12px 24px', background: isDark ? '#1e293b' : '#ffffff',
                        borderTop: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                    }}>
                        {/* Font Size Adjusters */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginRight: 4 }}>Font:</span>
                            <button onClick={() => setFontSize(f => Math.max(12, f - 2))} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: 800 }}>A-</button>
                            <button onClick={() => setFontSize(15)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: 800 }}>A</button>
                            <button onClick={() => setFontSize(f => Math.min(22, f + 2))} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: 800 }}>A+</button>
                        </div>

                        {/* Navigation Buttons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <button
                                onClick={() => {
                                    if (activeTopicIdx > 0) handleSelectTopic(activeSessionIdx, activeTopicIdx - 1);
                                    else if (activeSessionIdx > 0) handleSelectTopic(activeSessionIdx - 1, activeSessions[activeSessionIdx - 1].topics.length - 1);
                                }}
                                style={{
                                    padding: '8px 16px', borderRadius: 8, border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
                                    background: 'transparent', color: isDark ? '#cbd5e1' : '#475569', fontWeight: 800, fontSize: 13, cursor: 'pointer'
                                }}
                            >
                                ⬅ Previous Topic
                            </button>

                            <button
                                onClick={handleMarkTopicComplete}
                                style={{
                                    padding: '8px 20px', borderRadius: 8, border: 'none',
                                    background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                                    color: '#ffffff', fontWeight: 900, fontSize: 13, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(2,132,199,0.3)'
                                }}
                            >
                                Mark Complete & Next ➡
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
