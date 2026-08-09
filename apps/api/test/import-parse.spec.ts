import { ImportErrorCodes } from '@vdb/shared-types';
import { DomainException } from '../src/common/errors/domain.exception';
import {
  detectImportFormat,
  parseImportBuffer,
} from '../src/modules/content/import-parse';

describe('import-parse', () => {
  it('detects csv and xlsx from filename', () => {
    expect(detectImportFormat('a.csv', '')).toBe('csv');
    expect(detectImportFormat('a.XLSX', '')).toBe('xlsx');
  });

  it('rejects unsupported formats', () => {
    expect(() => detectImportFormat('a.xls', '')).toThrow(DomainException);
    try {
      detectImportFormat('a.pdf', 'application/pdf');
    } catch (e) {
      expect(e).toBeInstanceOf(DomainException);
      expect((e as DomainException).code).toBe(ImportErrorCodes.InvalidFormat);
    }
  });

  it('parses CSV with headers and rows', async () => {
    const csv = Buffer.from(
      'title,description,status\nAlpha,Desc,draft\nBeta,,published\n',
      'utf8',
    );
    const sheet = await parseImportBuffer(csv, 'csv', 100);
    expect(sheet.headers).toEqual(['title', 'description', 'status']);
    expect(sheet.rows).toHaveLength(2);
    expect(sheet.rows[0]!.cells.title).toBe('Alpha');
    expect(sheet.rows[1]!.cells.status).toBe('published');
  });

  it('rejects empty CSV', async () => {
    await expect(
      parseImportBuffer(Buffer.from('title\n', 'utf8'), 'csv', 100),
    ).rejects.toMatchObject({ code: ImportErrorCodes.Empty });
  });

  it('rejects too many rows', async () => {
    const lines = ['title', ...Array.from({ length: 5 }, (_, i) => `r${i}`)];
    await expect(
      parseImportBuffer(Buffer.from(lines.join('\n'), 'utf8'), 'csv', 3),
    ).rejects.toMatchObject({ code: ImportErrorCodes.TooManyRows });
  });
});
