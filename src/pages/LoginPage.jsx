/**
 * LoginPage — Gen Z redesign.
 * Bold hero text, emoji blobs, clean card, shimmer button.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { motion } from 'framer-motion';

const QUOTES = [
    "Knowledge is your superpower ⚡",
    "Today's effort = tomorrow's success 🎯",
    "Stay curious, stay ahead 🚀",
    "Your future self is cheering for you 🙌",
];

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const { isDark, toggleTheme } = useTheme();

    const quote = QUOTES[new Date().getDay() % QUOTES.length];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        const result = await login(username, password);
        if (result.success) {
            const stored = JSON.parse(localStorage.getItem('erp_session'));
            if (stored?.role === 'student') navigate('/student');
            else if (stored?.role === 'employee') navigate('/employee');
            else navigate('/admin');
        } else {
            setError(result.error || 'Invalid credentials');
        }
        setLoading(false);
    };

    const bg = isDark
        ? 'linear-gradient(135deg, #0e0c1a 0%, #1a1630 60%, #0e0c1a 100%)'
        : 'linear-gradient(155deg, #f8f7ff 0%, #f0ecff 40%, #e8f5ff 100%)';

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: bg, position: 'relative',
            overflow: 'hidden', fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
            padding: '20px',
        }}>
            {/* Decorative blobs */}
            <div style={{
                position: 'absolute', top: '-80px', left: '-80px',
                width: 320, height: 320,
                background: 'radial-gradient(circle, rgba(124,58,237,0.25), transparent 70%)',
                filter: 'blur(50px)', pointerEvents: 'none',
            }} />
            <div style={{
                position: 'absolute', bottom: '-60px', right: '-60px',
                width: 280, height: 280,
                background: 'radial-gradient(circle, rgba(6,182,212,0.2), transparent 70%)',
                filter: 'blur(50px)', pointerEvents: 'none',
            }} />
            <div style={{
                position: 'absolute', top: '40%', right: '8%',
                width: 180, height: 180,
                background: 'radial-gradient(circle, rgba(244,63,94,0.15), transparent 70%)',
                filter: 'blur(40px)', pointerEvents: 'none',
            }} />

            {/* Floating emoji decorations */}
            {['🎓', '📚', '✨', '💡', '🚀'].map((e, i) => (
                <motion.div
                    key={i}
                    animate={{ y: [0, -12, 0], rotate: [-5, 5, -5] }}
                    transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
                    style={{
                        position: 'absolute', fontSize: [28, 22, 32, 20, 26][i],
                        opacity: isDark ? 0.15 : 0.2,
                        top: ['8%', '15%', '75%', '70%', '30%'][i],
                        left: ['10%', '80%', '5%', '88%', '88%'][i],
                        userSelect: 'none', pointerEvents: 'none',
                    }}
                >
                    {e}
                </motion.div>
            ))}

            {/* Dark Mode Toggle */}
            <button
                onClick={toggleTheme}
                style={{
                    position: 'absolute', top: 20, right: 20,
                    width: 40, height: 40, borderRadius: 12, border: 'none',
                    background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(124,58,237,0.08)',
                    color: isDark ? '#fbbf24' : '#7c3aed', fontSize: 16,
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', backdropFilter: 'blur(8px)',
                    transition: 'all 0.2s',
                }}
            >
                <i className={isDark ? 'fas fa-sun' : 'fas fa-moon'} />
            </button>

            {/* Login Card */}
            <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                style={{
                    width: '100%', maxWidth: 400,
                    background: isDark ? 'rgba(26, 22, 48, 0.95)' : '#ffffff',
                    borderRadius: 28,
                    border: `1.5px solid ${isDark ? 'rgba(139,92,246,0.2)' : 'rgba(124,58,237,0.1)'}`,
                    boxShadow: isDark
                        ? '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(139,92,246,0.1)'
                        : '0 20px 60px rgba(124,58,237,0.12), 0 4px 16px rgba(0,0,0,0.04)',
                    padding: '36px 32px',
                    position: 'relative', overflow: 'hidden',
                }}
            >
                {/* Gradient top bar */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 4,
                    background: 'linear-gradient(90deg, #7c3aed, #06b6d4, #f43f5e)',
                    borderRadius: '28px 28px 0 0',
                }} />

                {/* Logo icon */}
                <div style={{ textAlign: 'center', marginBottom: 20, marginTop: 8 }}>
                    <motion.div
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2.5, repeat: Infinity }}
                        style={{
                            width: 64, height: 64, borderRadius: 20, margin: '0 auto 16px',
                            background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 28, boxShadow: '0 8px 24px rgba(124,58,237,0.35)',
                        }}
                    >
                        🎓
                    </motion.div>
                    <h1 style={{
                        fontSize: 26, fontWeight: 900, margin: 0,
                        color: isDark ? '#ede9fe' : '#1a1035',
                        letterSpacing: '-0.5px',
                        background: isDark ? 'none' : 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                        WebkitBackgroundClip: isDark ? 'unset' : 'text',
                        WebkitTextFillColor: isDark ? 'unset' : 'transparent',
                        backgroundClip: isDark ? 'unset' : 'text',
                    }}>
                        Welcome back 👋
                    </h1>
                    <p style={{
                        margin: '6px 0 0', fontSize: 13,
                        color: isDark ? '#6b7280' : '#9ca3af', fontWeight: 500,
                    }}>
                        {quote}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    {/* Username */}
                    <div style={{ marginBottom: 12, position: 'relative' }}>
                        <span style={{
                            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                            color: '#9ca3af', fontSize: 14,
                        }}>
                            <i className="fas fa-user" />
                        </span>
                        <input
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            required
                            style={{
                                width: '100%', padding: '13px 14px 13px 40px',
                                border: `1.5px solid ${isDark ? 'rgba(139,92,246,0.2)' : 'rgba(124,58,237,0.12)'}`,
                                borderRadius: 14, fontSize: 14, fontWeight: 500,
                                background: isDark ? 'rgba(255,255,255,0.04)' : '#faf9ff',
                                color: isDark ? '#e2e8f0' : '#1a1035',
                                outline: 'none', boxSizing: 'border-box',
                                transition: 'all 0.2s ease', fontFamily: 'inherit',
                            }}
                            onFocus={e => { e.target.style.borderColor = '#7c3aed'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.12)'; }}
                            onBlur={e => { e.target.style.borderColor = isDark ? 'rgba(139,92,246,0.2)' : 'rgba(124,58,237,0.12)'; e.target.style.boxShadow = 'none'; }}
                        />
                    </div>

                    {/* Password */}
                    <div style={{ marginBottom: 20, position: 'relative' }}>
                        <span style={{
                            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                            color: '#9ca3af', fontSize: 14,
                        }}>
                            <i className="fas fa-lock" />
                        </span>
                        <input
                            type={showPass ? 'text' : 'password'}
                            placeholder="Password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            style={{
                                width: '100%', padding: '13px 42px 13px 40px',
                                border: `1.5px solid ${isDark ? 'rgba(139,92,246,0.2)' : 'rgba(124,58,237,0.12)'}`,
                                borderRadius: 14, fontSize: 14, fontWeight: 500,
                                background: isDark ? 'rgba(255,255,255,0.04)' : '#faf9ff',
                                color: isDark ? '#e2e8f0' : '#1a1035',
                                outline: 'none', boxSizing: 'border-box',
                                transition: 'all 0.2s ease', fontFamily: 'inherit',
                            }}
                            onFocus={e => { e.target.style.borderColor = '#7c3aed'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.12)'; }}
                            onBlur={e => { e.target.style.borderColor = isDark ? 'rgba(139,92,246,0.2)' : 'rgba(124,58,237,0.12)'; e.target.style.boxShadow = 'none'; }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPass(p => !p)}
                            style={{
                                position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                                border: 'none', background: 'transparent', cursor: 'pointer',
                                color: '#9ca3af', fontSize: 13,
                            }}
                        >
                            <i className={showPass ? 'fas fa-eye-slash' : 'fas fa-eye'} />
                        </button>
                    </div>

                    {/* Submit button */}
                    <motion.button
                        type="submit"
                        disabled={loading}
                        whileHover={{ scale: loading ? 1 : 1.02 }}
                        whileTap={{ scale: loading ? 1 : 0.97 }}
                        style={{
                            width: '100%', padding: '14px',
                            borderRadius: 16, border: 'none',
                            background: loading
                                ? '#94a3b8'
                                : 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                            color: 'white', fontSize: 15, fontWeight: 800,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            letterSpacing: '-0.2px', fontFamily: 'inherit',
                            boxShadow: loading ? 'none' : '0 8px 24px rgba(124,58,237,0.4)',
                            transition: 'all 0.25s ease', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', gap: 8,
                        }}
                    >
                        {loading ? (
                            <>
                                <span style={{
                                    width: 16, height: 16, border: '2px solid white',
                                    borderTopColor: 'transparent', borderRadius: '50%',
                                    display: 'inline-block', animation: 'spin 0.7s linear infinite',
                                }} />
                                Verifying...
                            </>
                        ) : (
                            <>Sign In <span>→</span></>
                        )}
                    </motion.button>
                </form>

                {/* Error */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                            marginTop: 14, padding: '10px 14px',
                            background: '#fff1f2', border: '1px solid #fecdd3',
                            borderRadius: 12, fontSize: 13, color: '#be123c',
                            fontWeight: 600, textAlign: 'center',
                        }}
                    >
                        ⚠️ {error}
                    </motion.div>
                )}

                {/* Divider footer */}
                <p style={{
                    textAlign: 'center', marginTop: 20, fontSize: 11,
                    color: isDark ? '#374151' : '#d1d5db', fontWeight: 500,
                }}>
                    Protected by secure authentication
                </p>
            </motion.div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
