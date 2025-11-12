import { OCRLine, OCRWord, OCRPageResult } from './ocr-engine';

export interface TableCell {
  text: string;
  rowIndex: number;
  colIndex: number;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
  confidence: number;
}

export interface TableRow {
  cells: TableCell[];
  rowIndex: number;
}

export interface DetectedTable {
  id: string;
  pageNumber: number;
  rows: TableRow[];
  columnCount: number;
  rowCount: number;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
}

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  pageNumber: number;
  confidence: number;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
}

export interface ExtractedData {
  tables: DetectedTable[];
  keyValuePairs: KeyValuePair[];
  allText: string;
  pageTexts: Map<number, string>;
}

/**
 * Detect tables in OCR results using spatial analysis
 * @param ocrResults - OCR results from all pages
 * @returns Detected tables
 */
export function detectTables(ocrResults: OCRPageResult[]): DetectedTable[] {
  const tables: DetectedTable[] = [];
  let tableId = 0;

  for (const pageResult of ocrResults) {
    const lines = pageResult.lines;
    if (lines.length < 2) continue;

    // Group lines by vertical position (rows)
    const rowGroups = groupLinesByVerticalPosition(lines);

    // Find potential table regions
    const tableRegions = findTableRegions(rowGroups);

    for (const region of tableRegions) {
      const table = constructTableFromRegion(region, pageResult.pageNumber, tableId++);
      if (table) {
        tables.push(table);
      }
    }
  }

  return tables;
}

/**
 * Group lines by vertical position to identify rows
 */
function groupLinesByVerticalPosition(lines: OCRLine[], threshold: number = 15): OCRLine[][] {
  const sortedLines = [...lines].sort((a, b) => a.bbox.y0 - b.bbox.y0);
  const groups: OCRLine[][] = [];
  let currentGroup: OCRLine[] = [];

  for (const line of sortedLines) {
    if (currentGroup.length === 0) {
      currentGroup.push(line);
    } else {
      const lastLine = currentGroup[currentGroup.length - 1];
      const verticalDistance = Math.abs(line.bbox.y0 - lastLine.bbox.y0);

      if (verticalDistance < threshold) {
        currentGroup.push(line);
      } else {
        groups.push(currentGroup);
        currentGroup = [line];
      }
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

/**
 * Find regions that likely contain tables
 */
function findTableRegions(rowGroups: OCRLine[][]): OCRLine[][] {
  const tableRegions: OCRLine[][] = [];
  let currentRegion: OCRLine[] = [];

  for (const group of rowGroups) {
    // Check if this row has multiple "columns" (words with similar spacing)
    const hasMultipleColumns = group.length > 1 ||
      (group[0] && group[0].words.length > 2);

    if (hasMultipleColumns) {
      currentRegion.push(...group);
    } else {
      if (currentRegion.length >= 3) { // At least 3 rows for a table
        tableRegions.push(currentRegion);
      }
      currentRegion = [];
    }
  }

  if (currentRegion.length >= 3) {
    tableRegions.push(currentRegion);
  }

  return tableRegions;
}

/**
 * Construct a table structure from a region of lines
 */
function constructTableFromRegion(
  lines: OCRLine[],
  pageNumber: number,
  tableId: number
): DetectedTable | null {
  if (lines.length < 2) return null;

  // Analyze column positions across all lines
  const columnPositions = detectColumnPositions(lines);

  if (columnPositions.length < 2) return null;

  const rows: TableRow[] = [];
  const rowGroups = groupLinesByVerticalPosition(lines);

  for (let rowIndex = 0; rowIndex < rowGroups.length; rowIndex++) {
    const rowLines = rowGroups[rowIndex];
    const cells: TableCell[] = [];

    // Extract words and assign to columns
    const allWords: OCRWord[] = [];
    for (const line of rowLines) {
      allWords.push(...line.words);
    }

    // Sort words by horizontal position
    allWords.sort((a, b) => a.bbox.x0 - b.bbox.x0);

    // Assign words to columns
    for (let colIndex = 0; colIndex < columnPositions.length; colIndex++) {
      const colStart = columnPositions[colIndex];
      const colEnd = columnPositions[colIndex + 1] || Infinity;

      const wordsInColumn = allWords.filter(
        (word) => word.bbox.x0 >= colStart - 20 && word.bbox.x0 < colEnd - 20
      );

      if (wordsInColumn.length > 0) {
        const text = wordsInColumn.map((w) => w.text).join(' ');
        const avgConfidence = wordsInColumn.reduce((sum, w) => sum + w.confidence, 0) / wordsInColumn.length;
        const bbox = {
          x0: Math.min(...wordsInColumn.map((w) => w.bbox.x0)),
          y0: Math.min(...wordsInColumn.map((w) => w.bbox.y0)),
          x1: Math.max(...wordsInColumn.map((w) => w.bbox.x1)),
          y1: Math.max(...wordsInColumn.map((w) => w.bbox.y1)),
        };

        cells.push({
          text,
          rowIndex,
          colIndex,
          bbox,
          confidence: avgConfidence,
        });
      } else {
        // Empty cell
        cells.push({
          text: '',
          rowIndex,
          colIndex,
          bbox: { x0: colStart, y0: 0, x1: colEnd, y1: 0 },
          confidence: 0,
        });
      }
    }

    rows.push({ cells, rowIndex });
  }

  // Calculate table bounding box
  const allBboxes = lines.map((l) => l.bbox);
  const tableBbox = {
    x0: Math.min(...allBboxes.map((b) => b.x0)),
    y0: Math.min(...allBboxes.map((b) => b.y0)),
    x1: Math.max(...allBboxes.map((b) => b.x1)),
    y1: Math.max(...allBboxes.map((b) => b.y1)),
  };

  return {
    id: `table-${tableId}`,
    pageNumber,
    rows,
    columnCount: columnPositions.length,
    rowCount: rows.length,
    bbox: tableBbox,
  };
}

/**
 * Detect column positions by analyzing word positions across lines
 */
function detectColumnPositions(lines: OCRLine[]): number[] {
  const positions: number[] = [];

  for (const line of lines) {
    for (const word of line.words) {
      positions.push(word.bbox.x0);
    }
  }

  // Cluster positions to find column boundaries
  positions.sort((a, b) => a - b);

  const clusters: number[] = [];
  let currentCluster = [positions[0]];

  for (let i = 1; i < positions.length; i++) {
    if (positions[i] - currentCluster[currentCluster.length - 1] < 30) {
      currentCluster.push(positions[i]);
    } else {
      // Calculate average of cluster
      const avg = currentCluster.reduce((a, b) => a + b, 0) / currentCluster.length;
      clusters.push(avg);
      currentCluster = [positions[i]];
    }
  }

  if (currentCluster.length > 0) {
    const avg = currentCluster.reduce((a, b) => a + b, 0) / currentCluster.length;
    clusters.push(avg);
  }

  return clusters;
}

/**
 * Detect key-value pairs in the text (e.g., "Name: John", "Date: 2024-01-01")
 */
export function detectKeyValuePairs(ocrResults: OCRPageResult[]): KeyValuePair[] {
  const pairs: KeyValuePair[] = [];
  let pairId = 0;

  const keyValuePatterns = [
    /^([A-Za-z\s]+):\s*(.+)$/,           // "Key: Value"
    /^([A-Za-z\s]+)\s*[-–]\s*(.+)$/,     // "Key - Value"
    /^([A-Za-z\s]+)\s*[=]\s*(.+)$/,      // "Key = Value"
  ];

  for (const pageResult of ocrResults) {
    for (const line of pageResult.lines) {
      const text = line.text.trim();

      for (const pattern of keyValuePatterns) {
        const match = text.match(pattern);
        if (match) {
          const [, key, value] = match;
          pairs.push({
            id: `kv-${pairId++}`,
            key: key.trim(),
            value: value.trim(),
            pageNumber: pageResult.pageNumber,
            confidence: line.confidence,
            bbox: line.bbox,
          });
          break;
        }
      }
    }
  }

  return pairs;
}

/**
 * Extract all data from OCR results
 */
export function extractAllData(ocrResults: OCRPageResult[]): ExtractedData {
  const tables = detectTables(ocrResults);
  const keyValuePairs = detectKeyValuePairs(ocrResults);
  const allText = ocrResults.map((r) => r.text).join('\n\n');
  const pageTexts = new Map<number, string>();

  for (const result of ocrResults) {
    pageTexts.set(result.pageNumber, result.text);
  }

  return {
    tables,
    keyValuePairs,
    allText,
    pageTexts,
  };
}

/**
 * Filter extracted data by confidence threshold
 */
export function filterByConfidence(
  data: ExtractedData,
  minConfidence: number
): ExtractedData {
  return {
    tables: data.tables.map((table) => ({
      ...table,
      rows: table.rows.map((row) => ({
        ...row,
        cells: row.cells.filter((cell) => cell.confidence >= minConfidence),
      })),
    })),
    keyValuePairs: data.keyValuePairs.filter((pair) => pair.confidence >= minConfidence),
    allText: data.allText,
    pageTexts: data.pageTexts,
  };
}
