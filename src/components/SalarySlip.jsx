import React from 'react';

export default function SalarySlip({ slip, employee, onClose }) {
    if (!slip) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:p-0 print:bg-white print:static print:inset-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto print:max-w-none print:shadow-none print:h-auto print:overflow-visible">
                {/* Header Actions (Hidden when printing) */}
                <div className="flex justify-between items-center p-4 border-b print:hidden">
                    <h2 className="font-bold text-lg">Salary Slip Viewer</h2>
                    <div className="flex gap-2">
                        <button onClick={handlePrint} className="btn bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
                            <i className="fas fa-print"></i> Print / PDF
                        </button>
                        <button onClick={onClose} className="btn-outline border-red-200 text-red-600 hover:bg-red-50">
                            Close
                        </button>
                    </div>
                </div>

                {/* Printable Slip Content */}
                <div id="printable-salary-slip" className="p-8 print:p-4 text-gray-800">
                    <div className="text-center mb-6 border-b pb-4">
                        <h1 className="text-3xl font-bold text-indigo-700">EduManager Institute</h1>
                        <p className="text-sm text-gray-500 mt-1">123 Education Lane, Academic District</p>
                        <h2 className="text-xl font-bold text-gray-700 mt-4 uppercase tracking-wider">Salary Slip</h2>
                        <p className="text-sm">For the month ending: <strong>{new Date(slip.date).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</strong></p>
                    </div>

                    <div className="grid grid-cols-2 gap-8 mb-6">
                        <div>
                            <table className="w-full text-sm">
                                <tbody>
                                    <tr><td className="py-1 text-gray-500 w-1/3">Employee Name:</td><td className="py-1 font-bold">{employee?.name || slip.name || 'N/A'}</td></tr>
                                    <tr><td className="py-1 text-gray-500">Employee ID:</td><td className="py-1 font-bold">{employee?.id || slip.empId || 'N/A'}</td></tr>
                                    {employee?.role && <tr><td className="py-1 text-gray-500">Designation:</td><td className="py-1 font-bold">{employee.role}</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        <div>
                            <table className="w-full text-sm">
                                <tbody>
                                    <tr><td className="py-1 text-gray-500 w-1/3">Slip Number:</td><td className="py-1 font-mono text-xs">{slip.id}</td></tr>
                                    <tr><td className="py-1 text-gray-500">Payment Date:</td><td className="py-1 font-bold">{new Date(slip.date).toLocaleDateString()}</td></tr>
                                    <tr><td className="py-1 text-gray-500">Working Days:</td><td className="py-1 font-bold">{slip.days}</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="border rounded-lg overflow-hidden mb-8">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="p-3 font-semibold text-gray-700">Earnings</th>
                                    <th className="p-3 font-semibold text-gray-700 text-right">Amount (₹)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b">
                                    <td className="p-3">Basic Salary / Wages (Calculated for {slip.days} days)</td>
                                    <td className="p-3 text-right font-mono">{Number(slip.amount).toLocaleString('en-IN')}</td>
                                </tr>
                                {/* Additional allowance rows can go here in future */}
                                <tr className="bg-gray-50">
                                    <td className="p-3 font-bold text-gray-800">Gross Earnings</td>
                                    <td className="p-3 text-right font-bold text-indigo-700 text-lg">₹{Number(slip.amount).toLocaleString('en-IN')}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-between items-end mt-12 pt-8 border-t">
                        <div>
                            <p className="text-xs text-gray-500">This is a system generated salary slip.</p>
                            <p className="text-xs text-gray-500">No signature required.</p>
                        </div>
                        <div className="text-center group">
                            <div className="border-b border-gray-400 w-48 mb-2"></div>
                            <p className="text-sm font-bold text-gray-700">Authorized Signatory</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
