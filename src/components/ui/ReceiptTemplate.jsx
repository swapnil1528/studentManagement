import { forwardRef } from 'react';

const ReceiptTemplate = forwardRef(({ transaction, franchiseData }, ref) => {
    if (!transaction) return null;

    const fallbackFranchise = {
        centerName: "Institute Name",
        address: "Institute Address",
        mobile: "Contact Number"
    };

    const fh = franchiseData || fallbackFranchise;

    return (
        <div ref={ref} className="bg-white p-8 w-[800px] text-black font-sans my-0 mx-auto box-border" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-gray-800 pb-4 mb-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-indigo-900 mb-1 leading-tight">{fh.centerName}</h1>
                    <p className="text-sm font-medium text-gray-700 max-w-sm">{fh.address}</p>
                    {fh.centerCode && <p className="text-sm font-medium text-gray-700 mt-1">Center Code: {fh.centerCode}</p>}
                    <p className="text-sm font-medium text-gray-700 mt-1">Phone: +91 {fh.mobile}</p>
                </div>
                <div className="text-right">
                    <h2 className="text-4xl font-black text-gray-200 uppercase tracking-widest mb-2 leading-none">RECEIPT</h2>
                    <div className="bg-indigo-50 px-3 py-1.5 rounded inline-block text-left border border-indigo-100">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5">Receipt No</p>
                        <p className="text-base font-bold text-indigo-900">{transaction.receiptNo || transaction.id || `REC-${Date.now().toString().slice(-6)}`}</p>
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-end mb-8">
                <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Received From</p>
                    <h3 className="text-xl font-bold text-gray-900">{transaction.name}</h3>
                    <p className="text-sm text-gray-600 mt-1"><span className="font-semibold">Student ID:</span> {transaction.id}</p>
                    <p className="text-sm text-gray-600"><span className="font-semibold">Course:</span> {transaction.course}</p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-gray-600"><span className="font-semibold">Date:</span> {transaction.date || new Date().toLocaleDateString('en-IN')}</p>
                </div>
            </div>

            {/* Payment Details Table */}
            <table className="w-full mb-8 border-collapse">
                <thead>
                    <tr className="bg-gray-100 border-y-2 border-gray-300">
                        <th className="py-3 px-4 text-left text-sm font-bold text-gray-700 uppercase">Description</th>
                        <th className="py-3 px-4 text-center text-sm font-bold text-gray-700 uppercase">Mode</th>
                        <th className="py-3 px-4 text-right text-sm font-bold text-gray-700 uppercase">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr className="border-b border-gray-200">
                        <td className="py-4 px-4 text-gray-800">
                            <span className="font-medium">Tuition Fees</span>
                            {transaction.remarks && <div className="text-xs text-gray-500 mt-1">Note: {transaction.remarks}</div>}
                        </td>
                        <td className="py-4 px-4 text-center text-gray-800 font-medium capitalize">{transaction.mode}</td>
                        <td className="py-4 px-4 text-right text-gray-900 font-bold">₹{Number(transaction.amount).toLocaleString('en-IN')}</td>
                    </tr>
                </tbody>
            </table>

            {/* Total Row */}
            <div className="flex justify-end mb-12">
                <div className="w-64 border-t-2 border-gray-800 pt-3">
                    <div className="flex justify-between items-center bg-gray-50 p-2 rounded">
                        <span className="font-bold text-gray-700 text-lg">Total Paid</span>
                        <span className="font-bold text-indigo-700 text-2xl">₹{Number(transaction.amount).toLocaleString('en-IN')}</span>
                    </div>
                </div>
            </div>

            {/* Footer / Signatures */}
            <div className="flex justify-between items-end mt-16 pt-8 border-t border-gray-200">
                <div className="text-center w-48">
                    <div className="border-b border-gray-400 mb-2 h-8"></div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Student Signature</p>
                </div>
                <div className="text-center w-48">
                    <div className="border-b border-gray-400 mb-2 h-8"></div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Authorized Signatory</p>
                </div>
            </div>

            <p className="text-center text-xs text-gray-400 mt-8 mb-0">This is a computer-generated receipt.</p>
        </div>
    );
});

ReceiptTemplate.displayName = 'ReceiptTemplate';

export default ReceiptTemplate;
