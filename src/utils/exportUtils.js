/**
 * useExport — utility to export table data as CSV (opens in Excel) or print as PDF.
 * No external libraries needed.
 */

/** Export data as a CSV file that opens in Excel */
export function exportCsv(filename, headers, rows) {
    const escape = (v) => {
        if (v === null || v === undefined) return '';
        const s = String(v).replace(/"/g, '""');
        return s.includes(',') || s.includes('\n') || s.includes('"') ? `"${s}"` : s;
    };
    const lines = [
        headers.map(escape).join(','),
        ...rows.map(row => row.map(escape).join(',')),
    ];
    const csv = '\uFEFF' + lines.join('\r\n'); // BOM for Excel UTF-8
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename + '.csv';
    a.click();
    URL.revokeObjectURL(url);
}

/** Open a print dialog with a nicely formatted HTML table (saves as PDF via browser) */
export function exportPdf(title, headers, rows) {
    const ths = headers.map(h => `<th style="padding:6px 10px;background:#6366f1;color:white;font-size:12px;">${h}</th>`).join('');
    const trs = rows.map((row, ri) =>
        `<tr style="background:${ri % 2 === 0 ? '#f8f9ff' : '#ffffff'}">
            ${row.map(cell => `<td style="padding:5px 10px;font-size:12px;border-bottom:1px solid #e5e7eb;">${cell ?? ''}</td>`).join('')}
        </tr>`
    ).join('');
    const html = `<!DOCTYPE html><html><head><title>${title}</title>
    <style>body{font-family:Arial,sans-serif;margin:20px} table{border-collapse:collapse;width:100%} @media print{@page{size:landscape}}</style>
    </head><body>
    <h2 style="color:#6366f1;margin-bottom:12px">${title}</h2>
    <p style="color:#94a3b8;font-size:12px;margin-bottom:16px">Generated: ${new Date().toLocaleString()}</p>
    <table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>
    <script>window.onload=()=>{window.print();}<\/script></body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
}
