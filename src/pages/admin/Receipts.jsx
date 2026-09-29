import { useState, useRef, useMemo } from 'react';
import { useReactToPrint } from 'react-to-print';
import DataTable from '../../components/ui/DataTable';
import ReceiptTemplate from '../../components/ui/ReceiptTemplate';

export default function Receipts({ adminData }) {
    const fees = adminData?.fees || [];
    const reversedFees = [...fees].reverse();

    const [printTx, setPrintTx] = useState(null);
    const receiptRef = useRef();

    const handlePrint = useReactToPrint({
        contentRef: receiptRef,
        documentTitle: `Receipt_${printTx?.receiptNo || 'Copy'}`,
        onAfterPrint: () => setPrintTx(null)
    });

    const getFranchiseData = (studId) => {
        if (!adminData?.franchises || adminData.franchises.length === 0) return null;
        const adm = (adminData.admissions || []).find(a => String(a[2] || a[3]) === String(studId));
        const branch = adm ? (adm[6] || adm[5]) : '';
        const match = adminData.franchises.find(f => String(f.branch).toLowerCase() === String(branch).toLowerCase());
        return match || adminData.franchises[0];
    };

    useMemo(() => {
        if (printTx) {
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
        { key: 'dueDate', label: 'Next Due Date' },
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
                    const recNo = String(r[0] || '').includes('REC') || String(r[0] || '').includes('/') ? r[0] : (r[1] || r[0]);
                    const dateStr = String(r[1] || '').includes('-') || String(r[1] || '').includes('/') ? r[1] : (r[0] || '');
                    const studId = r[2] || '';
                    const name = r[3] || '';
                    const course = r[4] || '';
                    const amount = r[5] || 0;
                    const mode = r[7] || r[6] || 'Cash';
                    const collector = r[8] || '';
                    const remark = r[9] || '';
                    const dueDateStr = r[10] || '';

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
                            <td className="text-xs font-semibold">
                                {dueDateStr ? (
                                    <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg font-mono">
                                        📅 {dueDateStr}
                                    </span>
                                ) : (
                                    <span className="text-gray-400">N/A</span>
                                )}
                            </td>
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
