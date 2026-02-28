/**
 * Receipts — Admin receipts/fee records page.
 * Displays all fee collection records in a table.
 */

import DataTable from '../../components/ui/DataTable';

const COLUMNS = [
    { key: 'recNo', label: 'Rec No' },
    { key: 'date', label: 'Date' },
    { key: 'name', label: 'Name' },
    { key: 'amount', label: 'Amount' },
];

export default function Receipts({ adminData }) {
    const fees = adminData?.fees || [];

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Receipts</h1>
            <DataTable
                columns={COLUMNS}
                data={fees}
                renderRow={(r, i) => (
                    <tr key={i} className="t-row">
                        <td>{r[0]}</td>
                        <td>{r[1]}</td>
                        <td>{r[3]}</td>
                        <td className="font-bold text-green-700">₹{r[5]}</td>
                    </tr>
                )}
            />
        </div>
    );
}
