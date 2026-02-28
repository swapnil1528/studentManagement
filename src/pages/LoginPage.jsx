/**
 * LoginPage — Premium authentication screen with gradient background.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const { isDark, toggleTheme } = useTheme();

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
            setError(result.error || 'Invalid Credentials');
        }

        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
            style={{
                background: isDark
                    ? 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)'
                    : 'linear-gradient(135deg, #e0e7ff 0%, #ede9fe 50%, #e0e7ff 100%)',
            }}
        >
            {/* Decorative circles */}
            <div className="absolute top-10 left-10 w-72 h-72 rounded-full opacity-20"
                style={{ background: 'radial-gradient(circle, #818cf8, transparent)', filter: 'blur(60px)' }}
            />
            <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full opacity-15"
                style={{ background: 'radial-gradient(circle, #a78bfa, transparent)', filter: 'blur(80px)' }}
            />

            {/* Dark mode toggle */}
            <button
                className="absolute top-5 right-5 w-11 h-11 rounded-xl flex items-center justify-center text-lg transition-all shadow-lg"
                style={{
                    background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.7)',
                    color: isDark ? '#fbbf24' : '#6366f1',
                    backdropFilter: 'blur(8px)',
                }}
                onClick={toggleTheme}
                title={isDark ? 'Light Mode' : 'Dark Mode'}
            >
                <i className={isDark ? 'fas fa-sun' : 'fas fa-moon'} />
            </button>

            <div className="p-8 rounded-2xl shadow-2xl w-96 relative"
                style={{
                    background: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.85)',
                    backdropFilter: 'blur(16px)',
                    border: `1px solid ${isDark ? 'rgba(71,85,105,0.4)' : 'rgba(255,255,255,0.5)'}`,
                }}
            >
                {/* Top gradient line */}
                <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
                    style={{ background: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899)' }}
                />

                {/* Logo */}
                <div className="text-center mb-6 mt-2">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto text-white text-2xl mb-3 shadow-lg"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                    >
                        <i className="fas fa-graduation-cap" />
                    </div>
                    <h1 className="text-2xl font-bold" style={{ color: isDark ? '#c7d2fe' : '#4338ca' }}>
                        Institute Portal
                    </h1>
                    <p className="text-sm mt-1" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>
                        Admin, Employee & Student Login
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <input
                        className="inp"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                    <input
                        className="inp"
                        placeholder="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button
                        className="btn w-full mt-2"
                        disabled={loading}
                    >
                        {loading ? 'Verifying...' : 'Sign In'}
                    </button>
                </form>

                {/* Error message */}
                {error && (
                    <p className="text-red-400 text-sm text-center mt-4 font-medium">{error}</p>
                )}
            </div>
        </div>
    );
}
