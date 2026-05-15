/**
 * exportToCSV
 * Converts an array of JSON objects → CSV string → browser file download.
 *
 * @param {Object[]} data     - Array of plain objects (rows)
 * @param {string}   filename - Download filename (without extension)
 */
export function exportToCSV(data, filename = 'export') {
  if (!data || data.length === 0) return;

  const columns = Object.keys(data[0]);

  // Header row
  const header = columns
    .map(col => `"${String(col).replace(/"/g, '""')}"`)
    .join(',');

  // Data rows — wrap every cell in quotes; escape internal quotes
  const rows = data.map(row =>
    columns
      .map(col => {
        const val = row[col] ?? '';
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(',')
  );

  const csvContent = [header, ...rows].join('\n');

  // UTF-8 BOM so Arabic characters open correctly in Excel
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href     = url;
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * exportMultipleToCSV
 * Downloads several tables as individual CSV files with a small stagger.
 *
 * @param {Array<{ name: string, data: Object[] }>} tables
 */
export async function exportMultipleToCSV(tables) {
  for (let i = 0; i < tables.length; i++) {
    const { name, data } = tables[i];
    if (data && data.length > 0) {
      exportToCSV(data, `erp_${name}`);
      // Slight delay so browsers don't block multiple downloads
      await new Promise(r => setTimeout(r, 350));
    }
  }
}
