/**
 * StatCard — Dashboard KPI stat card.
 * Props:
 *   value       - The number/value to display
 *   label       - Description text
 *   icon        - Font Awesome icon class (e.g. 'fas fa-users')
 *   iconColor   - Tailwind text color for the icon
 *   borderColor - Tailwind border-l color class
 */

export default function StatCard({ value, label, icon, iconColor = 'text-blue-500', borderColor = '' }) {
    return (
        <div className={`stat-card ${borderColor}`}>
            <div>
                <div className="text-3xl font-bold text-gray-900">{value}</div>
                <div className="text-sm text-gray-500 mt-1">{label}</div>
            </div>
            <i className={`${icon} ${iconColor} text-2xl`} />
        </div>
    );
}
