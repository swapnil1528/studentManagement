/**
 * LoginPage — Authentication screen.
 * Handles form submission, validation, and role-based redirect.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const result = await login(username, password);

        if (result.success) {
            // Read the stored user to determine redirect
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-96 border border-gray-100">
                {/* Logo */}
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto text-blue-600 text-2xl mb-2">
                        <i className="fas fa-graduation-cap" />
                    </div>
                    <h1 className="text-2xl font-bold text-blue-600">Institute Portal</h1>
                    <p className="text-gray-400 text-sm">Admin, Employee & Student Login</p>
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
                    <p className="text-red-500 text-sm text-center mt-4">{error}</p>
                )}
            </div>
        </div>
    );
}
