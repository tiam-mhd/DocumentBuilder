import {
  buildTableOfContents,
  evaluateVisibilityCondition,
  isBlockVisible,
} from '@vdb/document-schema';

describe('conditional visibility (ADR 014)', () => {
  const ctx = { collection: { certificates: 0, projects: 2 } };

  it('exists / empty / eq on collection counts', () => {
    expect(
      evaluateVisibilityCondition(
        { op: 'exists', path: 'collection.certificates' },
        ctx,
      ),
    ).toBe(false);
    expect(
      evaluateVisibilityCondition(
        { op: 'empty', path: 'collection.certificates' },
        ctx,
      ),
    ).toBe(true);
    expect(
      evaluateVisibilityCondition(
        { op: 'exists', path: 'collection.projects' },
        ctx,
      ),
    ).toBe(true);
    expect(
      evaluateVisibilityCondition(
        { op: 'eq', path: 'collection.projects', value: '2' },
        ctx,
      ),
    ).toBe(true);
    expect(
      evaluateVisibilityCondition(
        { op: 'eq', path: 'collection.projects', value: '0' },
        ctx,
      ),
    ).toBe(false);
  });

  it('missing when always shows', () => {
    expect(
      isBlockVisible(
        { id: 's1', type: 'section', props: { title: 'Certs' } },
        ctx,
      ),
    ).toBe(true);
  });

  it('hides certificates section from TOC when empty', () => {
    const entries = buildTableOfContents(
      {
        pages: [
          {
            blocks: [
              {
                id: 's-cert',
                type: 'section',
                props: { title: 'گواهینامه‌ها', headingLevel: 1 },
                when: { op: 'exists', path: 'collection.certificates' },
                children: [],
              },
              {
                id: 's-about',
                type: 'section',
                props: { title: 'درباره ما', headingLevel: 1 },
                children: [],
              },
            ],
          },
        ],
      },
      { maxLevel: 3, showPageNumbers: true },
      ctx,
    );
    expect(entries.map((e) => e.title)).toEqual(['درباره ما']);
  });
});
