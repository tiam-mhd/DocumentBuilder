import {
  createEmptyDocumentBody,
  DOCUMENT_SCHEMA_VERSION,
} from '@vdb/document-schema';
import { DEFAULT_DESIGN_THEME_TOKENS } from '@vdb/shared-types';
import { DocumentHtmlRenderer } from '../src/modules/export/document-html.renderer';
import { FakePdfRenderer } from '../src/modules/export/pdf/fake-pdf.renderer';

describe('PDF export pipeline (unit)', () => {
  it('builds RTL HTML with Persian sample and master chrome', () => {
    const renderer = new DocumentHtmlRenderer();
    const body = createEmptyDocumentBody('biz_1', 'doc_1', {
      title: 'پروفایل شرکت',
    });
    body.pages[0]!.blocks = [
      {
        id: 't1',
        type: 'text',
        props: { content: 'سلام دنیا — نمونه فارسی' },
      },
    ];
    const html = renderer.build({
      title: 'پروفایل شرکت',
      body,
      tokens: DEFAULT_DESIGN_THEME_TOKENS,
      fonts: [
        {
          family: 'Vazirmatn',
          weight: 400,
          style: 'normal',
          mimeType: 'font/ttf',
          base64: Buffer.from('fake-font').toString('base64'),
        },
      ],
      dir: 'rtl',
      lang: 'fa',
    });
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('lang="fa"');
    expect(html).toContain('سلام دنیا');
    expect(html).toContain('@font-face');
    expect(html).toContain('Vazirmatn');
    expect(html).toContain('header');
    expect(body.schemaVersion).toBe(DOCUMENT_SCHEMA_VERSION);
  });

  it('fake PDF renderer returns a PDF buffer', async () => {
    const pdf = new FakePdfRenderer();
    const buf = await pdf.render({
      html: '<html><body>test</body></html>',
      format: 'A4',
      landscape: false,
    });
    expect(buf.subarray(0, 5).toString('utf8')).toBe('%PDF-');
    expect(buf.byteLength).toBeGreaterThan(50);
  });
});
