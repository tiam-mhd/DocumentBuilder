import { parse } from 'csv-parse/sync';
import ExcelJS from 'exceljs';
import { HttpStatus } from '@nestjs/common';
import { ImportErrorCodes, ImportFileFormat } from '@vdb/shared-types';
import { DomainException } from '../../common/errors/domain.exception';

export type ParsedSheet = {
  headers: string[];
  /** 1-based data row number → cells by header. */
  rows: { rowNumber: number; cells: Record<string, string> }[];
};

function cellToString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object' && value !== null && 'text' in value) {
    return String((value as { text: unknown }).text ?? '').trim();
  }
  if (typeof value === 'object' && value !== null && 'result' in value) {
    return cellToString((value as { result: unknown }).result);
  }
  return String(value).trim();
}

export async function parseImportBuffer(
  buffer: Buffer,
  format: 'csv' | 'xlsx',
  maxRows: number,
): Promise<ParsedSheet> {
  try {
    if (format === ImportFileFormat.Csv) {
      return parseCsv(buffer, maxRows);
    }
    return await parseXlsx(buffer, maxRows);
  } catch (err) {
    if (err instanceof DomainException) throw err;
    throw new DomainException(
      ImportErrorCodes.ParseFailed,
      err instanceof Error ? err.message : 'Failed to parse import file',
      HttpStatus.BAD_REQUEST,
    );
  }
}

function parseCsv(buffer: Buffer, maxRows: number): ParsedSheet {
  const records = parse(buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    bom: true,
  }) as Record<string, unknown>[];

  if (records.length === 0) {
    throw new DomainException(
      ImportErrorCodes.Empty,
      'Import file has no data rows',
      HttpStatus.BAD_REQUEST,
    );
  }
  if (records.length > maxRows) {
    throw new DomainException(
      ImportErrorCodes.TooManyRows,
      `Import exceeds max rows (${maxRows})`,
      HttpStatus.BAD_REQUEST,
    );
  }

  const headers = Object.keys(records[0] ?? {}).map((h) => h.trim()).filter(Boolean);
  if (headers.length === 0) {
    throw new DomainException(
      ImportErrorCodes.Empty,
      'Import file has no columns',
      HttpStatus.BAD_REQUEST,
    );
  }

  const rows = records.map((rec, i) => {
    const cells: Record<string, string> = {};
    for (const h of headers) {
      cells[h] = cellToString(rec[h]);
    }
    return { rowNumber: i + 2, cells }; // header is row 1
  });

  return { headers, rows };
}

async function parseXlsx(buffer: Buffer, maxRows: number): Promise<ParsedSheet> {
  const workbook = new ExcelJS.Workbook();
  // exceljs typings accept Buffer-like
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new DomainException(
      ImportErrorCodes.Empty,
      'Workbook has no worksheets',
      HttpStatus.BAD_REQUEST,
    );
  }

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const name = cellToString(cell.value);
    if (name) headers[colNumber - 1] = name;
  });
  const compactHeaders = headers.filter(Boolean);
  if (compactHeaders.length === 0) {
    throw new DomainException(
      ImportErrorCodes.Empty,
      'Import file has no columns',
      HttpStatus.BAD_REQUEST,
    );
  }

  const rows: ParsedSheet['rows'] = [];
  const lastRow = sheet.rowCount;
  for (let r = 2; r <= lastRow; r++) {
    const row = sheet.getRow(r);
    const cells: Record<string, string> = {};
    let any = false;
    for (let c = 0; c < headers.length; c++) {
      const h = headers[c];
      if (!h) continue;
      const v = cellToString(row.getCell(c + 1).value);
      cells[h] = v;
      if (v) any = true;
    }
    if (!any) continue;
    rows.push({ rowNumber: r, cells });
    if (rows.length > maxRows) {
      throw new DomainException(
        ImportErrorCodes.TooManyRows,
        `Import exceeds max rows (${maxRows})`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  if (rows.length === 0) {
    throw new DomainException(
      ImportErrorCodes.Empty,
      'Import file has no data rows',
      HttpStatus.BAD_REQUEST,
    );
  }

  return { headers: compactHeaders, rows };
}

export function detectImportFormat(
  filename: string,
  mimeType: string,
): 'csv' | 'xlsx' {
  const lower = filename.toLowerCase();
  const mime = (mimeType || '').toLowerCase();
  if (lower.endsWith('.csv') || mime.includes('csv') || mime === 'text/plain') {
    return ImportFileFormat.Csv;
  }
  if (
    lower.endsWith('.xlsx') ||
    mime.includes('spreadsheetml') ||
    mime.includes('excel')
  ) {
    return ImportFileFormat.Xlsx;
  }
  throw new DomainException(
    ImportErrorCodes.InvalidFormat,
    'Only .csv and .xlsx are supported',
    HttpStatus.BAD_REQUEST,
  );
}
