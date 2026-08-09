import {
  buildTableOfContents,
  createEmptyDocumentBody,
} from '@vdb/document-schema';

describe('buildTableOfContents', () => {
  it('collects section and heading text across pages', () => {
    const body = createEmptyDocumentBody('biz_1', 'doc_1', { title: 'T' });
    body.pages = [
      {
        id: 'p1',
        masterId: body.masters[0]!.id,
        blocks: [
          { id: 'toc1', type: 'toc', props: { maxLevel: 3 } },
          {
            id: 's1',
            type: 'section',
            props: { title: 'مقدمه', headingLevel: 1 },
            children: [
              {
                id: 't2',
                type: 'text',
                props: { content: 'جزئیات', headingLevel: 2 },
              },
            ],
          },
        ],
      },
      {
        id: 'p2',
        masterId: body.masters[0]!.id,
        blocks: [
          {
            id: 't3',
            type: 'text',
            props: { content: 'نتیجه', headingLevel: 1 },
          },
          {
            id: 'plain',
            type: 'text',
            props: { content: 'not a heading' },
          },
        ],
      },
    ];

    const entries = buildTableOfContents(body, {
      maxLevel: 3,
      showPageNumbers: true,
    });
    expect(entries.map((e) => [e.title, e.level, e.pageNumber])).toEqual([
      ['مقدمه', 1, 1],
      ['جزئیات', 2, 1],
      ['نتیجه', 1, 2],
    ]);
  });

  it('respects maxLevel', () => {
    const body = createEmptyDocumentBody('biz_1', 'doc_1');
    body.pages[0]!.blocks = [
      {
        id: 's1',
        type: 'section',
        props: { title: 'A', headingLevel: 1 },
        children: [],
      },
      {
        id: 't1',
        type: 'text',
        props: { content: 'B', headingLevel: 3 },
      },
    ];
    const entries = buildTableOfContents(body, { maxLevel: 1 });
    expect(entries).toHaveLength(1);
    expect(entries[0]!.title).toBe('A');
  });
});
