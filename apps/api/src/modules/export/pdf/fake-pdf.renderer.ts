import { Injectable } from '@nestjs/common';
import type { PdfRenderInput, PdfRenderer } from './pdf-renderer.port';

/**
 * Minimal valid PDF for CI / environments without Chromium.
 * Still exercises queue → storage → download; not a visual QA substitute.
 */
@Injectable()
export class FakePdfRenderer implements PdfRenderer {
  readonly driver = 'fake' as const;

  async render(input: PdfRenderInput): Promise<Buffer> {
    const title = 'VDB Fake PDF';
    const note = `format=${input.format}; landscape=${input.landscape}; htmlBytes=${Buffer.byteLength(input.html, 'utf8')}`;
    // Minimal PDF 1.4 with one page and text stream (Latin only — fake path).
    const content = `BT /F1 12 Tf 50 750 Td (${title}) Tj 0 -20 Td (${note.replace(/[()\\]/g, '')}) Tj ET`;
    const objects = [
      '1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n',
      '2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n',
      '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj\n',
      `4 0 obj<< /Length ${content.length} >>stream\n${content}\nendstream\nendobj\n`,
      '5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n',
    ];
    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [0];
    for (const obj of objects) {
      offsets.push(Buffer.byteLength(pdf, 'utf8'));
      pdf += obj;
    }
    const xrefStart = Buffer.byteLength(pdf, 'utf8');
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (let i = 1; i <= objects.length; i++) {
      pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
    return Buffer.from(pdf, 'utf8');
  }
}
