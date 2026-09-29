/**
 * notificationService.js
 * 
 * Handles:
 * 1. Native Android App Bridge (`window.Android.showNotification`)
 * 2. Web Push & Browser Notifications (`Notification.requestPermission`)
 * 3. In-App Heads-Up Pushup Banner events
 * 4. Pleasant Web Audio Synthesizer Notification Chime
 * 5. Background Polling for Admin Notices & Messages
 */

import { apiCall } from './api';

// Play pleasant 2-tone notification sound via Web Audio API without needing external mp3 files
export function playNotificationChime() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
            ctx.resume();
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        const now = ctx.currentTime;

        // Two-tone bell chime: E5 -> B5
        osc.frequency.setValueAtTime(659.25, now);
        osc.frequency.setValueAtTime(987.77, now + 0.12);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc.start(now);
        osc.stop(now + 0.5);
    } catch (e) {
        console.log('[Notification Audio] Note:', e.message);
    }
}

// Request Notification Permission
export async function requestNotificationPermission() {
    if (window.Android && window.Android.requestPermission) {
        window.Android.requestPermission();
        return 'granted';
    }

    if (!('Notification' in window)) {
        return 'unsupported';
    }

    try {
        const permission = await Notification.requestPermission();
        return permission;
    } catch (e) {
        console.warn('[Notification] Permission request error:', e);
        return 'denied';
    }
}

// Check if notification permission is granted
export function isNotificationPermissionGranted() {
    if (window.Android) return true;
    if (!('Notification' in window)) return false;
    return Notification.permission === 'granted';
}

/**
 * Trigger Pushup Notification across all platforms:
 * 1. Native Android App notification (if inside Android app)
 * 2. In-App Heads-Up Pushup Banner (sliding from top of screen)
 * 3. Browser / PWA Notification (if granted and window in background)
 */
export function triggerPushNotification({ title, message, type = 'notice', data = {}, playSound = true }) {
    if (playSound) {
        playNotificationChime();
    }

    // 1. Android Native Interface (WebView bridge)
    if (window.Android && typeof window.Android.showNotification === 'function') {
        try {
            window.Android.showNotification(title, message, type);
            if (typeof window.Android.vibrate === 'function') {
                window.Android.vibrate(200);
            }
        } catch (err) {
            console.error('[Android Bridge Error]', err);
        }
    } else if (navigator.vibrate) {
        try {
            navigator.vibrate([150, 80, 150]);
        } catch (e) { }
    }

    // 2. Dispatch custom in-app Pushup Notification event for floating heads-up banner
    const event = new CustomEvent('dcc:pushup-notification', {
        detail: {
            id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            title,
            message,
            type, // 'notice' | 'chat' | 'fee' | 'exam'
            data,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
    });
    window.dispatchEvent(event);

    // 3. Web Push / Browser Notification (if permission granted and document not visible)
    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
        try {
            if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                navigator.serviceWorker.ready.then((reg) => {
                    reg.showNotification(title, {
                        body: message,
                        icon: '/icon-192.png',
                        badge: '/icon-192.png',
                        vibrate: [200, 100, 200],
                        data: data
                    });
                });
            } else {
                new Notification(title, {
                    body: message,
                    icon: '/icon-192.png'
                });
            }
        } catch (e) {
            console.log('[Web Notification]', e);
        }
    }
}

// Broadcast Admin Notice locally and save latest timestamp
export function broadcastAdminNotice({ title, msg, audience = 'All' }) {
    const noticePayload = {
        title,
        msg,
        audience,
        timestamp: Date.now()
    };
    try {
        localStorage.setItem('dcc_last_broadcast_notice', JSON.stringify(noticePayload));
    } catch (e) { }

    triggerPushNotification({
        title: '📢 Notice: ' + title,
        message: msg,
        type: 'notice',
        data: { url: '/student?tab=notices', tab: 'notices' }
    });
}

// Broadcast Admin Chat Message
export function broadcastAdminMessage({ senderName, text, recipientId, conversationId }) {
    triggerPushNotification({
        title: `💬 Message from ${senderName || 'Admin'}`,
        message: text || 'Sent an attachment',
        type: 'chat',
        data: { url: '/student?tab=chat', tab: 'chat', recipientId, conversationId }
    });
}

/**
 * Start Background Poller for new Admin Notices & Messages
 * Polls Google Apps Script every 15-20 seconds
 */
export function startAdminMessageWatcher({ role, studentId, onNotificationReceived }) {
    const POLLING_INTERVAL = 15000; // 15 seconds

    const checkUpdates = async () => {
        try {
            // Check for new notices
            const res = await apiCall('getStudent', { id: studentId || 'ST-2026-1001' });
            if (res && res.notices && res.notices.length > 0) {
                const latest = res.notices[0];
                const noticeKey = `dcc_seen_notice_${latest.title}_${latest.date}`;
                const hasSeen = localStorage.getItem(noticeKey);

                if (!hasSeen) {
                    localStorage.setItem(noticeKey, 'true');
                    triggerPushNotification({
                        title: '📢 ' + (latest.title || 'New Admin Notice'),
                        message: latest.message || 'The admin posted a new notice.',
                        type: 'notice',
                        data: { url: '/student?tab=notices', tab: 'notices' }
                    });
                    if (onNotificationReceived) onNotificationReceived(latest);
                }
            }
        } catch (err) {
            // Silently continue polling
        }
    };

    // Run first check after 4 seconds, then repeat periodically
    const initialTimer = setTimeout(checkUpdates, 4000);
    const interval = setInterval(checkUpdates, POLLING_INTERVAL);

    return () => {
        clearTimeout(initialTimer);
        clearInterval(interval);
    };
}
