import Papa from 'papaparse';
import type { CsvRow, FailedRow } from '@/types';

export interface ParseCsvResult {
  rows: CsvRow[];
  skipped: number;
}

/**
 * Parses a two-column CSV (filename, voice-over text) into CsvRow[].
 * - Ignores blank rows.
 * - Trims whitespace from both columns.
 * - Works whether or not the file has a header row.
 */
export function parseCsv(fileContents: string): ParseCsvResult {
  const result = Papa.parse<string[]>(fileContents, {
    skipEmptyLines: true
  });

  if (result.errors && result.errors.length > 0) {
    const fatal = result.errors.find((e) => e.type === 'Quotes' || e.row === undefined);
    if (fatal) {
      throw new Error(`Could not parse CSV: ${fatal.message}`);
    }
  }

  const rawRows = result.data ?? [];
  if (rawRows.length === 0) {
    throw new Error('The CSV file is empty.');
  }

  let startIndex = 0;
  const first = rawRows[0];
  if (first && looksLikeHeader(first)) {
    startIndex = 1;
  }

  const rows: CsvRow[] = [];
  let skipped = 0;

  for (let i = startIndex; i < rawRows.length; i++) {
    const raw = rawRows[i];
    if (!raw) continue;
    const filename = (raw[0] ?? '').toString().trim();
    const text = (raw[1] ?? '').toString().trim();

    if (!filename && !text) {
      skipped++;
      continue;
    }
    if (!filename || !text) {
      skipped++;
      continue;
    }
    rows.push({ filename: sanitizeFilename(filename), text });
  }

  if (rows.length === 0) {
    throw new Error('No valid rows found. Each row needs a filename (column A) and voice-over text (column B).');
  }

  return { rows, skipped };
}

function looksLikeHeader(row: string[]): boolean {
  const a = (row[0] ?? '').toString().trim().toLowerCase();
  const b = (row[1] ?? '').toString().trim().toLowerCase();
  const headerHints = ['filename', 'file', 'name', 'text', 'voice over', 'voiceover', 'script', 'line'];
  return headerHints.includes(a) || headerHints.includes(b);
}

function sanitizeFilename(name: string): string {
  // Strip characters that are unsafe inside a zip entry / filesystem path.
  const cleaned = name.replace(/[\\/:*?"<>|]/g, '-').trim();
  return cleaned.length > 0 ? cleaned : 'untitled';
}

export function buildFailedCsv(failedRows: FailedRow[]): string {
  return Papa.unparse({
    fields: ['Filename', 'Text', 'Reason'],
    data: failedRows.map((f) => [f.filename, f.text, f.reason])
  });
}
