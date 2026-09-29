import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, MessageSquare, Megaphone, X, ArrowRight, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { requestNotificationPermission, isNotificationPermissionGranted } from '../../services/notificationService';

export default function PushupNotificationBanner() {
    const [notifications, setNotifications] = useState([]);
    const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
    const navigate = useNavigate();

    // Listen for custom pushup events
    useEffect(() => {
        const handlePushEvent = (e) => {
            const notif = e.detail;
            if (!notif) return;

            setNotifications((prev) => [notif, ...prev.slice(0, 2)]);

            // Auto-dismiss after 6 seconds
            setTimeout(() => {
                setNotifications((current) => current.filter((n) => n.id !== notif.id));
            }, 6000);
        };

        window.addEventListener('dcc:pushup-notification', handlePushEvent);

        // Check if permission prompt should be shown (only if user logged in and hasn't granted yet)
        if ('Notification' in window && Notification.permission === 'default' && !window.Android) {
            const dismissed = sessionStorage.getItem('dcc_notif_prompt_dismissed');
            if (!dismissed) {
                const timer = setTimeout(() => setShowPermissionPrompt(true), 3500);
                return () => {
                    clearTimeout(timer);
                    window.removeEventListener('dcc:pushup-notification', handlePushEvent);
                };
            }
        }

        return () => {
            window.removeEventListener('dcc:pushup-notification', handlePushEvent);
        };
    }, []);

    const dismissNotif = (id) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    };

    const handleActionClick = (notif) => {
        dismissNotif(notif.id);
        if (notif.data?.url) {
            navigate(notif.data.url);
        } else if (notif.data?.tab) {
            navigate(`/student?tab=${notif.data.tab}`);
        }
    };

    const handleEnablePermission = async () => {
        const res = await requestNotificationPermission();
        if (res === 'granted') {
            setShowPermissionPrompt(false);
        } else {
            setShowPermissionPrompt(false);
            sessionStorage.setItem('dcc_notif_prompt_dismissed', 'true');
        }
    };

    return (
        <>
            {/* ── Heads-Up Pushup Notification Cards (Sliding from Top) ── */}
            <div
                style={{
                    position: 'fixed',
                    top: 14,
                    left: 0,
                    right: 0,
                    zIndex: 9999999,
                    pointerEvents: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 10,
                    padding: '0 16px',
                }}
            >
                <AnimatePresence>
                    {notifications.map((notif) => {
                        const isChat = notif.type === 'chat';
                        const isFee = notif.type === 'fee';

                        let accentColor = '#7c3aed';
                        let IconComp = Megaphone;
                        let badgeText = 'Admin Announcement';

                        if (isChat) {
                            accentColor = '#10b981';
                            IconComp = MessageSquare;
                            badgeText = 'New Message';
                        } else if (isFee) {
                            accentColor = '#f59e0b';
                            IconComp = Bell;
                            badgeText = 'Fee Reminder';
                        }

                        return (
                            <motion.div
                                key={notif.id}
                                initial={{ opacity: 0, y: -45, scale: 0.94 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -30, scale: 0.9, transition: { duration: 0.2 } }}
                                transition={{ type: 'spring', damping: 22, stiffness: 320 }}
                                style={{
                                    pointerEvents: 'auto',
                                    width: '100%',
                                    maxWidth: 420,
                                    backgroundColor: 'rgba(15, 23, 42, 0.92)',
                                    color: '#ffffff',
                                    backdropFilter: 'blur(16px)',
                                    WebkitBackdropFilter: 'blur(16px)',
                                    borderRadius: 18,
                                    border: '1px solid rgba(255, 255, 255, 0.14)',
                                    boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08)',
                                    padding: '12px 14px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 10,
                                    overflow: 'hidden',
                                    position: 'relative',
                                }}
                            >
                                {/* Top Glow Accent */}
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: 3,
                                        background: `linear-gradient(90deg, ${accentColor}, #38bdf8)`,
                                    }}
                                />

                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                    {/* Icon Avatar */}
                                    <div
                                        style={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: 12,
                                            backgroundColor: `${accentColor}25`,
                                            border: `1px solid ${accentColor}50`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: accentColor,
                                            flexShrink: 0,
                                        }}
                                    >
                                        <IconComp size={20} />
                                    </div>

                                    {/* Body */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                                            <span
                                                style={{
                                                    fontSize: 10,
                                                    fontWeight: 700,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.6px',
                                                    color: accentColor,
                                                }}
                                            >
                                                {badgeText}
                                            </span>
                                            <span style={{ fontSize: 10, opacity: 0.6 }}>{notif.timestamp}</span>
                                        </div>

                                        <h4
                                            style={{
                                                fontSize: 13,
                                                fontWeight: 700,
                                                margin: 0,
                                                color: '#f8fafc',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }}
                                        >
                                            {notif.title}
                                        </h4>

                                        <p
                                            style={{
                                                fontSize: 12,
                                                color: '#cbd5e1',
                                                margin: '2px 0 0 0',
                                                lineHeight: 1.35,
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                            }}
                                        >
                                            {notif.message}
                                        </p>
                                    </div>

                                    {/* Close Button */}
                                    <button
                                        onClick={() => dismissNotif(notif.id)}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'rgba(255, 255, 255, 0.5)',
                                            padding: 4,
                                            cursor: 'pointer',
                                            borderRadius: 6,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <X size={15} />
                                    </button>
                                </div>

                                {/* Action Buttons */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: -4 }}>
                                    <button
                                        onClick={() => handleActionClick(notif)}
                                        style={{
                                            padding: '6px 14px',
                                            borderRadius: 8,
                                            border: 'none',
                                            backgroundColor: accentColor,
                                            color: '#ffffff',
                                            fontSize: 11,
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 5,
                                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                                        }}
                                    >
                                        <span>View</span>
                                        <ArrowRight size={12} />
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* ── Notification Permission Prompt Chip (Bottom Right) ── */}
            <AnimatePresence>
                {showPermissionPrompt && (
                    <motion.div
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        style={{
                            position: 'fixed',
                            bottom: 24,
                            right: 20,
                            zIndex: 999999,
                            backgroundColor: 'rgba(15, 23, 42, 0.94)',
                            color: '#ffffff',
                            backdropFilter: 'blur(16px)',
                            WebkitBackdropFilter: 'blur(16px)',
                            borderRadius: 16,
                            border: '1px solid rgba(124, 58, 237, 0.4)',
                            boxShadow: '0 16px 36px rgba(0, 0, 0, 0.5)',
                            padding: '12px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            maxWidth: 380,
                        }}
                    >
                        <div
                            style={{
                                width: 34,
                                height: 34,
                                borderRadius: 10,
                                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <Bell size={18} color="#fff" />
                        </div>

                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 700 }}>Enable Notifications</div>
                            <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.3 }}>
                                Get push alerts when admin adds notices or messages
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 6 }}>
                            <button
                                onClick={handleEnablePermission}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: 8,
                                    border: 'none',
                                    backgroundColor: '#7c3aed',
                                    color: '#ffffff',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                }}
                            >
                                <Check size={12} />
                                <span>Allow</span>
                            </button>
                            <button
                                onClick={() => {
                                    setShowPermissionPrompt(false);
                                    sessionStorage.setItem('dcc_notif_prompt_dismissed', 'true');
                                }}
                                style={{
                                    padding: '6px 8px',
                                    borderRadius: 8,
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    backgroundColor: 'transparent',
                                    color: '#94a3b8',
                                    fontSize: 11,
                                    cursor: 'pointer',
                                }}
                            >
                                Later
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
