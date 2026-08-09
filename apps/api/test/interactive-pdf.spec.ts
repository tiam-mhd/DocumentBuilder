import {
  blockAnchorId,
  createEmptyDocumentBody,
  resolveBlockLinkHref,
  type BlockLink,
} from '@vdb/document-schema';
import { DEFAULT_DESIGN_THEME_TOKENS } from '@vdb/shared-types';
import { DocumentHtmlRenderer } from '../src/modules/export/document-html.renderer';
import { FakePdfRenderer } from '../src/modules/export/pdf/fake-pdf.renderer';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('interactive PDF links (ADR 018)', () => {
  it('resolves whitelist href schemes and rejects unsafe targets', () => {
    expect(
      resolveBlockLinkHref({ kind: 'external', target: 'example.com/a' }),
    ).toBe('https://example.com/a');
    expect(
      resolveBlockLinkHref({
        kind: 'external',
        target: 'https://example.com/x',
      }),
    ).toBe('https://example.com/x');
    expect(
      resolveBlockLinkHref({ kind: 'external', target: 'javascript:alert(1)' }),
    ).toBeNull();
    expect(
      resolveBlockLinkHref({ kind: 'email', target: 'a@b.co' }),
    ).toBe('mailto:a@b.co');
    expect(
      resolveBlockLinkHref({ kind: 'phone', target: '+98 912 000 0000' }),
    ).toBe('tel:+989120000000');
    expect(
      resolveBlockLinkHref({ kind: 'internal', target: 'sec_abc' }),
    ).toBe('#h-sec_abc');
    expect(
      resolveBlockLinkHref({ kind: 'internal', target: '../etc' }),
    ).toBeNull();
    expect(blockAnchorId('abc')).toBe('h-abc');
  });

  it('emits clickable anchors for block links and TOC entries', () => {
    const config = { get: jest.fn().mockReturnValue('none') };
    const renderer = new DocumentHtmlRenderer(config as never);
    const body = createEmptyDocumentBody('biz', 'doc', { title: 'Linked' });
    const link: BlockLink = {
      kind: 'external',
      target: 'https://example.com/docs',
    };
    body.pages[0]!.blocks = [
      {
        id: 's1',
        type: 'section',
        props: { title: 'About', headingLevel: 1 },
        children: [],
      },
      {
        id: 't1',
        type: 'text',
        props: { content: 'Visit site' },
        link,
      },
      {
        id: 'toc1',
        type: 'toc',
        props: { title: 'Contents', maxLevel: 2, showPageNumbers: true },
      },
      {
        id: 't2',
        type: 'text',
        props: { content: 'Call us' },
        link: { kind: 'phone', target: '+989121234567' },
      },
      {
        id: 't3',
        type: 'text',
        props: { content: 'Jump' },
        link: { kind: 'internal', target: 's1' },
      },
    ];
    const html = renderer.build({
      title: 'Linked',
      body,
      tokens: DEFAULT_DESIGN_THEME_TOKENS,
      fonts: [],
      dir: 'ltr',
      lang: 'en',
    });
    expect(html).toContain('href="https://example.com/docs"');
    expect(html).toContain('Visit site');
    expect(html).toContain('href="tel:+989121234567"');
    expect(html).toContain('href="#h-s1"');
    expect(html).toContain('id="h-s1"');
    expect(html).toContain('class="toc"');
    expect(html).toMatch(/toc-item[\s\S]*href="#h-s1"/);
  });

  it('Playwright renderer source requests outline+tagged (ADR 018)', () => {
    const src = readFileSync(
      join(__dirname, '../src/modules/export/pdf/playwright-pdf.renderer.ts'),
      'utf8',
    );
    expect(src).toContain('outline:');
    expect(src).toContain('tagged:');
  });

  it('fake PDF renderer accepts outline flag without throwing', async () => {
    const pdf = new FakePdfRenderer();
    const buf = await pdf.render({
      html: '<html><body><h1 id="h-a">A</h1><a href="https://x.test">x</a></body></html>',
      format: 'A4',
      landscape: false,
      outline: true,
    });
    expect(buf.subarray(0, 5).toString('utf8')).toBe('%PDF-');
  });
});
