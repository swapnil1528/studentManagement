/**
 * Toast — Global toast notification.
 * Shows a message at the bottom of the screen and auto-dismisses.
 *
 * Usage: Import { showToast } and call showToast("Message")
 * Include <Toast /> once in App.jsx.
 */

import { useState, useEffect, useCallback } from 'react';

// Global reference so showToast can be called from anywhere
let globalShowToast = () => { };

export function showToast(message) {
    globalShowToast(message);
}

export default function Toast() {
    const [message, setMessage] = useState('');
    const [visible, setVisible] = useState(false);

    const show = useCallback((msg) => {
        setMessage(msg);
        setVisible(true);
        setTimeout(() => setVisible(false), 3000);
    }, []);

    // Register global handler on mount
    useEffect(() => {
        globalShowToast = show;
    }, [show]);

    return (
        <div className={`toast ${visible ? 'show' : ''}`}>
            {message}
        </div>
    );
}
