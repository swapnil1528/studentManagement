import { useState, useRef, useMemo } from 'react';
import { useReactToPrint } from 'react-to-print';
import DataTable from '../../components/ui/DataTable';
import ReceiptTemplate from '../../components/ui/ReceiptTemplate';

export default function Receipts({ adminData }) {
    // Drop first row if it's headers, but getAdminData usually skips headers for 'FEE MANAGEMENT'
    // Let's assume r is the actual data rows.
    const fees = adminData?.fees || [];

    // Reverse fees to show newest first, assuming appended at bottom
    const reversedFees = [...fees].reverse();

    const [printTx, setPrintTx] = useState(null);
    const receiptRef = useRef();

    const handlePrint = useReactToPrint({
        contentRef: receiptRef,
        documentTitle: `Receipt_${printTx?.receiptNo || 'Copy'}`,
        onAfterPrint: () => setPrintTx(null)
    });

    // Helper to find franchise data based on the student's branch
    const getFranchiseData = (studId) => {
        if (!adminData?.franchises || adminData.franchises.length === 0) return null;
        const adm = (adminData.admissions || []).find(a => String(a[2] || a[3]) === String(studId));
        const branch = adm ? (adm[6] || adm[5]) : ''; // r[6] Branch
        const match = adminData.franchises.find(f => String(f.branch).toLowerCase() === String(branch).toLowerCase());
        return match || adminData.franchises[0]; // fallback to first franchise
    };

    // Trigger print when printTx state is fully set and rendered
    useMemo(() => {
        if (printTx) {
            // small timeout to allow react-to-print to see the updated ref
            setTimeout(() => {
                handlePrint();
            }, 100);
        }
    }, [printTx, handlePrint]);

    const COLUMNS = [
        { key: 'recNo', label: 'Receipt No' },
        { key: 'date', label: 'Date' },
        { key: 'student', label: 'Student' },
        { key: 'course', label: 'Course' },
        { key: 'mode', label: 'Mode' },
        { key: 'amount', label: 'Amount' },
        { key: 'action', label: 'Action' },
    ];

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Past Receipts</h1>
            </div>

            <DataTable
                columns={COLUMNS}
                data={reversedFees}
                renderRow={(r, i) => {
                    // Fee Sheet Columns guess (based on old Receipts.jsx & typical setup):
                    // r[0]: Date
                    // r[1]: Receipt No / ID? (Wait, old code had r[0]=Rec No, r[1]=Date. Let's use robust fallback)
                    const dateStr = String(r[0]).includes('-') || String(r[0]).includes('/') ? r[0] : (r[1] || '');
                    const recNo = String(r[0]).includes('-') ? r[1] : r[0];
                    const studId = r[2];
                    const name = r[3];
                    const course = r[4];
                    const amount = r[5];
                    const mode = r[6] || 'Cash';
                    const collector = r[7] || '';

                    return (
                        <tr key={i} className="t-row hover:bg-gray-50">
                            <td className="font-mono text-sm font-semibold">{recNo || '--'}</td>
                            <td className="text-sm text-gray-600">{dateStr}</td>
                            <td>
                                <div className="font-bold text-gray-900">{name}</div>
                                <div className="text-xs text-gray-400">ID: {studId}</div>
                            </td>
                            <td><span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-full font-medium">{course || '--'}</span></td>
                            <td className="text-sm">{mode}</td>
                            <td className="font-bold text-green-700 text-base">₹{amount}</td>
                            <td>
                                <button
                                    onClick={() => setPrintTx({
                                        id: studId, name, course, amount, mode, receiptNo: recNo, date: dateStr, remarks: `Collected by ${collector}`
                                    })}
                                    className="px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm font-medium flex items-center gap-1 shadow-sm transition-colors"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                                    Reprint
                                </button>
                            </td>
                        </tr>
                    );
                }}
            />

            {/* Hidden template for printing */}
            <div style={{ display: 'none' }}>
                {printTx && (
                    <ReceiptTemplate
                        ref={receiptRef}
                        transaction={printTx}
                        franchiseData={getFranchiseData(printTx.id)}
                    />
                )}
            </div>
        </div>
    );
}
