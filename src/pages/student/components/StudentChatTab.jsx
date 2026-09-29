import React from 'react';
import WhatsAppChat from '../../../components/chat/WhatsAppChat';

export default function StudentChatTab({ user, profile, isDark }) {
    const studentUser = {
        id: user?.studentId || user?.userId || profile?.id || 'student',
        studentId: user?.studentId || user?.userId || profile?.id || 'student',
        name: profile?.name || user?.name || 'Student',
        branch: user?.branch || profile?.branch || '',
        role: 'student'
    };

    return (
        <div style={{ marginTop: 8 }}>
            <WhatsAppChat
                currentUser={studentUser}
                userRole="student"
                isDark={isDark}
            />
        </div>
    );
}
