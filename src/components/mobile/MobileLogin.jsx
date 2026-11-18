import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function MobileLogin() {
    const { login, isAuthenticated, user, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    const [selectedRoleTab, setSelectedRoleTab] = useState(() => {
        try {
            const saved = localStorage.getItem('dcc_saved_login');
            if (saved) {
                const parsed = JSON.parse(saved);
                return (parsed.role === 'admin' || parsed.role === 'employee') ? 'admin' : 'student';
            }
        } catch (e) {}
        return 'student';
    });

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [saveCredentials, setSaveCredentials] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Restore saved credentials
    useEffect(() => {
        try {
            const saved = localStorage.getItem('dcc_saved_login');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.username) setUsername(parsed.username);
                if (parsed.password) setPassword(parsed.password);
                if (parsed.role) setSelectedRoleTab((parsed.role === 'admin' || parsed.role === 'employee') ? 'admin' : 'student');
                setSaveCredentials(true);
            }
        } catch (e) {}
    }, []);

    // Redirect if authenticated
    useEffect(() => {
        if (isAuthenticated && !authLoading) {
            const role = String(user?.role || JSON.parse(localStorage.getItem('erp_session') || '{}')?.role || '').trim().toLowerCase();
            if (role === 'student') navigate('/student', { replace: true });
            else if (role === 'employee') navigate('/employee', { replace: true });
            else navigate('/admin', { replace: true });
        }
    }, [isAuthenticated, authLoading, user, navigate]);

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!username.trim() || !password.trim()) {
            setErrorMessage('Please enter both username and password');
            return;
        }
        setIsLoading(true);
        setErrorMessage('');

        try {
            const result = await login(username.trim(), password.trim());
            if (result && result.success) {
                const stored = JSON.parse(localStorage.getItem('erp_session') || '{}');
                const resolvedRole = String(result.role || stored?.role || selectedRoleTab || 'student').trim().toLowerCase();
                const savedTabRole = resolvedRole === 'student'
                    ? 'student'
                    : resolvedRole === 'employee'
                        ? 'employee'
                        : 'admin';

                if (saveCredentials) {
                    localStorage.setItem('dcc_saved_login', JSON.stringify({
                        username: username.trim(),
                        password: password.trim(),
                        role: savedTabRole,
                        branch: result.branch || stored?.branch || 'Devichapada'
                    }));
                } else {
                    localStorage.removeItem('dcc_saved_login');
                }

                if (resolvedRole === 'student') {
                    navigate('/student', { replace: true });
                } else if (resolvedRole === 'employee') {
                    navigate('/employee', { replace: true });
                } else {
                    navigate('/admin', { replace: true });
                }
            } else {
                setErrorMessage(result?.error || 'Invalid username or password.');
            }
        } catch (err) {
            setErrorMessage(err.message || 'Unable to reach server. Please check connection.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full bg-[#0B0F19] text-white flex flex-col justify-between overflow-x-hidden selection:bg-indigo-500 selection:text-white font-sans">
            {/* Ambient Radial Gradient Orbs */}
            <div className="absolute top-[-80px] left-[-80px] w-[360px] h-[360px] rounded-full bg-gradient-to-br from-[#4F46E5]/30 to-transparent blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-80px] right-[-80px] w-[320px] h-[320px] rounded-full bg-gradient-to-tl from-[#10B981]/25 to-transparent blur-3xl pointer-events-none" />

            <div className="relative z-10 w-full max-w-md mx-auto px-6 py-8 flex flex-col items-center">
                {/* Logo Badge */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    className="w-18 h-18 rounded-[22px] bg-gradient-to-br from-[#4F46E5] to-[#06B6D4] flex items-center justify-center shadow-lg shadow-indigo-500/25 mb-4"
                >
                    <span className="text-white text-2xl font-black tracking-wider">DCC</span>
                </motion.div>

                {/* Title & Tagline */}
                <motion.h1
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="text-2xl font-extrabold text-[#F8FAFC] text-center"
                >
                    DCC Student Portal
                </motion.h1>
                <motion.p
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.15 }}
                    className="text-xs text-[#94A3B8] text-center mt-1 px-4 mb-6"
                >
                    Unified Campus Management & WhatsApp Chat
                </motion.p>

                {/* Role Toggle Pill */}
                <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                    className="w-full bg-[#131B2E] border border-[#1F293D] rounded-2xl p-1 flex items-center mb-5"
                >
                    <button
                        type="button"
                        onClick={() => { setSelectedRoleTab('student'); setErrorMessage(''); }}
                        className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all duration-200 text-center ${
                            selectedRoleTab === 'student'
                                ? 'bg-[#4F46E5] text-white shadow-md shadow-indigo-600/30'
                                : 'text-[#94A3B8] hover:text-white'
                        }`}
                    >
                        Student Portal
                    </button>
                    <button
                        type="button"
                        onClick={() => { setSelectedRoleTab('admin'); setErrorMessage(''); }}
                        className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all duration-200 text-center ${
                            selectedRoleTab === 'admin'
                                ? 'bg-[#10B981] text-white shadow-md shadow-emerald-600/30'
                                : 'text-[#94A3B8] hover:text-white'
                        }`}
                    >
                        Admin & Faculty
                    </button>
                </motion.div>

                {/* Login Container Card */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.25 }}
                    className="w-full bg-[#131B2E] border border-[#1F293D] rounded-[26px] p-6 shadow-xl"
                >
                    <h2 className="text-base font-bold text-[#F8FAFC] mb-4">
                        {selectedRoleTab === 'student' ? 'Student Authentication' : 'Administrator Login'}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Username Field */}
                        <div>
                            <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">
                                {selectedRoleTab === 'student' ? 'Student ID / Username' : 'Admin Username'}
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => { setUsername(e.target.value); setErrorMessage(''); }}
                                placeholder={selectedRoleTab === 'student' ? 'e.g. ST-2026-1001 or swapnil' : 'e.g. admin'}
                                className="w-full bg-[#0B0F19] border border-[#1F293D] rounded-xl px-4 py-3 text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-all"
                                autoCapitalize="none"
                                required
                            />
                        </div>

                        {/* Password Field */}
                        <div>
                            <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); setErrorMessage(''); }}
                                    placeholder="Enter your password"
                                    className="w-full bg-[#0B0F19] border border-[#1F293D] rounded-xl px-4 py-3 text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-all pr-16"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#818CF8] hover:text-[#A5B4FC] px-2 py-1"
                                >
                                    {showPassword ? 'HIDE' : 'SHOW'}
                                </button>
                            </div>
                        </div>

                        {/* Save Credentials Option */}
                        <div className="flex items-center justify-between py-1">
                            <div>
                                <span className="block text-xs font-semibold text-[#F8FAFC]">Save Credentials</span>
                                <span className="block text-[11px] text-[#64748B]">Stay logged in on this device</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={saveCredentials}
                                    onChange={(e) => setSaveCredentials(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className={`w-10 h-5 bg-[#1F293D] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${
                                    selectedRoleTab === 'student' ? 'peer-checked:bg-[#4F46E5]' : 'peer-checked:bg-[#10B981]'
                                }`}></div>
                            </label>
                        </div>

                        {/* Error Banner */}
                        <AnimatePresence>
                            {errorMessage && (
                                <motion.div
                                    initial={{ opacity: 0, y: -6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    className="p-3 bg-[#3B1219] border border-[#F43F5E] rounded-xl text-center"
                                >
                                    <span className="text-xs font-bold text-[#FFB4AB]">{errorMessage}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full h-[50px] rounded-2xl font-bold text-sm text-white shadow-lg transition-all duration-200 flex items-center justify-center space-x-2 ${
                                selectedRoleTab === 'student'
                                    ? 'bg-[#4F46E5] hover:bg-[#4338CA] shadow-indigo-500/25 active:scale-[0.98]'
                                    : 'bg-[#10B981] hover:bg-[#059669] shadow-emerald-500/25 active:scale-[0.98]'
                            } ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>Authenticating...</span>
                                </>
                            ) : (
                                <span>{selectedRoleTab === 'student' ? 'Student Sign In' : 'Admin Sign In'}</span>
                            )}
                        </button>
                    </form>
                </motion.div>

                {/* Footer Tag */}
                <p className="text-[11px] text-[#64748B] text-center mt-6">
                    Secured with Google Cloud Apps Script Database
                </p>
            </div>
        </div>
    );
}
