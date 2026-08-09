import { documentCollectRequiredModuleCodes } from '@vdb/document-schema';
import { EntitlementCodes } from '@vdb/shared-types';

describe('documentCollectRequiredModuleCodes', () => {
  it('collects module block codes + gated repeater/visibility sources', () => {
    const codes = documentCollectRequiredModuleCodes({
      pages: [
        {
          blocks: [
            {
              id: 'm1',
              type: 'map',
              props: {},
            },
            {
              id: 'g1',
              type: 'gallery',
              props: { galleryId: 'gal_1' },
            },
            {
              id: 'r1',
              type: 'repeater',
              props: { source: 'projects', limit: 5 },
              children: [],
            },
            {
              id: 's1',
              type: 'section',
              props: { title: 'Certs' },
              when: { op: 'exists', path: 'collection.timelineEvents' },
              children: [],
            },
            {
              id: 't1',
              type: 'text',
              props: { content: 'core' },
            },
          ],
        },
      ],
      masters: [],
    });
    expect(codes).toEqual(
      [
        EntitlementCodes.ModuleGallery,
        EntitlementCodes.ModuleMap,
        EntitlementCodes.ModuleProjects,
        EntitlementCodes.ModuleTimeline,
      ].sort(),
    );
  });

  it('returns empty for core-only bodies', () => {
    expect(
      documentCollectRequiredModuleCodes({
        pages: [
          {
            blocks: [
              { id: 't1', type: 'text', props: { content: 'hi' } },
              {
                id: 'r1',
                type: 'repeater',
                props: { source: 'teamMembers' },
                children: [],
              },
            ],
          },
        ],
      }),
    ).toEqual([]);
  });
});
