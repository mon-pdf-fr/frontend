import Papa from 'papaparse';
import { DetectedTable, KeyValuePair, ExtractedData } from './data-extraction';

export type ExportFormat = 'csv' | 'json' | 'txt';

export interface ExportOptions {
  format: ExportFormat;
  includeTables?: boolean;
  includeKeyValuePairs?: boolean;
  includeAllText?: boolean;
  fileName?: string;
}

/**
 * Export extracted data in the specified format
 */
export function exportData(data: ExtractedData, options: ExportOptions): void {
  const {
    format,
    includeTables = true,
    includeKeyValuePairs = true,
    includeAllText = true,
    fileName = 'extracted-data',
  } = options;

  switch (format) {
    case 'csv':
      exportAsCSV(data, { includeTables, includeKeyValuePairs }, fileName);
      break;
    case 'json':
      exportAsJSON(data, { includeTables, includeKeyValuePairs, includeAllText }, fileName);
      break;
    case 'txt':
      exportAsTXT(data, { includeTables, includeKeyValuePairs, includeAllText }, fileName);
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Export data as CSV
 */
function exportAsCSV(
  data: ExtractedData,
  options: { includeTables: boolean; includeKeyValuePairs: boolean },
  fileName: string
): void {
  const sheets: { name: string; data: any[] }[] = [];

  // Export tables
  if (options.includeTables && data.tables.length > 0) {
    for (const table of data.tables) {
      const tableData = tableToArray(table);
      sheets.push({
        name: `Table_Page${table.pageNumber}`,
        data: tableData,
      });
    }
  }

  // Export key-value pairs
  if (options.includeKeyValuePairs && data.keyValuePairs.length > 0) {
    const kvData = data.keyValuePairs.map((pair) => ({
      Key: pair.key,
      Value: pair.value,
      Page: pair.pageNumber,
      Confidence: Math.round(pair.confidence),
    }));
    sheets.push({
      name: 'KeyValuePairs',
      data: kvData,
    });
  }

  // If multiple sheets, create separate CSV files
  if (sheets.length > 1) {
    for (const sheet of sheets) {
      const csv = Papa.unparse(sheet.data);
      downloadFile(csv, `${fileName}_${sheet.name}.csv`, 'text/csv');
    }
  } else if (sheets.length === 1) {
    const csv = Papa.unparse(sheets[0].data);
    downloadFile(csv, `${fileName}.csv`, 'text/csv');
  } else {
    // No structured data, export all text as CSV
    const lines = data.allText.split('\n').map((line) => ({ Text: line }));
    const csv = Papa.unparse(lines);
    downloadFile(csv, `${fileName}.csv`, 'text/csv');
  }
}

/**
 * Export data as JSON
 */
function exportAsJSON(
  data: ExtractedData,
  options: {
    includeTables: boolean;
    includeKeyValuePairs: boolean;
    includeAllText: boolean;
  },
  fileName: string
): void {
  const exportData: any = {};

  if (options.includeTables && data.tables.length > 0) {
    exportData.tables = data.tables.map((table) => ({
      id: table.id,
      pageNumber: table.pageNumber,
      columnCount: table.columnCount,
      rowCount: table.rowCount,
      data: tableToArray(table),
    }));
  }

  if (options.includeKeyValuePairs && data.keyValuePairs.length > 0) {
    exportData.keyValuePairs = data.keyValuePairs.map((pair) => ({
      key: pair.key,
      value: pair.value,
      pageNumber: pair.pageNumber,
      confidence: Math.round(pair.confidence),
    }));
  }

  if (options.includeAllText) {
    exportData.allText = data.allText;
    exportData.pageTexts = Array.from(data.pageTexts.entries()).map(([page, text]) => ({
      page,
      text,
    }));
  }

  const json = JSON.stringify(exportData, null, 2);
  downloadFile(json, `${fileName}.json`, 'application/json');
}

/**
 * Export data as plain text
 */
function exportAsTXT(
  data: ExtractedData,
  options: {
    includeTables: boolean;
    includeKeyValuePairs: boolean;
    includeAllText: boolean;
  },
  fileName: string
): void {
  let content = '';

  // Add key-value pairs
  if (options.includeKeyValuePairs && data.keyValuePairs.length > 0) {
    content += '=== KEY-VALUE PAIRS ===\n\n';
    for (const pair of data.keyValuePairs) {
      content += `${pair.key}: ${pair.value}\n`;
      content += `  (Page ${pair.pageNumber}, Confidence: ${Math.round(pair.confidence)}%)\n\n`;
    }
    content += '\n';
  }

  // Add tables
  if (options.includeTables && data.tables.length > 0) {
    content += '=== TABLES ===\n\n';
    for (const table of data.tables) {
      content += `Table on Page ${table.pageNumber} (${table.rowCount} rows × ${table.columnCount} columns)\n`;
      content += formatTableAsText(table);
      content += '\n\n';
    }
  }

  // Add all text
  if (options.includeAllText) {
    content += '=== FULL TEXT ===\n\n';
    content += data.allText;
  }

  downloadFile(content, `${fileName}.txt`, 'text/plain');
}

/**
 * Convert table to 2D array
 */
function tableToArray(table: DetectedTable): string[][] {
  const array: string[][] = [];

  for (const row of table.rows) {
    const rowData: string[] = [];
    for (let col = 0; col < table.columnCount; col++) {
      const cell = row.cells.find((c) => c.colIndex === col);
      rowData.push(cell ? cell.text : '');
    }
    array.push(rowData);
  }

  return array;
}

/**
 * Format table as plain text with borders
 */
function formatTableAsText(table: DetectedTable): string {
  const data = tableToArray(table);
  if (data.length === 0) return '';

  // Calculate column widths
  const colWidths: number[] = [];
  for (let col = 0; col < table.columnCount; col++) {
    let maxWidth = 0;
    for (const row of data) {
      maxWidth = Math.max(maxWidth, (row[col] || '').length);
    }
    colWidths.push(Math.min(maxWidth, 50)); // Max 50 chars per column
  }

  // Create separator line
  const separator = '+' + colWidths.map((w) => '-'.repeat(w + 2)).join('+') + '+\n';

  let result = separator;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const cells = row.map((cell, col) => {
      const truncated = (cell || '').substring(0, colWidths[col]);
      return ' ' + truncated.padEnd(colWidths[col]) + ' ';
    });
    result += '|' + cells.join('|') + '|\n';

    // Add separator after header row (first row)
    if (i === 0) {
      result += separator;
    }
  }

  result += separator;

  return result;
}

/**
 * Export selected text/data
 */
export function exportSelectedData(
  selectedItems: {
    tables?: DetectedTable[];
    keyValuePairs?: KeyValuePair[];
    text?: string;
  },
  format: ExportFormat,
  fileName: string = 'selected-data'
): void {
  const data: ExtractedData = {
    tables: selectedItems.tables || [],
    keyValuePairs: selectedItems.keyValuePairs || [],
    allText: selectedItems.text || '',
    pageTexts: new Map(),
  };

  exportData(data, {
    format,
    includeTables: !!selectedItems.tables,
    includeKeyValuePairs: !!selectedItems.keyValuePairs,
    includeAllText: !!selectedItems.text,
    fileName,
  });
}

/**
 * Export table as CSV
 */
export function exportTableAsCSV(table: DetectedTable, fileName?: string): void {
  const data = tableToArray(table);
  const csv = Papa.unparse(data);
  const name = fileName || `table_page${table.pageNumber}`;
  downloadFile(csv, `${name}.csv`, 'text/csv');
}

/**
 * Export key-value pairs as JSON
 */
export function exportKeyValuePairsAsJSON(
  pairs: KeyValuePair[],
  fileName: string = 'key-value-pairs'
): void {
  const data = pairs.map((pair) => ({
    key: pair.key,
    value: pair.value,
    pageNumber: pair.pageNumber,
    confidence: Math.round(pair.confidence),
  }));

  const json = JSON.stringify(data, null, 2);
  downloadFile(json, `${fileName}.json`, 'application/json');
}

/**
 * Download file to user's computer
 */
function downloadFile(content: string, fileName: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Convert extracted data to clipboard format
 */
export async function copyToClipboard(
  data: ExtractedData,
  format: 'text' | 'json' = 'text'
): Promise<void> {
  let content: string;

  if (format === 'json') {
    content = JSON.stringify(
      {
        tables: data.tables,
        keyValuePairs: data.keyValuePairs,
        allText: data.allText,
      },
      null,
      2
    );
  } else {
    content = data.allText;
  }

  try {
    await navigator.clipboard.writeText(content);
  } catch (error) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = content;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
}
