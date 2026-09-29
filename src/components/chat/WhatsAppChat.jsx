/**
 * ====================================================================
 * WhatsAppChat.jsx - Full-Featured WhatsApp-Style Chat & Community System
 * ====================================================================
 * Features:
 *  - 1-to-1 Direct Chat (Teacher <-> Student, Admin <-> Student)
 *  - Course-Wise Groups (MS-CIT, TALLY, etc.)
 *  - Batch Timing-Wise Groups (08:00 AM TO 09:30 AM, etc.)
 *  - Community Announcements Broadcast Channel
 *  - Admin / Teacher Custom Group Creator with 1-Click Batch Populator
 *  - Media Sharing: Pictures (Images), Videos, PDF Documents & Study Notes
 *  - Message Management: Delete for Me, Delete for Everyone
 *  - Star / Bookmark Messages & Saved Notes Drawer
 *  - Real-Time WhatsApp UI with Double-Ticks (✓✓), Lightbox & Emoji Tray
 * ====================================================================
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageSquare,
    Send,
    Paperclip,
    Smile,
    Image as ImageIcon,
    Video as VideoIcon,
    FileText,
    Trash2,
    Star,
    Check,
    CheckCheck,
    Search,
    Users,
    User,
    Plus,
    MoreVertical,
    Download,
    Eye,
    X,
    Filter,
    Clock,
    Sparkles,
    Bookmark,
    ArrowLeft,
    Share2,
    Calendar,
    GraduationCap,
    Lock,
    ExternalLink,
    Copy,
    RefreshCw
} from 'lucide-react';
import {
    getChatConversations,
    getChatMessages,
    sendChatMessage,
    deleteChatMessage,
    starChatMessage,
    createChatGroup,
    uploadChatMedia
} from '../../services/api';
import { showToast } from '../ui/Toast';

// Common Quick Emojis
const QUICK_EMOJIS = ['👍', '❤️', '👏', '🎉', '🙏', '🔥', '📚', '✅', '💯', '😊', '🤝', '💡', '❓', '🚀'];

// Wallpaper Styles
const WALLPAPER_LIGHT = 'radial-gradient(#d1fae5 0.75px, transparent 0.75px), radial-gradient(#e0e7ff 0.75px, #f8fafc 0.75px)';
const WALLPAPER_DARK = 'radial-gradient(#1e293b 1px, transparent 1px), radial-gradient(#0f172a 1px, #0b0f19 1px)';

export default function WhatsAppChat({
    currentUser = {},
    userRole = 'student', // 'student' | 'teacher' | 'admin' | 'employee'
    isDark = false,
    initialConversationId = null
}) {
    // Current user identification
    const myId = String(currentUser?.studentId || currentUser?.id || currentUser?.userId || currentUser?.username || 'user');
    const myName = currentUser?.name || currentUser?.studentName || currentUser?.username || 'User';
    const myBranch = currentUser?.branch || '';

    // Data State
    const [conversations, setConversations] = useState([]);
    const [activeConvId, setActiveConvId] = useState(initialConversationId);
    const [messages, setMessages] = useState([]);
    const [loadingConvs, setLoadingConvs] = useState(true);
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const [studentDirectory, setStudentDirectory] = useState([]);
    const [availableCourses, setAvailableCourses] = useState([]);
    const [availableBatches, setAvailableBatches] = useState([]);

    // UI State
    const [activeTab, setActiveTab] = useState('all'); // 'all' | 'direct' | 'groups' | 'community' | 'starred'
    const [searchQuery, setSearchQuery] = useState('');
    const [inputText, setInputText] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const [uploadingMedia, setUploadingMedia] = useState(false);
    const [uploadProgressText, setUploadProgressText] = useState('');
    const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
    const [showStudentDirModal, setShowStudentDirModal] = useState(false);
    const [showStarredDrawer, setShowStarredDrawer] = useState(false);
    const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
    const [previewMedia, setPreviewMedia] = useState(null); // Lightbox for image/video

    // Message Action Menu state
    const [selectedMsgForMenu, setSelectedMsgForMenu] = useState(null);
    const [deleteModalState, setDeleteModalState] = useState(null); // { message, forEveryoneAllowed }

    // Refs
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const [fileUploadType, setFileUploadType] = useState('image'); // 'image' | 'video' | 'pdf'

    // Polling interval ref
    const pollingTimerRef = useRef(null);

    // ─────────────────────────────────────────────────────────────
    // Load Conversations
    // ─────────────────────────────────────────────────────────────
    const loadConversations = async (keepActive = true) => {
        try {
            const res = await getChatConversations(myId, userRole, myName, myBranch);
            if (res && res.success) {
                setConversations(res.conversations || []);
                setStudentDirectory(res.studentDirectory || []);
                setAvailableCourses(res.availableCourses || []);
                setAvailableBatches(res.availableBatches || []);

                // If no active conversation, pick the first one
                if (!keepActive || !activeConvId) {
                    if (res.conversations && res.conversations.length > 0) {
                        setActiveConvId(res.conversations[0].id);
                    }
                }
            }
        } catch (e) {
            console.error('[loadConversations] error:', e);
        } finally {
            setLoadingConvs(false);
        }
    };

    useEffect(() => {
        loadConversations(false);
    }, [myId, userRole]);

    // ─────────────────────────────────────────────────────────────
    // Load Messages for Active Conversation
    // ─────────────────────────────────────────────────────────────
    const loadMessages = async (convId) => {
        if (!convId) return;
        setLoadingMsgs(true);
        try {
            const res = await getChatMessages(convId, myId);
            if (res && res.success) {
                setMessages(res.messages || []);
            }
        } catch (e) {
            console.error('[loadMessages] error:', e);
        } finally {
            setLoadingMsgs(false);
        }
    };

    useEffect(() => {
        if (activeConvId) {
            loadMessages(activeConvId);
        }
    }, [activeConvId]);

    // Periodic sync every 8 seconds for new messages
    useEffect(() => {
        if (!activeConvId) return;
        pollingTimerRef.current = setInterval(() => {
            getChatMessages(activeConvId, myId).then(res => {
                if (res && res.success) {
                    setMessages(prev => {
                        if (res.messages.length !== prev.length ||
                            (res.messages.length > 0 && prev.length > 0 &&
                             res.messages[res.messages.length - 1].id !== prev[prev.length - 1].id)) {
                            return res.messages;
                        }
                        return prev;
                    });
                }
            }).catch(() => {});
        }, 8000);

        return () => {
            if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
        };
    }, [activeConvId, myId]);

    // Auto-scroll to bottom of chat
    const scrollToBottom = (smooth = true) => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
        }
    };

    useEffect(() => {
        scrollToBottom(false);
    }, [messages]);

    // ─────────────────────────────────────────────────────────────
    // Active Conversation Object
    // ─────────────────────────────────────────────────────────────
    const activeConversation = useMemo(() => {
        return conversations.find(c => c.id === activeConvId) || null;
    }, [conversations, activeConvId]);

    // ─────────────────────────────────────────────────────────────
    // Send Text Message
    // ─────────────────────────────────────────────────────────────
    const handleSendMessage = async (mediaDetails = null) => {
        const textToSend = inputText.trim();
        if (!textToSend && !mediaDetails) return;
        if (!activeConvId) return;

        // Optimistic message object
        const tempMsgId = 'TEMP-' + Date.now();
        const optimisticMsg = {
            id: tempMsgId,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            conversationId: activeConvId,
            type: activeConversation?.type || 'direct',
            senderId: myId,
            senderName: myName,
            senderRole: userRole,
            recipientId: activeConversation?.studentId || activeConversation?.recipientId || '',
            text: textToSend,
            mediaUrl: mediaDetails?.url || '',
            mediaType: mediaDetails?.mediaType || 'none',
            fileName: mediaDetails?.fileName || '',
            fileSize: mediaDetails?.fileSize || '',
            deletedEveryone: false,
            isStarred: false,
            sending: true
        };

        setMessages(prev => [...prev, optimisticMsg]);
        setInputText('');
        setShowEmojiPicker(false);
        setShowAttachMenu(false);
        scrollToBottom(true);

        try {
            const payload = {
                conversationId: activeConvId,
                type: activeConversation?.type || 'direct',
                senderId: myId,
                senderName: myName,
                senderRole: userRole,
                recipientId: activeConversation?.studentId || activeConversation?.recipientId || '',
                text: textToSend,
                mediaUrl: mediaDetails?.url || '',
                mediaType: mediaDetails?.mediaType || 'none',
                fileName: mediaDetails?.fileName || '',
                fileSize: mediaDetails?.fileSize ? String(mediaDetails.fileSize) : '',
            };

            const res = await sendChatMessage(payload);
            if (res && res.success && res.message) {
                setMessages(prev => prev.map(m => m.id === tempMsgId ? res.message : m));
            } else {
                setMessages(prev => prev.map(m => m.id === tempMsgId ? { ...m, sending: false, failed: true } : m));
                showToast('Failed to deliver message');
            }
        } catch (e) {
            console.error('[sendChatMessage] error:', e);
            setMessages(prev => prev.map(m => m.id === tempMsgId ? { ...m, sending: false, failed: true } : m));
        }
    };

    // ─────────────────────────────────────────────────────────────
    // Handle File Attachment Selection
    // ─────────────────────────────────────────────────────────────
    const triggerFilePicker = (type) => {
        setFileUploadType(type);
        setShowAttachMenu(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
            if (type === 'image') fileInputRef.current.accept = 'image/*';
            else if (type === 'video') fileInputRef.current.accept = 'video/*';
            else fileInputRef.current.accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt';
            fileInputRef.current.click();
        }
    };

    const handleFileSelected = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 25 * 1024 * 1024) {
            alert('File size exceeds 25 MB limit. Please select a smaller file.');
            return;
        }

        setUploadingMedia(true);
        setUploadProgressText(`Uploading ${file.name}...`);

        try {
            const uploadRes = await uploadChatMedia(file, myId);
            if (uploadRes && uploadRes.success) {
                const mediaDetails = {
                    url: uploadRes.directUrl || uploadRes.url,
                    mediaType: fileUploadType === 'image' ? 'image' : (fileUploadType === 'video' ? 'video' : 'pdf'),
                    fileName: file.name,
                    fileSize: file.size ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : ''
                };
                await handleSendMessage(mediaDetails);
                showToast(`Sent ${file.name} 📎`);
            } else {
                alert('Upload failed: ' + (uploadRes?.error || 'Unknown error'));
            }
        } catch (err) {
            console.error('[handleFileSelected] error:', err);
            alert('File upload error');
        } finally {
            setUploadingMedia(false);
            setUploadProgressText('');
        }
    };

    // ─────────────────────────────────────────────────────────────
    // Delete Message
    // ─────────────────────────────────────────────────────────────
    const handleConfirmDelete = async (forEveryone) => {
        if (!deleteModalState?.message) return;
        const msgId = deleteModalState.message.id;
        try {
            const res = await deleteChatMessage(msgId, myId, forEveryone);
            if (res && res.success) {
                if (forEveryone) {
                    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, deletedEveryone: true, text: '', mediaUrl: '' } : m));
                    showToast('Message deleted for everyone 🚫');
                } else {
                    setMessages(prev => prev.filter(m => m.id !== msgId));
                    showToast('Message deleted for you 🗑️');
                }
            } else {
                alert(res?.error || 'Could not delete message');
            }
        } catch (e) {
            console.error('[deleteChatMessage] error:', e);
        } finally {
            setDeleteModalState(null);
        }
    };

    // ─────────────────────────────────────────────────────────────
    // Star / Bookmark Message
    // ─────────────────────────────────────────────────────────────
    const handleToggleStar = async (msg) => {
        const nextStarred = !msg.isStarred;
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isStarred: nextStarred } : m));
        try {
            await starChatMessage(msg.id, myId, nextStarred);
            showToast(nextStarred ? 'Message starred & saved ⭐' : 'Message unstarred');
        } catch (e) {
            console.error('[starChatMessage] error:', e);
        }
    };

    // ─────────────────────────────────────────────────────────────
    // Filtered Conversations List
    // ─────────────────────────────────────────────────────────────
    const filteredConversations = useMemo(() => {
        return conversations.filter(c => {
            if (activeTab === 'direct' && c.type !== 'direct') return false;
            if (activeTab === 'groups' && c.type !== 'course' && c.type !== 'batch' && c.type !== 'group') return false;
            if (activeTab === 'community' && c.type !== 'community') return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchName = c.name?.toLowerCase().includes(q);
                const matchSubtitle = c.subtitle?.toLowerCase().includes(q);
                const matchLastMsg = c.lastMessage?.text?.toLowerCase().includes(q);
                return matchName || matchSubtitle || matchLastMsg;
            }
            return true;
        });
    }, [conversations, activeTab, searchQuery]);

    const starredMessages = useMemo(() => {
        return messages.filter(m => m.isStarred && !m.deletedEveryone);
    }, [messages]);

    return (
        <div
            style={{
                display: 'flex',
                height: 'calc(100vh - 120px)',
                minHeight: '580px',
                background: isDark ? '#0c0f17' : '#ffffff',
                borderRadius: 20,
                border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
                overflow: 'hidden',
                boxShadow: isDark
                    ? '0 20px 40px -10px rgba(0,0,0,0.7)'
                    : '0 20px 40px -10px rgba(15,23,42,0.08)',
                fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif",
                position: 'relative'
            }}
        >
            {/* Hidden Input for Attachments */}
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileSelected}
            />

            {/* ========================================================= */}
            {/* LEFT PANE: CONVERSATION DIRECTORY & CHATS LIST           */}
            {/* ========================================================= */}
            <div
                style={{
                    width: '360px',
                    maxWidth: '100%',
                    flexShrink: 0,
                    borderRight: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    background: isDark ? '#111624' : '#f8fafc',
                }}
            >
                {/* Header: User Profile & Actions */}
                <div
                    style={{
                        padding: '16px',
                        borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: isDark ? '#141b2d' : '#ffffff',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ffffff',
                                fontWeight: 800,
                                fontSize: 16,
                                position: 'relative'
                            }}
                        >
                            {myName.charAt(0).toUpperCase()}
                            <div
                                style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    right: 0,
                                    width: 10,
                                    height: 10,
                                    borderRadius: '50%',
                                    background: '#10b981',
                                    border: '2px solid #ffffff'
                                }}
                            />
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: 14, color: isDark ? '#f1f5f9' : '#0f172a' }}>
                                {myName}
                            </div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                                {userRole.toUpperCase()} • Online
                            </div>
                        </div>
                    </div>

                    {/* Top Action Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {userRole !== 'student' && (
                            <button
                                onClick={() => setShowStudentDirModal(true)}
                                title="Direct Message Student"
                                style={{
                                    padding: '7px',
                                    borderRadius: 10,
                                    background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                                    border: 'none',
                                    color: isDark ? '#cbd5e1' : '#475569',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <User size={16} />
                            </button>
                        )}

                        {userRole !== 'student' && (
                            <button
                                onClick={() => setShowCreateGroupModal(true)}
                                title="Create Course / Batch Group"
                                style={{
                                    padding: '7px 10px',
                                    borderRadius: 10,
                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                    border: 'none',
                                    color: '#ffffff',
                                    fontWeight: 700,
                                    fontSize: 11,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4
                                }}
                            >
                                <Plus size={14} /> New Group
                            </button>
                        )}

                        <button
                            onClick={() => loadConversations(true)}
                            title="Refresh Chats"
                            style={{
                                padding: '7px',
                                borderRadius: 10,
                                background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                                border: 'none',
                                color: isDark ? '#cbd5e1' : '#475569',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <RefreshCw size={15} />
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div style={{ padding: '12px 16px', background: isDark ? '#141b2d' : '#ffffff' }}>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
                            padding: '8px 12px',
                            borderRadius: 12,
                            border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0'
                        }}
                    >
                        <Search size={15} color="#94a3b8" />
                        <input
                            type="text"
                            placeholder="Search chats, groups, students..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                border: 'none',
                                background: 'transparent',
                                outline: 'none',
                                width: '100%',
                                fontSize: 13,
                                color: isDark ? '#f1f5f9' : '#0f172a'
                            }}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Filter Tabs */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '6px 12px',
                        gap: 6,
                        borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0',
                        background: isDark ? '#111624' : '#f8fafc',
                        overflowX: 'auto'
                    }}
                >
                    {[
                        { id: 'all', label: 'All', icon: <MessageSquare size={13} /> },
                        { id: 'direct', label: 'Direct', icon: <User size={13} /> },
                        { id: 'groups', label: 'Groups', icon: <Users size={13} /> },
                        { id: 'community', label: '📢 Community', icon: null },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                padding: '5px 10px',
                                borderRadius: 8,
                                border: 'none',
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                background: activeTab === tab.id
                                    ? (isDark ? '#2563eb' : '#059669')
                                    : (isDark ? 'rgba(255,255,255,0.04)' : '#e2e8f0'),
                                color: activeTab === tab.id ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b'),
                                transition: 'all 0.15s ease',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {/* Conversation List Items */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {loadingConvs ? (
                        <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                            Loading conversations...
                        </div>
                    ) : filteredConversations.length === 0 ? (
                        <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                            <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: isDark ? '#cbd5e1' : '#475569' }}>
                                No chats found
                            </div>
                            <div style={{ fontSize: 12, marginTop: 4 }}>
                                {searchQuery ? 'Try another search term' : 'Start a new conversation or group'}
                            </div>
                        </div>
                    ) : (
                        filteredConversations.map(conv => {
                            const isSelected = conv.id === activeConvId;
                            const isGroup = conv.isGroup || conv.type === 'course' || conv.type === 'batch' || conv.type === 'group' || conv.type === 'community';

                            return (
                                <div
                                    key={conv.id}
                                    onClick={() => setActiveConvId(conv.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                        padding: '12px 16px',
                                        cursor: 'pointer',
                                        borderBottom: isDark ? '1px solid rgba(255,255,255,0.04)' : '1px solid #f1f5f9',
                                        background: isSelected
                                            ? (isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(5, 150, 105, 0.08)')
                                            : 'transparent',
                                        borderLeft: isSelected
                                            ? `4px solid ${isDark ? '#10b981' : '#059669'}`
                                            : '4px solid transparent',
                                        transition: 'background 0.15s ease'
                                    }}
                                >
                                    {/* Avatar */}
                                    <div
                                        style={{
                                            width: 44,
                                            height: 44,
                                            borderRadius: isGroup ? 14 : '50%',
                                            background: isGroup
                                                ? (conv.type === 'community' ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : 'linear-gradient(135deg, #6366f1, #06b6d4)')
                                                : 'linear-gradient(135deg, #10b981, #14b8a6)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: 20,
                                            color: '#ffffff',
                                            fontWeight: 800,
                                            flexShrink: 0
                                        }}
                                    >
                                        {conv.avatar || (isGroup ? '👥' : '👤')}
                                    </div>

                                    {/* Info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                                            <div
                                                style={{
                                                    fontWeight: isSelected ? 800 : 700,
                                                    fontSize: 13,
                                                    color: isDark ? '#f1f5f9' : '#0f172a',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis'
                                                }}
                                            >
                                                {conv.name}
                                            </div>
                                            {conv.lastMessageTime && (
                                                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, flexShrink: 0 }}>
                                                    {conv.lastMessageTime.split(' ')[1] || conv.lastMessageTime}
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                                            <div
                                                style={{
                                                    fontSize: 12,
                                                    color: isDark ? '#94a3b8' : '#64748b',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    fontWeight: 500
                                                }}
                                            >
                                                {conv.lastMessage ? (
                                                    <span>
                                                        {conv.lastMessage.senderName ? `${conv.lastMessage.senderName}: ` : ''}
                                                        {conv.lastMessage.mediaType === 'image' && '📷 Photo'}
                                                        {conv.lastMessage.mediaType === 'video' && '🎥 Video'}
                                                        {conv.lastMessage.mediaType === 'pdf' && `📄 ${conv.lastMessage.fileName || 'Document'}`}
                                                        {conv.lastMessage.text && conv.lastMessage.mediaType === 'none' && conv.lastMessage.text}
                                                    </span>
                                                ) : (
                                                    <span style={{ fontStyle: 'italic', opacity: 0.8 }}>{conv.subtitle || 'No messages yet'}</span>
                                                )}
                                            </div>

                                            {conv.type === 'batch' && (
                                                <span
                                                    style={{
                                                        fontSize: 9,
                                                        fontWeight: 800,
                                                        padding: '1px 6px',
                                                        borderRadius: 4,
                                                        background: isDark ? 'rgba(99,102,241,0.2)' : '#e0e7ff',
                                                        color: isDark ? '#818cf8' : '#4338ca',
                                                        flexShrink: 0
                                                    }}
                                                >
                                                    BATCH
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ========================================================= */}
            {/* RIGHT PANE: ACTIVE CHAT SCREEN                           */}
            {/* ========================================================= */}
            <div
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    background: isDark ? '#0b0f19' : '#fafafa',
                    position: 'relative'
                }}
            >
                {activeConversation ? (
                    <>
                        {/* ── Chat Header ── */}
                        <div
                            style={{
                                padding: '12px 20px',
                                borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
                                background: isDark ? '#111624' : '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                zIndex: 10
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div
                                    style={{
                                        width: 42,
                                        height: 42,
                                        borderRadius: activeConversation.isGroup ? 12 : '50%',
                                        background: activeConversation.isGroup
                                            ? (activeConversation.type === 'community' ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : 'linear-gradient(135deg, #6366f1, #06b6d4)')
                                            : 'linear-gradient(135deg, #10b981, #14b8a6)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 20,
                                        color: '#ffffff',
                                        fontWeight: 800
                                    }}
                                >
                                    {activeConversation.avatar || (activeConversation.isGroup ? '👥' : '👤')}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: 15, color: isDark ? '#f1f5f9' : '#0f172a' }}>
                                        {activeConversation.name}
                                    </div>
                                    <div style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 }}>
                                        {activeConversation.subtitle || (activeConversation.isGroup ? `${activeConversation.membersCount || 0} members` : 'Direct Session')}
                                    </div>
                                </div>
                            </div>

                            {/* Header Action Icons */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <button
                                    onClick={() => setShowStarredDrawer(true)}
                                    title="View Starred / Saved Notes"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        padding: '7px 12px',
                                        borderRadius: 10,
                                        background: isDark ? 'rgba(245,158,11,0.15)' : '#fef3c7',
                                        border: '1px solid rgba(245,158,11,0.3)',
                                        color: isDark ? '#fbbf24' : '#b45309',
                                        fontSize: 12,
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Bookmark size={14} /> Saved Notes ({starredMessages.length})
                                </button>
                            </div>
                        </div>

                        {/* ── Message Stream (WhatsApp Doodle Canvas) ── */}
                        <div
                            style={{
                                flex: 1,
                                overflowY: 'auto',
                                padding: '20px',
                                backgroundImage: isDark ? WALLPAPER_DARK : WALLPAPER_LIGHT,
                                backgroundSize: '20px 20px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 12
                            }}
                        >
                            <div style={{ textAlign: 'center', margin: '4px 0 12px' }}>
                                <span
                                    style={{
                                        fontSize: 11,
                                        fontWeight: 600,
                                        color: isDark ? '#94a3b8' : '#64748b',
                                        background: isDark ? 'rgba(15,23,42,0.85)' : '#ffffff',
                                        padding: '4px 14px',
                                        borderRadius: 20,
                                        border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                                    }}
                                >
                                    🔒 Institute messages are protected & archived for academic records
                                </span>
                            </div>

                            {loadingMsgs ? (
                                <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                                    Loading messages...
                                </div>
                            ) : messages.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
                                    <div style={{ fontSize: 40, marginBottom: 8 }}>💬</div>
                                    <div style={{ fontWeight: 800, fontSize: 16, color: isDark ? '#cbd5e1' : '#334155' }}>
                                        No messages in this conversation yet
                                    </div>
                                    <div style={{ fontSize: 13, marginTop: 4 }}>
                                        Send a text, share a picture, question, or study notes below!
                                    </div>
                                </div>
                            ) : (
                                messages.map((msg, idx) => {
                                    const isMe = String(msg.senderId || '').toLowerCase() === myId.toLowerCase();
                                    const isDeleted = msg.deletedEveryone;

                                    return (
                                        <div
                                            key={msg.id || idx}
                                            style={{
                                                display: 'flex',
                                                justifyContent: isMe ? 'flex-end' : 'flex-start',
                                                position: 'relative'
                                            }}
                                        >
                                            <div
                                                style={{
                                                    maxWidth: '75%',
                                                    minWidth: '140px',
                                                    borderRadius: 16,
                                                    borderTopRightRadius: isMe ? 4 : 16,
                                                    borderTopLeftRadius: !isMe ? 4 : 16,
                                                    padding: '10px 14px',
                                                    background: isDeleted
                                                        ? (isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2')
                                                        : isMe
                                                            ? (isDark ? 'linear-gradient(135deg, #065f46, #047857)' : 'linear-gradient(135deg, #dcf8c6, #d1fae5)')
                                                            : (isDark ? '#1e293b' : '#ffffff'),
                                                    color: isMe
                                                        ? (isDark ? '#ecfdf5' : '#064e3b')
                                                        : (isDark ? '#f1f5f9' : '#0f172a'),
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                                    border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0',
                                                    position: 'relative',
                                                    wordBreak: 'break-word'
                                                }}
                                            >
                                                {!isMe && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                                        <span
                                                            style={{
                                                                fontWeight: 800,
                                                                fontSize: 12,
                                                                color: msg.senderRole === 'admin'
                                                                    ? '#ef4444'
                                                                    : (msg.senderRole === 'teacher' ? '#3b82f6' : '#10b981')
                                                            }}
                                                        >
                                                            {msg.senderName || 'Member'}
                                                        </span>
                                                        <span
                                                            style={{
                                                                fontSize: 9,
                                                                fontWeight: 800,
                                                                textTransform: 'uppercase',
                                                                padding: '1px 5px',
                                                                borderRadius: 4,
                                                                background: msg.senderRole === 'admin'
                                                                    ? 'rgba(239,68,68,0.15)'
                                                                    : (msg.senderRole === 'teacher' ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)'),
                                                                color: msg.senderRole === 'admin' ? '#ef4444' : (msg.senderRole === 'teacher' ? '#3b82f6' : '#10b981')
                                                            }}
                                                        >
                                                            {msg.senderRole}
                                                        </span>
                                                    </div>
                                                )}

                                                {isDeleted ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontStyle: 'italic', color: '#94a3b8', fontSize: 13 }}>
                                                        <Trash2 size={14} /> This message was deleted
                                                    </div>
                                                ) : (
                                                    <>
                                                        {msg.mediaType === 'image' && msg.mediaUrl && (
                                                            <div style={{ marginBottom: 8, borderRadius: 12, overflow: 'hidden', cursor: 'pointer' }}>
                                                                <img
                                                                    src={msg.mediaUrl}
                                                                    alt={msg.fileName || 'Attachment'}
                                                                    onClick={() => setPreviewMedia({ type: 'image', url: msg.mediaUrl, name: msg.fileName })}
                                                                    style={{ width: '100%', maxHeight: '280px', objectFit: 'cover', display: 'block', borderRadius: 12 }}
                                                                    loading="lazy"
                                                                />
                                                            </div>
                                                        )}

                                                        {msg.mediaType === 'video' && msg.mediaUrl && (
                                                            <div style={{ marginBottom: 8, borderRadius: 12, overflow: 'hidden' }}>
                                                                <video
                                                                    src={msg.mediaUrl}
                                                                    controls
                                                                    style={{ width: '100%', maxHeight: '280px', borderRadius: 12 }}
                                                                />
                                                            </div>
                                                        )}

                                                        {msg.mediaType === 'pdf' && (
                                                            <div
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 12,
                                                                    padding: '10px 14px',
                                                                    borderRadius: 12,
                                                                    background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.7)',
                                                                    border: '1px solid rgba(0,0,0,0.08)',
                                                                    marginBottom: 8
                                                                }}
                                                            >
                                                                <div
                                                                    style={{
                                                                        width: 36,
                                                                        height: 36,
                                                                        borderRadius: 8,
                                                                        background: '#ef4444',
                                                                        color: '#ffffff',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        flexShrink: 0
                                                                    }}
                                                                >
                                                                    <FileText size={18} />
                                                                </div>
                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                    <div style={{ fontWeight: 800, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                        {msg.fileName || 'Study Document.pdf'}
                                                                    </div>
                                                                    <div style={{ fontSize: 11, color: '#94a3b8' }}>
                                                                        {msg.fileSize || 'PDF Document'}
                                                                    </div>
                                                                </div>
                                                                {msg.mediaUrl && (
                                                                    <a
                                                                        href={msg.mediaUrl}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        download={msg.fileName}
                                                                        title="Download Document"
                                                                        style={{
                                                                            padding: '6px 10px',
                                                                            borderRadius: 8,
                                                                            background: '#3b82f6',
                                                                            color: '#ffffff',
                                                                            fontSize: 11,
                                                                            fontWeight: 700,
                                                                            textDecoration: 'none',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: 4
                                                                        }}
                                                                    >
                                                                        <Download size={12} /> View
                                                                    </a>
                                                                )}
                                                            </div>
                                                        )}

                                                        {msg.text && (
                                                            <div style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                                                                {msg.text}
                                                            </div>
                                                        )}
                                                    </>
                                                )}

                                                {/* Footer */}
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'flex-end',
                                                        gap: 6,
                                                        marginTop: 4,
                                                        fontSize: 10,
                                                        color: isMe ? (isDark ? '#6ee7b7' : '#047857') : '#94a3b8',
                                                        fontWeight: 600
                                                    }}
                                                >
                                                    {msg.isStarred && <Star size={11} fill="#f59e0b" color="#f59e0b" />}
                                                    <span>{msg.timestamp?.split(' ')[1] || msg.timestamp}</span>

                                                    {isMe && (
                                                        <span title="Delivered">
                                                            {msg.sending ? (
                                                                <Clock size={11} />
                                                            ) : (
                                                                <CheckCheck size={13} color={isDark ? '#34d399' : '#059669'} />
                                                            )}
                                                        </span>
                                                    )}

                                                    {!isDeleted && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedMsgForMenu(selectedMsgForMenu === msg.id ? null : msg.id);
                                                            }}
                                                            style={{
                                                                border: 'none',
                                                                background: 'transparent',
                                                                color: 'inherit',
                                                                cursor: 'pointer',
                                                                padding: '0 2px',
                                                                opacity: 0.7
                                                            }}
                                                        >
                                                            <MoreVertical size={12} />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Context Dropdown Menu */}
                                                {selectedMsgForMenu === msg.id && (
                                                    <div
                                                        style={{
                                                            position: 'absolute',
                                                            bottom: '100%',
                                                            right: isMe ? 0 : 'auto',
                                                            left: !isMe ? 0 : 'auto',
                                                            marginBottom: 6,
                                                            background: isDark ? '#1e293b' : '#ffffff',
                                                            borderRadius: 12,
                                                            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                                                            border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
                                                            zIndex: 50,
                                                            padding: '6px',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: 2,
                                                            minWidth: '160px'
                                                        }}
                                                    >
                                                        <button
                                                            onClick={() => {
                                                                handleToggleStar(msg);
                                                                setSelectedMsgForMenu(null);
                                                            }}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 8,
                                                                padding: '8px 10px',
                                                                borderRadius: 8,
                                                                border: 'none',
                                                                background: 'transparent',
                                                                color: isDark ? '#f1f5f9' : '#1e293b',
                                                                fontSize: 12,
                                                                fontWeight: 600,
                                                                cursor: 'pointer',
                                                                textAlign: 'left'
                                                            }}
                                                        >
                                                            <Star size={13} fill={msg.isStarred ? '#f59e0b' : 'none'} color="#f59e0b" />
                                                            {msg.isStarred ? 'Unstar Note' : 'Star / Save Note'}
                                                        </button>

                                                        {msg.text && (
                                                            <button
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(msg.text);
                                                                    showToast('Text copied to clipboard 📋');
                                                                    setSelectedMsgForMenu(null);
                                                                }}
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 8,
                                                                    padding: '8px 10px',
                                                                    borderRadius: 8,
                                                                    border: 'none',
                                                                    background: 'transparent',
                                                                    color: isDark ? '#f1f5f9' : '#1e293b',
                                                                    fontSize: 12,
                                                                    fontWeight: 600,
                                                                    cursor: 'pointer',
                                                                    textAlign: 'left'
                                                                }}
                                                            >
                                                                <Copy size={13} /> Copy Text
                                                            </button>
                                                        )}

                                                        <button
                                                            onClick={() => {
                                                                const canDeleteEveryone = isMe || userRole === 'admin' || userRole === 'teacher';
                                                                setDeleteModalState({ message: msg, forEveryoneAllowed: canDeleteEveryone });
                                                                setSelectedMsgForMenu(null);
                                                            }}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 8,
                                                                padding: '8px 10px',
                                                                borderRadius: 8,
                                                                border: 'none',
                                                                background: 'transparent',
                                                                color: '#ef4444',
                                                                fontSize: 12,
                                                                fontWeight: 600,
                                                                cursor: 'pointer',
                                                                textAlign: 'left'
                                                            }}
                                                        >
                                                            <Trash2 size={13} /> Delete Message
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {uploadingMedia && (
                            <div
                                style={{
                                    position: 'absolute',
                                    bottom: '80px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                                    color: '#ffffff',
                                    padding: '8px 18px',
                                    borderRadius: 30,
                                    boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    zIndex: 50
                                }}
                            >
                                <Sparkles size={15} className="animate-spin" />
                                {uploadProgressText || 'Uploading media...'}
                            </div>
                        )}

                        {/* ── Input Bar ── */}
                        {activeConversation.canPost === false ? (
                            <div
                                style={{
                                    padding: '16px',
                                    textAlign: 'center',
                                    background: isDark ? '#111624' : '#f8fafc',
                                    borderTop: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
                                    color: '#94a3b8',
                                    fontSize: 13,
                                    fontWeight: 600
                                }}
                            >
                                🔒 Only Institute Administrators & Teachers can post announcements in this channel.
                            </div>
                        ) : (
                            <div
                                style={{
                                    padding: '12px 18px',
                                    background: isDark ? '#111624' : '#ffffff',
                                    borderTop: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    position: 'relative'
                                }}
                            >
                                {showEmojiPicker && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            bottom: '100%',
                                            left: 20,
                                            marginBottom: 10,
                                            background: isDark ? '#1e293b' : '#ffffff',
                                            borderRadius: 16,
                                            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
                                            border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
                                            padding: '12px',
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(7, 1fr)',
                                            gap: 8,
                                            zIndex: 60
                                        }}
                                    >
                                        {QUICK_EMOJIS.map(emoji => (
                                            <button
                                                key={emoji}
                                                onClick={() => {
                                                    setInputText(prev => prev + emoji);
                                                    setShowEmojiPicker(false);
                                                }}
                                                style={{
                                                    fontSize: 20,
                                                    padding: '6px',
                                                    borderRadius: 8,
                                                    border: 'none',
                                                    background: 'transparent',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {showAttachMenu && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            bottom: '100%',
                                            left: 55,
                                            marginBottom: 10,
                                            background: isDark ? '#1e293b' : '#ffffff',
                                            borderRadius: 16,
                                            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
                                            border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
                                            padding: '8px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 4,
                                            zIndex: 60,
                                            minWidth: '180px'
                                        }}
                                    >
                                        <button
                                            onClick={() => triggerFilePicker('image')}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 10,
                                                padding: '10px 12px',
                                                borderRadius: 10,
                                                border: 'none',
                                                background: 'transparent',
                                                color: isDark ? '#f1f5f9' : '#1e293b',
                                                fontSize: 13,
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                textAlign: 'left'
                                            }}
                                        >
                                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <ImageIcon size={15} />
                                            </div>
                                            Photos & Pictures
                                        </button>
                                        <button
                                            onClick={() => triggerFilePicker('video')}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 10,
                                                padding: '10px 12px',
                                                borderRadius: 10,
                                                border: 'none',
                                                background: 'transparent',
                                                color: isDark ? '#f1f5f9' : '#1e293b',
                                                fontSize: 13,
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                textAlign: 'left'
                                            }}
                                        >
                                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <VideoIcon size={15} />
                                            </div>
                                            Videos
                                        </button>
                                        <button
                                            onClick={() => triggerFilePicker('pdf')}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 10,
                                                padding: '10px 12px',
                                                borderRadius: 10,
                                                border: 'none',
                                                background: 'transparent',
                                                color: isDark ? '#f1f5f9' : '#1e293b',
                                                fontSize: 13,
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                textAlign: 'left'
                                            }}
                                        >
                                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#ef4444', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <FileText size={15} />
                                            </div>
                                            PDF / Study Notes
                                        </button>
                                    </div>
                                )}

                                <button
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    title="Add emoji"
                                    style={{
                                        border: 'none',
                                        background: 'transparent',
                                        color: isDark ? '#94a3b8' : '#64748b',
                                        cursor: 'pointer',
                                        padding: '6px',
                                        borderRadius: 8
                                    }}
                                >
                                    <Smile size={22} />
                                </button>

                                <button
                                    onClick={() => setShowAttachMenu(!showAttachMenu)}
                                    title="Attach pictures, videos, PDF notes"
                                    style={{
                                        border: 'none',
                                        background: 'transparent',
                                        color: isDark ? '#94a3b8' : '#64748b',
                                        cursor: 'pointer',
                                        padding: '6px',
                                        borderRadius: 8
                                    }}
                                >
                                    <Paperclip size={22} />
                                </button>

                                <textarea
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                    placeholder="Type a message or question... (Shift+Enter for new line)"
                                    rows={1}
                                    style={{
                                        flex: 1,
                                        padding: '10px 14px',
                                        borderRadius: 14,
                                        border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1',
                                        background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
                                        color: isDark ? '#f1f5f9' : '#0f172a',
                                        fontSize: 14,
                                        resize: 'none',
                                        outline: 'none',
                                        fontFamily: 'inherit',
                                        lineHeight: 1.4,
                                        maxHeight: '100px'
                                    }}
                                />

                                <button
                                    onClick={() => handleSendMessage()}
                                    disabled={!inputText.trim()}
                                    style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: '50%',
                                        border: 'none',
                                        background: inputText.trim()
                                            ? 'linear-gradient(135deg, #10b981, #059669)'
                                            : (isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'),
                                        color: '#ffffff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: inputText.trim() ? 'pointer' : 'default',
                                        boxShadow: inputText.trim() ? '0 4px 14px rgba(16,185,129,0.35)' : 'none',
                                        transition: 'all 0.2s ease',
                                        flexShrink: 0
                                    }}
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div
                        style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'column',
                            color: '#94a3b8',
                            padding: 30
                        }}
                    >
                        <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
                        <div style={{ fontWeight: 800, fontSize: 18, color: isDark ? '#cbd5e1' : '#334155' }}>
                            DCC WhatsApp Student Chat & Community
                        </div>
                        <p style={{ fontSize: 13, maxWidth: 380, textAlign: 'center', marginTop: 6 }}>
                            Select a course group, batch timing group, or faculty session from the left to start messaging.
                        </p>
                    </div>
                )}
            </div>

            {/* ========================================================= */}
            {/* MODAL: DELETE MESSAGE                                    */}
            {/* ========================================================= */}
            {deleteModalState && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 999999,
                        background: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 16
                    }}
                >
                    <div
                        style={{
                            background: isDark ? '#1e293b' : '#ffffff',
                            borderRadius: 20,
                            padding: 24,
                            width: '100%',
                            maxWidth: '400px',
                            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                            border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0'
                        }}
                    >
                        <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 8px', color: isDark ? '#f1f5f9' : '#0f172a' }}>
                            Delete Message?
                        </h3>
                        <p style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#64748b', margin: '0 0 20px' }}>
                            Choose whether to delete this message just for yourself or for everyone in the chat.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {deleteModalState.forEveryoneAllowed && (
                                <button
                                    onClick={() => handleConfirmDelete(true)}
                                    style={{
                                        padding: '12px',
                                        borderRadius: 12,
                                        border: 'none',
                                        background: '#ef4444',
                                        color: '#ffffff',
                                        fontWeight: 800,
                                        fontSize: 13,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 8
                                    }}
                                >
                                    <Trash2 size={16} /> Delete for Everyone
                                </button>
                            )}
                            <button
                                onClick={() => handleConfirmDelete(false)}
                                style={{
                                    padding: '12px',
                                    borderRadius: 12,
                                    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
                                    background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
                                    color: isDark ? '#f1f5f9' : '#0f172a',
                                    fontWeight: 700,
                                    fontSize: 13,
                                    cursor: 'pointer'
                                }}
                            >
                                Delete for Me
                            </button>
                            <button
                                onClick={() => setDeleteModalState(null)}
                                style={{
                                    padding: '10px',
                                    borderRadius: 12,
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#94a3b8',
                                    fontWeight: 700,
                                    fontSize: 13,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* MODAL: CREATE GROUP                                      */}
            {/* ========================================================= */}
            {showCreateGroupModal && (
                <CreateGroupModal
                    isDark={isDark}
                    availableCourses={availableCourses}
                    availableBatches={availableBatches}
                    studentDirectory={studentDirectory}
                    currentUser={currentUser}
                    onClose={() => setShowCreateGroupModal(false)}
                    onCreated={(newGroup) => {
                        setConversations(prev => [newGroup, ...prev]);
                        setActiveConvId(newGroup.id);
                        setShowCreateGroupModal(false);
                        showToast(`Group "${newGroup.name}" created successfully! 🎉`);
                    }}
                />
            )}

            {/* ========================================================= */}
            {/* MODAL: DIRECT STUDENT DIRECTORY                          */}
            {/* ========================================================= */}
            {showStudentDirModal && (
                <StudentDirectoryModal
                    isDark={isDark}
                    studentDirectory={studentDirectory}
                    onClose={() => setShowStudentDirModal(false)}
                    onSelectStudent={(student) => {
                        const directConvId = `direct_${student.id}_admin`;
                        let existing = conversations.find(c => c.id === directConvId);
                        if (!existing) {
                            existing = {
                                id: directConvId,
                                name: student.name,
                                type: 'direct',
                                subtitle: `${student.course || 'Course'} • ${student.batch || 'Batch'}`,
                                avatar: '👤',
                                studentId: student.id,
                                studentName: student.name,
                                isGroup: false,
                                canPost: true
                            };
                            setConversations(prev => [existing, ...prev]);
                        }
                        setActiveConvId(directConvId);
                        setShowStudentDirModal(false);
                    }}
                />
            )}

            {/* ========================================================= */}
            {/* DRAWER: STARRED & SAVED NOTES                            */}
            {/* ========================================================= */}
            {showStarredDrawer && (
                <StarredNotesDrawer
                    isDark={isDark}
                    starredMessages={starredMessages}
                    onClose={() => setShowStarredDrawer(false)}
                    onUnstar={(msg) => handleToggleStar(msg)}
                />
            )}

            {/* ========================================================= */}
            {/* MODAL: LIGHTBOX                                          */}
            {/* ========================================================= */}
            {previewMedia && (
                <div
                    onClick={() => setPreviewMedia(null)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 999999,
                        background: 'rgba(0,0,0,0.9)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 24
                    }}
                >
                    <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90%', maxHeight: '90%', position: 'relative' }}>
                        <button
                            onClick={() => setPreviewMedia(null)}
                            style={{
                                position: 'absolute',
                                top: -45,
                                right: 0,
                                background: 'rgba(255,255,255,0.2)',
                                border: 'none',
                                borderRadius: '50%',
                                width: 36,
                                height: 36,
                                color: '#ffffff',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <X size={20} />
                        </button>
                        <img
                            src={previewMedia.url}
                            alt={previewMedia.name || 'Preview'}
                            style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 12, display: 'block', objectFit: 'contain' }}
                        />
                        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
                            <span style={{ fontSize: 13, fontWeight: 700 }}>{previewMedia.name || 'Attachment Preview'}</span>
                            <a
                                href={previewMedia.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                download
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: 8,
                                    background: '#10b981',
                                    color: '#fff',
                                    textDecoration: 'none',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6
                                }}
                            >
                                <Download size={14} /> Download
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function CreateGroupModal({
    isDark,
    availableCourses = [],
    availableBatches = [],
    studentDirectory = [],
    currentUser,
    onClose,
    onCreated
}) {
    const [groupName, setGroupName] = useState('');
    const [groupType, setGroupType] = useState('batch');
    const [selectedCourse, setSelectedCourse] = useState(availableCourses[0] || '');
    const [selectedBatch, setSelectedBatch] = useState('');
    const [description, setDescription] = useState('');
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [saving, setSaving] = useState(false);

    const courseBatches = useMemo(() => {
        return availableBatches
            .filter(b => !selectedCourse || b.course.toLowerCase() === selectedCourse.toLowerCase())
            .map(b => b.batch);
    }, [availableBatches, selectedCourse]);

    useEffect(() => {
        if (courseBatches.length > 0 && !selectedBatch) {
            setSelectedBatch(courseBatches[0]);
        }
    }, [courseBatches]);

    const handleAutoPopulateBatchStudents = () => {
        const matched = studentDirectory.filter(s => {
            const matchC = !selectedCourse || s.course.toLowerCase() === selectedCourse.toLowerCase();
            const matchB = !selectedBatch || s.batch.toLowerCase() === selectedBatch.toLowerCase();
            return matchC && matchB;
        });
        const ids = matched.map(s => s.id);
        setSelectedMembers(ids);
        showToast(`Auto-added ${ids.length} students from batch! 👥`);
    };

    const handleCreate = async () => {
        if (!groupName.trim()) {
            alert('Please provide a group name');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                name: groupName.trim(),
                type: groupType,
                course: selectedCourse,
                batch: selectedBatch,
                createdBy: currentUser?.name || 'Admin',
                description: description.trim(),
                avatar: groupType === 'course' ? '📚' : (groupType === 'batch' ? '⏰' : '👥'),
                members: selectedMembers
            };
            const res = await createChatGroup(payload);
            if (res && res.success && res.group) {
                onCreated(res.group);
            } else {
                alert(res?.error || 'Failed to create group');
            }
        } catch (e) {
            console.error('[createChatGroup] error:', e);
            alert('Error creating group');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 999999,
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16
            }}
        >
            <div
                style={{
                    background: isDark ? '#1e293b' : '#ffffff',
                    borderRadius: 22,
                    padding: 24,
                    width: '100%',
                    maxWidth: '520px',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
                    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
                    maxHeight: '90vh',
                    overflowY: 'auto'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 900, margin: 0, color: isDark ? '#f1f5f9' : '#0f172a' }}>
                        Create WhatsApp-Style Group
                    </h3>
                    <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}>
                        <X size={18} />
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: isDark ? '#cbd5e1' : '#475569', display: 'block', marginBottom: 6 }}>
                            Group Scope / Type
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                            {[
                                { id: 'batch', label: '⏰ Batch Timing', desc: 'Timing-wise' },
                                { id: 'course', label: '📚 Course-wise', desc: 'Entire course' },
                                { id: 'custom', label: '👥 Custom Club', desc: 'Custom list' },
                            ].map(t => (
                                <button
                                    type="button"
                                    key={t.id}
                                    onClick={() => setGroupType(t.id)}
                                    style={{
                                        padding: '10px 8px',
                                        borderRadius: 10,
                                        border: `1.5px solid ${groupType === t.id ? '#10b981' : isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
                                        background: groupType === t.id ? (isDark ? 'rgba(16,185,129,0.15)' : '#ecfdf5') : 'transparent',
                                        color: groupType === t.id ? '#10b981' : (isDark ? '#cbd5e1' : '#475569'),
                                        fontWeight: 800,
                                        fontSize: 12,
                                        cursor: 'pointer'
                                    }}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: isDark ? '#cbd5e1' : '#475569', display: 'block', marginBottom: 6 }}>
                            Group Name *
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. MS-CIT Morning Batch (08:00 AM)"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: 10,
                                border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1',
                                background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
                                color: isDark ? '#f1f5f9' : '#0f172a',
                                fontSize: 13,
                                fontWeight: 600,
                                outline: 'none'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: isDark ? '#cbd5e1' : '#475569', display: 'block', marginBottom: 6 }}>
                            Target Course
                        </label>
                        <select
                            value={selectedCourse}
                            onChange={(e) => setSelectedCourse(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: 10,
                                border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1',
                                background: isDark ? '#141b2d' : '#f8fafc',
                                color: isDark ? '#f1f5f9' : '#0f172a',
                                fontSize: 13,
                                fontWeight: 600
                            }}
                        >
                            <option value="">All Courses</option>
                            {availableCourses.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    {groupType === 'batch' && (
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 700, color: isDark ? '#cbd5e1' : '#475569', display: 'block', marginBottom: 6 }}>
                                Batch Timing
                            </label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <select
                                    value={selectedBatch}
                                    onChange={(e) => setSelectedBatch(e.target.value)}
                                    style={{
                                        flex: 1,
                                        padding: '10px 14px',
                                        borderRadius: 10,
                                        border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1',
                                        background: isDark ? '#141b2d' : '#f8fafc',
                                        color: isDark ? '#f1f5f9' : '#0f172a',
                                        fontSize: 13,
                                        fontWeight: 600
                                    }}
                                >
                                    <option value="">All Batches</option>
                                    {courseBatches.map(b => (
                                        <option key={b} value={b}>{b}</option>
                                    ))}
                                </select>

                                <button
                                    type="button"
                                    onClick={handleAutoPopulateBatchStudents}
                                    style={{
                                        padding: '10px 14px',
                                        borderRadius: 10,
                                        border: 'none',
                                        background: '#3b82f6',
                                        color: '#ffffff',
                                        fontWeight: 700,
                                        fontSize: 12,
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    1-Click Add Students
                                </button>
                            </div>
                        </div>
                    )}

                    <div style={{ padding: '8px 12px', borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9', fontSize: 12, color: '#94a3b8' }}>
                        Selected Members: <strong style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>{selectedMembers.length} students</strong> enrolled
                    </div>

                    <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: isDark ? '#cbd5e1' : '#475569', display: 'block', marginBottom: 6 }}>
                            Guidelines / Description
                        </label>
                        <textarea
                            placeholder="Announcements, daily homework, and doubt solving..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={2}
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: 10,
                                border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1',
                                background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
                                color: isDark ? '#f1f5f9' : '#0f172a',
                                fontSize: 13,
                                outline: 'none'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                flex: 1,
                                padding: '12px',
                                borderRadius: 12,
                                border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
                                background: 'transparent',
                                color: isDark ? '#f1f5f9' : '#0f172a',
                                fontWeight: 700,
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleCreate}
                            disabled={saving}
                            style={{
                                flex: 2,
                                padding: '12px',
                                borderRadius: 12,
                                border: 'none',
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                color: '#ffffff',
                                fontWeight: 800,
                                cursor: 'pointer',
                                boxShadow: '0 4px 14px rgba(16,185,129,0.35)'
                            }}
                        >
                            {saving ? 'Creating Group...' : 'Create Group'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StudentDirectoryModal({ isDark, studentDirectory = [], onClose, onSelectStudent }) {
    const [search, setSearch] = useState('');

    const filtered = studentDirectory.filter(s =>
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.id?.toLowerCase().includes(search.toLowerCase()) ||
        s.course?.toLowerCase().includes(search.toLowerCase()) ||
        s.batch?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 999999,
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16
            }}
        >
            <div
                style={{
                    background: isDark ? '#1e293b' : '#ffffff',
                    borderRadius: 22,
                    padding: 24,
                    width: '100%',
                    maxWidth: '480px',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
                    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
                    maxHeight: '80vh',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 900, margin: 0, color: isDark ? '#f1f5f9' : '#0f172a' }}>
                        Start Direct Chat with Student
                    </h3>
                    <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}>
                        <X size={18} />
                    </button>
                </div>

                <div style={{ marginBottom: 14 }}>
                    <input
                        type="text"
                        placeholder="Search student by name, ID, course..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: 10,
                            border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1',
                            background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
                            color: isDark ? '#f1f5f9' : '#0f172a',
                            fontSize: 13,
                            outline: 'none'
                        }}
                    />
                </div>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8', fontSize: 13 }}>
                            No students match your search
                        </div>
                    ) : (
                        filtered.map(s => (
                            <div
                                key={s.id}
                                onClick={() => onSelectStudent(s)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '10px 14px',
                                    borderRadius: 12,
                                    background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
                                    border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0',
                                    cursor: 'pointer',
                                    transition: 'background 0.15s ease'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div
                                        style={{
                                            width: 36,
                                            height: 36,
                                            borderRadius: '50%',
                                            background: '#3b82f6',
                                            color: '#fff',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 800,
                                            fontSize: 14
                                        }}
                                    >
                                        {s.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: 13, color: isDark ? '#f1f5f9' : '#0f172a' }}>
                                            {s.name}
                                        </div>
                                        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                                            {s.id} • {s.course} • {s.batch}
                                        </div>
                                    </div>
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>Chat →</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

function StarredNotesDrawer({ isDark, starredMessages = [], onClose, onUnstar }) {
    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 999999,
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                justifyContent: 'flex-end'
            }}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: '420px',
                    height: '100%',
                    background: isDark ? '#141b2d' : '#ffffff',
                    borderLeft: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '-10px 0 30px rgba(0,0,0,0.3)',
                    padding: '24px'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Bookmark size={20} color="#f59e0b" />
                        <h3 style={{ fontSize: 18, fontWeight: 900, margin: 0, color: isDark ? '#f1f5f9' : '#0f172a' }}>
                            Saved Notes & Messages
                        </h3>
                    </div>
                    <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}>
                        <X size={18} />
                    </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {starredMessages.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
                            <div style={{ fontSize: 36, marginBottom: 8 }}>⭐</div>
                            <div style={{ fontWeight: 800, fontSize: 15, color: isDark ? '#cbd5e1' : '#334155' }}>
                                No starred messages yet
                            </div>
                            <div style={{ fontSize: 12, marginTop: 4 }}>
                                Click the three dots on any message or study note to star and bookmark it here!
                            </div>
                        </div>
                    ) : (
                        starredMessages.map((msg, idx) => (
                            <div
                                key={msg.id || idx}
                                style={{
                                    padding: '14px',
                                    borderRadius: 14,
                                    background: isDark ? '#1e293b' : '#f8fafc',
                                    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <span style={{ fontSize: 12, fontWeight: 800, color: '#10b981' }}>
                                        {msg.senderName || 'Member'} ({msg.senderRole})
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ fontSize: 10, color: '#94a3b8' }}>{msg.timestamp}</span>
                                        <button
                                            onClick={() => onUnstar(msg)}
                                            title="Unstar"
                                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#f59e0b' }}
                                        >
                                            <Star size={13} fill="#f59e0b" />
                                        </button>
                                    </div>
                                </div>

                                {msg.mediaType === 'image' && msg.mediaUrl && (
                                    <img src={msg.mediaUrl} alt="Note" style={{ width: '100%', maxHeight: '140px', objectFit: 'cover', borderRadius: 8, marginBottom: 6 }} />
                                )}

                                {msg.mediaType === 'pdf' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px', borderRadius: 8, background: isDark ? '#0f172a' : '#fff', marginBottom: 6 }}>
                                        <FileText size={16} color="#ef4444" />
                                        <span style={{ fontSize: 12, fontWeight: 700, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{msg.fileName}</span>
                                        <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#3b82f6', fontWeight: 800, textDecoration: 'none' }}>View</a>
                                    </div>
                                )}

                                {msg.text && (
                                    <div style={{ fontSize: 13, lineHeight: 1.4, color: isDark ? '#f1f5f9' : '#0f172a', whiteSpace: 'pre-wrap' }}>
                                        {msg.text}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
