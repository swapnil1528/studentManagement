/**
 * DataTable — Reusable table component.
 * Props:
 *   columns    - Array of { key, label } for the header
 *   data       - Array of row objects
 *   renderRow  - Function(row, index) => <tr> element
 *   emptyText  - Text shown when data is empty
 */

export default function DataTable({ columns, data, renderRow, emptyText = 'No Data' }) {
    return (
        <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto w-full">
                <table className="w-full text-left">
                    <thead className="t-head">
                        <tr>
                            {columns.map((col) => (
                                <th key={col.key} className="whitespace-nowrap px-4 py-3">{col.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data && data.length > 0 ? (
                            data.map((row, i) => renderRow(row, i))
                        ) : (
                            <tr>
                                <td colSpan={columns.length} className="p-4 text-center text-gray-400">
                                    {emptyText}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
