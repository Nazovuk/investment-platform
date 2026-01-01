/**
 * Export utilities for downloading data as CSV or JSON
 */

export interface ExportColumn {
    key: string;
    label: string;
    formatter?: (value: unknown) => string;
}

/**
 * Export data to CSV and trigger download
 */
export function exportToCSV(
    data: Record<string, unknown>[],
    columns: ExportColumn[],
    filename: string
): void {
    if (!data || data.length === 0) {
        alert('No data to export');
        return;
    }

    // Build CSV header
    const headers = columns.map(col => `"${col.label}"`).join(',');

    // Build CSV rows
    const rows = data.map(row => {
        return columns.map(col => {
            const value = row[col.key];
            const formatted = col.formatter ? col.formatter(value) : String(value ?? '');
            // Escape quotes and wrap in quotes
            return `"${formatted.replace(/"/g, '""')}"`;
        }).join(',');
    });

    // Combine header and rows
    const csv = [headers, ...rows].join('\n');

    // Create blob and trigger download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Export data to JSON and trigger download
 */
export function exportToJSON(
    data: Record<string, unknown>[],
    filename: string
): void {
    if (!data || data.length === 0) {
        alert('No data to export');
        return;
    }

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Copy data to clipboard as tab-separated values (for pasting into Excel/Google Sheets)
 */
export async function copyToClipboard(
    data: Record<string, unknown>[],
    columns: ExportColumn[]
): Promise<boolean> {
    if (!data || data.length === 0) {
        alert('No data to copy');
        return false;
    }

    // Build TSV header
    const headers = columns.map(col => col.label).join('\t');

    // Build TSV rows
    const rows = data.map(row => {
        return columns.map(col => {
            const value = row[col.key];
            return col.formatter ? col.formatter(value) : String(value ?? '');
        }).join('\t');
    });

    const tsv = [headers, ...rows].join('\n');

    try {
        await navigator.clipboard.writeText(tsv);
        return true;
    } catch {
        alert('Failed to copy to clipboard');
        return false;
    }
}

/**
 * Format number as currency for export
 */
export function formatCurrency(value: unknown): string {
    if (value === null || value === undefined) return '';
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    if (isNaN(num)) return '';
    return num.toFixed(2);
}

/**
 * Format number as percentage for export
 */
export function formatPercent(value: unknown): string {
    if (value === null || value === undefined) return '';
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    if (isNaN(num)) return '';
    return (num * 100).toFixed(2) + '%';
}

/**
 * Format large numbers with suffix (K, M, B)
 */
export function formatLargeNumber(value: unknown): string {
    if (value === null || value === undefined) return '';
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    if (isNaN(num)) return '';

    const absNum = Math.abs(num);
    const sign = num < 0 ? '-' : '';

    if (absNum >= 1e12) return sign + (absNum / 1e12).toFixed(2) + 'T';
    if (absNum >= 1e9) return sign + (absNum / 1e9).toFixed(2) + 'B';
    if (absNum >= 1e6) return sign + (absNum / 1e6).toFixed(2) + 'M';
    if (absNum >= 1e3) return sign + (absNum / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
}
