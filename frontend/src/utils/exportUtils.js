/**
 * Exports data to a CSV file that is fully compatible with Excel (UTF-8 with BOM).
 * @param {Array} data - Array of objects to export
 * @param {Array} headers - Array of header names [ ["Key", "Display Name"], ... ]
 * @param {string} fileName - Name of the file to save
 */
export const exportToCSV = (data, headers, fileName) => {
  if (!data || !data.length) return;

  const headerRow = headers.map(h => h[1]).join(',');
  const rows = data.map(item => {
    return headers.map(h => {
      const value = item[h[0]] ?? '';
      // Escape quotes and wrap in quotes if contains comma
      const escaped = String(value).replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(',');
  });

  const csvContent = [headerRow, ...rows].join('\n');
  
  // Create a blob with UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
