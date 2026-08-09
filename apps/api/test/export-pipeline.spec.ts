import {
  createEmptyDocumentBody,
  DOCUMENT_SCHEMA_VERSION,
} from '@vdb/document-schema';
import { DEFAULT_DESIGN_THEME_TOKENS } from '@vdb/shared-types';
import { DocumentHtmlRenderer } from '../src/modules/export/document-html.renderer';
import { FakePdfRenderer } from '../src/modules/export/pdf/fake-pdf.renderer';

describe('PDF export pipeline (unit)', () => {
  it('builds RTL HTML with Persian sample and master chrome', () => {
    const config = {
      get: jest.fn().mockReturnValue('none'),
    };
    const renderer = new DocumentHtmlRenderer(config as never);
    const body = createEmptyDocumentBody('biz_1', 'doc_1', {
      title: 'پروفایل شرکت',
    });
    body.pages[0]!.blocks = [
      {
        id: 't1',
        type: 'text',
        props: { content: 'سلام دنیا — نمونه فارسی' },
      },
      {
        id: 'm1',
        type: 'map',
        props: { centerLat: 35.7, centerLng: 51.4, zoom: 10 },
      },
      {
        id: 'oc1',
        type: 'orgChart',
        props: { layout: 'tree-vertical' },
      },
      {
        id: 'tl1',
        type: 'timeline',
        props: { layout: 'vertical', limit: 10 },
      },
      {
        id: 'qr1',
        type: 'qr',
        props: { targetType: 'url', value: 'https://example.com', sizePx: 96 },
      },
      {
        id: 'toc1',
        type: 'toc',
        props: { title: 'فهرست', maxLevel: 2, showPageNumbers: true },
      },
      {
        id: 'rep1',
        type: 'repeater',
        props: { source: 'projects', limit: 10, emptyMessage: 'خالی' },
        children: [
          {
            id: 'rep-t1',
            type: 'text',
            props: { content: '{{item.title}}' },
          },
        ],
      },
      {
        id: 's1',
        type: 'section',
        props: { title: 'درباره ما', headingLevel: 1 },
        children: [],
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
      binding: {
        business: { name: 'شرکت نمونه' },
        collections: {
          projects: {
            total: 2,
            items: [
              { values: { title: 'پروژه آلفا' } },
              { values: { title: 'پروژه بتا' } },
            ],
          },
        },
      },
      mapMarkersByBlockId: {
        m1: [{ lat: 35.7, lng: 51.4, name: 'تهران' }],
      },
      orgChartByBlockId: {
        oc1: {
          layout: 'tree-vertical',
          showPhotos: false,
          heightPx: 360,
          roots: [
            {
              id: 'ceo',
              name: 'مدیرعامل',
              roleTitle: 'CEO',
              department: '',
              photoMediaId: null,
              parentMemberId: null,
              sortOrder: 0,
              children: [],
            },
          ],
        },
      },
      timelineByBlockId: {
        tl1: {
          layout: 'vertical',
          heightPx: 420,
          items: [
            {
              id: 'e1',
              businessId: 'biz_1',
              occurredAt: '2020-03-15T00:00:00.000Z',
              title: 'تأسیس',
              body: 'شروع',
              translations: {},
              mediaId: null,
              sortOrder: 0,
              fields: {},
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        },
      },
      qrByBlockId: {
        qr1: {
          dataUrl: 'data:image/png;base64,AAAA',
          sizePx: 96,
          caption: 'وب‌سایت',
          payload: 'https://example.com',
        },
      },
      repeaterItemsByBlockId: {
        rep1: [
          { id: 'p1', values: { title: 'پروژه آلفا' } },
          { id: 'p2', values: { title: 'پروژه بتا' } },
        ],
      },
      visibility: {
        collection: { projects: 2, certificates: 0 },
      },
    });
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('lang="fa"');
    expect(html).toContain('شرکت نمونه');
    expect(html).toContain('سلام دنیا');
    expect(html).toContain('@font-face');
    expect(html).toContain('Vazirmatn');
    expect(html).toContain('map-ph');
    expect(html).toContain('org-chart');
    expect(html).toContain('مدیرعامل');
    expect(html).toContain('timeline');
    expect(html).toContain('تأسیس');
    expect(html).toContain('qr-wrap');
    expect(html).toContain('class="toc"');
    expect(html).toContain('repeater');
    expect(html).toContain('پروژه آلفا');
    expect(html).toContain('پروژه بتا');
    expect(html).toContain('درباره ما');
    expect(body.schemaVersion).toBe(DOCUMENT_SCHEMA_VERSION);
  });

  it('builds LTR HTML for English document locale with EN repeater titles', () => {
    const config = {
      get: jest.fn().mockReturnValue('none'),
    };
    const renderer = new DocumentHtmlRenderer(config as never);
    const body = createEmptyDocumentBody('biz_1', 'doc_en', {
      title: 'Company profile',
    });
    body.locale = 'en';
    body.pages[0]!.blocks = [
      {
        id: 't1',
        type: 'text',
        props: {
          content:
            '{{business.name}} · {{count(projects)}} · Hello world — English sample',
        },
      },
      {
        id: 'rep1',
        type: 'repeater',
        props: { source: 'projects', limit: 10, emptyMessage: 'Empty' },
        children: [
          {
            id: 'rep-t1',
            type: 'text',
            props: { content: '{{item.title}}' },
          },
        ],
      },
    ];
    const html = renderer.build({
      title: 'Company profile',
      body,
      tokens: DEFAULT_DESIGN_THEME_TOKENS,
      fonts: [],
      dir: 'ltr',
      lang: 'en',
      binding: {
        business: { name: 'Acme' },
        collections: {
          projects: {
            total: 2,
            items: [
              { values: { title: 'Alpha Project' } },
              { values: { title: 'Beta Project' } },
            ],
          },
        },
      },
      repeaterItemsByBlockId: {
        rep1: [
          { id: 'p1', values: { title: 'Alpha Project' } },
          { id: 'p2', values: { title: 'Beta Project' } },
        ],
      },
      visibility: { collection: { projects: 2 } },
    });
    expect(html).toContain('dir="ltr"');
    expect(html).toContain('lang="en"');
    expect(html).toContain('Acme');
    expect(html).toContain('Acme · 2 · Hello world');
    expect(html).toContain('Alpha Project');
    expect(html).toContain('Beta Project');
    expect(body.locale).toBe('en');
  });

  it('hides certificates section when collection is empty', () => {
    const config = {
      get: jest.fn().mockReturnValue('none'),
    };
    const renderer = new DocumentHtmlRenderer(config as never);
    const body = createEmptyDocumentBody('biz_1', 'doc_1', {
      title: 'Profile',
    });
    body.pages[0]!.blocks = [
      {
        id: 's-cert',
        type: 'section',
        props: { title: 'گواهینامه‌ها خالی' },
        when: { op: 'exists', path: 'collection.certificates' },
        children: [
          {
            id: 't-cert',
            type: 'text',
            props: { content: 'should not render' },
          },
        ],
      },
      {
        id: 's-ok',
        type: 'section',
        props: { title: 'درباره ما' },
        children: [],
      },
    ];
    const html = renderer.build({
      title: 'Profile',
      body,
      tokens: DEFAULT_DESIGN_THEME_TOKENS,
      fonts: [],
      dir: 'rtl',
      lang: 'fa',
      visibility: { collection: { certificates: 0 } },
    });
    expect(html).toContain('درباره ما');
    expect(html).not.toContain('گواهینامه‌ها خالی');
    expect(html).not.toContain('should not render');
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
