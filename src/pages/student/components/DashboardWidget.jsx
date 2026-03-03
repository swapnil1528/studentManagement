import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, Calendar, AlertCircle } from 'lucide-react';

export default function DashboardWidget({ att, profile, assignmentsData, initiateAttendance, canMarkAttendance, attStatus, cameraRequired, notices }) {
    const percentage = att?.perc || 0;

    // Calculate stroke dash array for SVG circle
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    const dueSoon = assignmentsData?.assignments?.slice(0, 3) || [];
    const latestNotice = notices && notices.length > 0 ? notices[0] : null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl mx-auto">

            {/* Attendance & Check-In Widget */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-lg border border-white/50 relative overflow-hidden flex flex-col justify-between"
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>

                <h3 className="font-bold text-xl text-gray-800 mb-6 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-500" />
                    Today's Check-In
                </h3>

                <div className="flex items-center justify-between mb-8">
                    <div className="relative w-24 h-24 flex items-center justify-center">
                        <svg className="transform -rotate-90 w-24 h-24">
                            <circle cx="48" cy="48" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100" />
                            <motion.circle
                                initial={{ strokeDashoffset: circumference }}
                                animate={{ strokeDashoffset }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                cx="48" cy="48" r={radius}
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="transparent"
                                strokeDasharray={circumference}
                                className="text-indigo-500 line-cap-round"
                            />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center text-center">
                            <span className="text-xl font-extrabold text-gray-800">{percentage}%</span>
                        </div>
                    </div>

                    <div className="text-right flex-col flex gap-1">
                        <span className="text-sm text-gray-500 font-medium">Status</span>
                        <span className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-sm ${attStatus.class.includes('not') ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {attStatus.label}
                        </span>
                        {att.lastCheckInTime && <span className="text-xs text-gray-400 mt-1">{new Date(att.lastCheckInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                    </div>
                </div>

                <div className="flex gap-3 mt-auto">
                    {attStatus.showOut ? (
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 bg-rose-500 hover:bg-rose-600 text-white py-4 rounded-2xl font-bold text-sm transition-colors shadow-md shadow-rose-500/20" onClick={() => initiateAttendance('Check-Out')} disabled={!canMarkAttendance}>
                            <span>Check Out</span>
                        </motion.button>
                    ) : (
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white py-4 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-indigo-500/30" onClick={() => initiateAttendance('Check-In')} disabled={!canMarkAttendance || att.todayStatus === 'Check-Out'}>
                            <span>Tap to Check In</span>
                        </motion.button>
                    )}
                </div>
            </motion.div>

            {/* Utilities Column */}
            <div className="flex flex-col gap-6">

                {/* Mini Notices / Announcements */}
                {latestNotice && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="bg-gradient-to-br from-amber-400 to-orange-400 p-6 rounded-3xl shadow-lg relative overflow-hidden cursor-pointer"
                    >
                        <div className="absolute right-0 top-0 opacity-10 transform scale-150 -rotate-12">
                            <AlertCircle size={100} />
                        </div>
                        <h4 className="text-white/90 font-bold text-sm mb-1 uppercase tracking-wider">Announcement</h4>
                        <p className="text-white font-bold text-lg leading-tight">{latestNotice.title}</p>
                    </motion.div>
                )}

                {/* Due Soon Assignments */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                    className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-lg border border-white/50 flex-1"
                >
                    <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-500" />
                        Recent Assignments
                    </h3>

                    <div className="space-y-3">
                        {dueSoon.length > 0 ? dueSoon.map((a, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-gray-50/50 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer group">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                        <CheckCircle size={18} />
                                    </div>
                                    <div className="flex flex-col truncate">
                                        <span className="font-semibold text-gray-800 text-sm truncate">{a.topic || 'Untitled'}</span>
                                        <span className="text-xs text-gray-500 truncate">{a.course}</span>
                                    </div>
                                </div>
                                <a href={a.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 shrink-0">
                                    Get
                                </a>
                            </div>
                        )) : (
                            <div className="text-center py-6">
                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">🎉</div>
                                <span className="text-sm text-gray-500">You're all caught up!</span>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

        </div>
    );
}
