/**
 * Dashboard — Admin overview page.
 * Shows KPI stat cards and recent activity.
 */

import StatCard from '../../components/ui/StatCard';

export default function Dashboard({ adminData }) {
    const stats = adminData?.stats || {};
    const inquiries = adminData?.inquiries || [];
    const admissions = adminData?.admissions || [];

    // Recent activity: last 5 inquiries
    const recentInquiries = inquiries.slice(-5).reverse();

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6">Overview</h1>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <StatCard
                    value={stats.todayPresent || 0}
                    label="Present Today"
                    icon="fas fa-user-check"
                    iconColor="text-green-200"
                    borderColor="border-l-4 border-green-500"
                />
                <StatCard
                    value={stats.todayAbsent || 0}
                    label="Absent Today"
                    icon="fas fa-user-times"
                    iconColor="text-red-200"
                    borderColor="border-l-4 border-red-500"
                />
                <StatCard
                    value={inquiries.length}
                    label="Inquiries"
                    icon="fas fa-users"
                    iconColor="text-blue-500"
                />
                <StatCard
                    value={inquiries.filter((x) => x[7] === 'New').length}
                    label="Pending"
                    icon="fas fa-clock"
                    iconColor="text-orange-500"
                />
            </div>

            {/* Recent Activity */}
            <div className="card">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                    <i className="fas fa-history text-gray-400" /> Recent Activity
                </h3>
                <div className="space-y-2">
                    {recentInquiries.length > 0 ? (
                        recentInquiries.map((r, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                    <span className="font-bold text-gray-700">{r[3]}</span>
                                    <span className="text-xs text-gray-400 ml-2">— {r[6]}</span>
                                </div>
                                <span className={`badge ${r[7] === 'Confirmed' ? 'b-green' : 'b-yellow'}`}>
                                    {r[7]}
                                </span>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-gray-400">No recent activity</p>
                    )}
                </div>
            </div>
        </div>
    );
}
