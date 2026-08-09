import {
  createEmptyDocumentBody,
  effectiveBreakRules,
  pageContentCapacity,
  paginateDocumentBody,
  type BlockNode,
} from '@vdb/document-schema';

describe('smart pagination (ADR 017)', () => {
  it('applies heading keepWithNext defaults', () => {
    const heading: BlockNode = {
      id: 'h1',
      type: 'text',
      props: { content: 'Title', headingLevel: 1 },
    };
    expect(effectiveBreakRules(heading).keepWithNext).toBe(true);
    expect(
      effectiveBreakRules({
        ...heading,
        breakRules: { keepWithNext: false },
      }).keepWithNext,
    ).toBe(false);
  });

  it('packs many text blocks across multiple pages', () => {
    const body = createEmptyDocumentBody('biz', 'doc');
    const capacity = pageContentCapacity(body.page);
    const blocks: BlockNode[] = Array.from({ length: 40 }, (_, i) => ({
      id: `t${i}`,
      type: 'text',
      props: {
        content: `Paragraph ${i} `.repeat(20),
      },
    }));
    body.pages[0]!.blocks = blocks;
    const out = paginateDocumentBody(body);
    expect(out.pages.length).toBeGreaterThan(1);
    const totalBlocks = out.pages.reduce((n, p) => n + p.blocks.length, 0);
    expect(totalBlocks).toBe(40);
    expect(capacity).toBeGreaterThan(40);
  });

  it('expands a 30-item repeater into multiple pages', () => {
    const body = createEmptyDocumentBody('biz', 'doc');
    body.pages[0]!.blocks = [
      {
        id: 'rep1',
        type: 'repeater',
        props: { source: 'projects', limit: 50, emptyMessage: '' },
        children: [
          {
            id: 'c1',
            type: 'text',
            props: {
              content: '{{item.title}} — detail line for card height '.repeat(8),
            },
          },
        ],
      },
    ];
    const items = Array.from({ length: 30 }, (_, i) => ({
      id: `p${i}`,
      values: { title: `Project ${i}` },
    }));
    const out = paginateDocumentBody(body, {
      repeaterItemsByBlockId: { rep1: items },
    });
    expect(out.pages.length).toBeGreaterThan(1);
    const titles = out.pages.flatMap((p) =>
      p.blocks.flatMap((b) =>
        (b.children ?? [])
          .filter((c) => c.type === 'text')
          .map((c) => String(c.props.content ?? '')),
      ),
    );
    expect(titles.some((t) => t.includes('Project 0'))).toBe(true);
    expect(titles.some((t) => t.includes('Project 29'))).toBe(true);
  });

  it('keeps heading with following paragraph via keepWithNext', () => {
    const body = createEmptyDocumentBody('biz', 'doc');
    // Force tiny capacity by using landscape A4 with huge margins via hack:
    // pack with tall blocks so only one unit fits, then verify keepWithNext groups.
    body.pages[0]!.blocks = [
      {
        id: 'h',
        type: 'text',
        props: { content: 'Heading', headingLevel: 1 },
        breakRules: { keepWithNext: true },
      },
      {
        id: 'p',
        type: 'text',
        props: { content: 'Body '.repeat(30) },
      },
      {
        id: 'x',
        type: 'text',
        props: { content: 'Filler '.repeat(80) },
      },
    ];
    const out = paginateDocumentBody(body);
    const firstPageIds = out.pages[0]!.blocks.map((b) => b.id);
    // Heading and body should share a page when keepWithNext applies
    if (firstPageIds.includes('h')) {
      expect(firstPageIds).toContain('p');
    } else {
      const pageWithH = out.pages.find((p) =>
        p.blocks.some((b) => b.id === 'h'),
      );
      expect(pageWithH?.blocks.map((b) => b.id)).toEqual(
        expect.arrayContaining(['h', 'p']),
      );
    }
  });

  it('honors breakBefore', () => {
    const body = createEmptyDocumentBody('biz', 'doc');
    body.pages[0]!.blocks = [
      { id: 'a', type: 'text', props: { content: 'A' } },
      {
        id: 'b',
        type: 'text',
        props: { content: 'B' },
        breakRules: { breakBefore: true },
      },
    ];
    const out = paginateDocumentBody(body);
    expect(out.pages.length).toBeGreaterThanOrEqual(2);
    expect(out.pages[0]!.blocks.map((b) => b.id)).toEqual(['a']);
    expect(out.pages[1]!.blocks.map((b) => b.id)).toEqual(['b']);
  });

  it('skips packer when autoPaginate is false', () => {
    const body = createEmptyDocumentBody('biz', 'doc');
    body.page = { ...body.page, autoPaginate: false };
    body.pages[0]!.blocks = Array.from({ length: 40 }, (_, i) => ({
      id: `t${i}`,
      type: 'text' as const,
      props: { content: `x`.repeat(200) },
    }));
    const out = paginateDocumentBody(body);
    expect(out.pages).toHaveLength(1);
    expect(out.pages[0]!.blocks).toHaveLength(40);
  });
});
