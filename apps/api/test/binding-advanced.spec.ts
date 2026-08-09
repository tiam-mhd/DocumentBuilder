import {
  applyBindings,
  bindBlockTree,
  bindDocumentBlocks,
  bindItemPlaceholders,
  documentCollectBindingSources,
  documentCollectRepeaterSources,
  parseBindingExpression,
  parseRepeaterBlockProps,
  resolveBindingExpression,
  type BindingContext,
} from '@vdb/document-schema';

describe('advanced binding helpers (ADR 016)', () => {
  const ctx: BindingContext = {
    business: { name: 'Acme Co' },
    collections: {
      projects: {
        total: 3,
        items: [
          { values: { title: 'A', status: 'published' } },
          { values: { title: 'B', status: 'draft' } },
          { values: { title: 'C', status: 'published' } },
        ],
      },
      teamMembers: { total: 5, items: [] },
    },
  };

  it('parses allowed expressions and rejects unsafe ones', () => {
    expect(parseBindingExpression('business.name')).toEqual({
      kind: 'business',
      field: 'name',
    });
    expect(parseBindingExpression('item.title')).toEqual({
      kind: 'item',
      field: 'title',
    });
    expect(parseBindingExpression('count(projects)')).toEqual({
      kind: 'count',
      source: 'projects',
    });
    expect(
      parseBindingExpression('count(projects where status=published)'),
    ).toEqual({
      kind: 'count',
      source: 'projects',
      where: { field: 'status', value: 'published' },
    });
    expect(parseBindingExpression('count(evil)')).toBeNull();
    expect(parseBindingExpression('eval(1)')).toBeNull();
    expect(parseBindingExpression('business.__proto__')).toBeNull();
  });

  it('resolves business, count, and where filters', () => {
    expect(
      resolveBindingExpression({ kind: 'business', field: 'name' }, ctx),
    ).toBe('Acme Co');
    expect(
      resolveBindingExpression({ kind: 'count', source: 'projects' }, ctx),
    ).toBe('3');
    expect(
      resolveBindingExpression(
        {
          kind: 'count',
          source: 'projects',
          where: { field: 'status', value: 'published' },
        },
        ctx,
      ),
    ).toBe('2');
    expect(
      applyBindings(
        '{{business.name}} has {{count(projects)}} / {{count(projects where status=published)}}',
        ctx,
      ),
    ).toBe('Acme Co has 3 / 2');
  });

  it('replaces known {{item.*}} keys and blanks unknown', () => {
    expect(
      bindItemPlaceholders('Hello {{item.title}} — {{item.missing}}', {
        title: 'Alpha',
      }),
    ).toBe('Hello Alpha — ');
  });

  it('binds nested text/section props in a card tree', () => {
    const bound = bindBlockTree(
      [
        {
          id: 't1',
          type: 'text',
          props: { content: '{{item.title}} · {{business.name}}' },
        },
        {
          id: 's1',
          type: 'section',
          props: { title: '{{item.name}}' },
          children: [
            {
              id: 't2',
              type: 'text',
              props: { content: '{{item.roleTitle}}' },
            },
          ],
        },
      ],
      { ...ctx, item: { title: 'P1', name: 'Team', roleTitle: 'Eng' } },
    );
    expect(bound[0]?.props.content).toBe('P1 · Acme Co');
    expect(bound[1]?.props.title).toBe('Team');
    expect(bound[1]?.children?.[0]?.props.content).toBe('Eng');
  });

  it('bindDocumentBlocks leaves repeater children unbound', () => {
    const [rep] = bindDocumentBlocks(
      [
        {
          id: 'r1',
          type: 'repeater',
          props: {
            source: 'projects',
            emptyMessage: '{{count(projects)}} left',
          },
          children: [
            {
              id: 't1',
              type: 'text',
              props: { content: '{{item.title}}' },
            },
          ],
        },
      ],
      ctx,
    );
    expect(rep?.props.emptyMessage).toBe('3 left');
    expect(rep?.children?.[0]?.props.content).toBe('{{item.title}}');
  });

  it('collects binding and repeater sources', () => {
    const body = {
      pages: [
        {
          blocks: [
            {
              id: 't1',
              type: 'text' as const,
              props: { content: '{{count(clients)}}' },
            },
            {
              id: 'r1',
              type: 'repeater' as const,
              props: { source: 'projects', limit: 10 },
              children: [],
            },
            {
              id: 'r2',
              type: 'repeater' as const,
              props: parseRepeaterBlockProps({ source: 'teamMembers' }),
              children: [],
            },
          ],
        },
      ],
      masters: [],
    };
    expect(documentCollectRepeaterSources(body).sort()).toEqual(
      ['projects', 'teamMembers'].sort(),
    );
    expect(documentCollectBindingSources(body).sort()).toEqual(
      ['clients', 'projects', 'teamMembers'].sort(),
    );
  });
});
