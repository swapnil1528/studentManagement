import React from 'react';
import WhatsAppChat from '../../components/chat/WhatsAppChat';
import { useTheme } from '../../context/ThemeContext';

export default function ChatAdmin({ user, adminData }) {
    const { isDark } = useTheme();

    const adminUser = {
        id: user?.id || user?.username || 'admin',
        username: user?.username || 'Admin',
        name: user?.name || user?.username || 'Faculty / Admin',
        role: user?.role || 'admin',
        branch: user?.branch || 'All'
    };

    return (
        <div className="p-4 md:p-6" style={{ maxWidth: '1600px', margin: '0 auto' }}>
            <div className="mb-4 flex justify-between items-center flex-wrap gap-2">
                <div>
                    <h1 className="text-2xl font-black tracking-tight" style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>
                        💬 Student Chat & Batch Community
                    </h1>
                    <p className="text-xs font-semibold text-slate-500">
                        WhatsApp-style direct messaging, course-wise groups, batch timing discussions & study material sharing.
                    </p>
                </div>
            </div>

            <WhatsAppChat
                currentUser={adminUser}
                userRole={user?.role || 'admin'}
                isDark={isDark}
            />
        </div>
    );
}
