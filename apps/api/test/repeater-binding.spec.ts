import {
  bindBlockTree,
  bindItemPlaceholders,
  documentCollectRepeaterSources,
  parseRepeaterBlockProps,
} from '@vdb/document-schema';

describe('repeater binding helpers', () => {
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
          props: { content: '{{item.title}}' },
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
      { title: 'P1', name: 'Team', roleTitle: 'Eng' },
    );
    expect(bound[0]?.props.content).toBe('P1');
    expect(bound[1]?.props.title).toBe('Team');
    expect(bound[1]?.children?.[0]?.props.content).toBe('Eng');
  });

  it('collects unique repeater sources from a body', () => {
    const sources = documentCollectRepeaterSources({
      pages: [
        {
          blocks: [
            {
              id: 'r1',
              type: 'repeater',
              props: { source: 'projects', limit: 10 },
              children: [],
            },
            {
              id: 'r2',
              type: 'repeater',
              props: parseRepeaterBlockProps({ source: 'teamMembers' }),
              children: [],
            },
          ],
        },
      ],
      masters: [],
    });
    expect(sources.sort()).toEqual(['projects', 'teamMembers'].sort());
  });
});
