import {
  clearPluginBlockRegistry,
  createEmptyTemplateBody,
  getBlockRegistry,
  isKnownBlockType,
  parseTemplateBody,
  registerPluginBlocks,
} from '@vdb/document-schema';
import {
  loadFirstPartyPlugins,
  parsePluginManifest,
  resetFirstPartyPluginsForTests,
} from '@vdb/plugins';
import { PluginsService } from '../src/modules/plugins/plugins.service';

describe('plugin system (P04-T08)', () => {
  afterEach(() => {
    resetFirstPartyPluginsForTests();
  });

  it('rejects non plugin.* block types', () => {
    expect(() =>
      registerPluginBlocks('vdb.bad', [
        {
          type: 'text',
          labelKey: 'text',
          allowsChildren: false,
          moduleCode: null,
        },
      ]),
    ).toThrow(/Plugin block type must match/);
  });

  it('loads first-party sample notice into registry', () => {
    const manifests = loadFirstPartyPlugins();
    expect(manifests.some((m) => m.id === 'vdb.sample-notice')).toBe(true);
    expect(isKnownBlockType('plugin.notice')).toBe(true);
    expect(
      getBlockRegistry().some(
        (e) => e.type === 'plugin.notice' && e.pluginId === 'vdb.sample-notice',
      ),
    ).toBe(true);
  });

  it('parses template body with plugin.notice', () => {
    loadFirstPartyPlugins();
    const empty = createEmptyTemplateBody('biz', 'tpl');
    const page = empty.pages[0]!;
    const body = parseTemplateBody({
      ...empty,
      pages: [
        {
          ...page,
          blocks: [
            {
              id: 'b1',
              type: 'plugin.notice',
              props: { title: 'Hi', body: 'World' },
            },
          ],
        },
      ],
    });
    expect(body.pages[0]?.blocks[0]?.type).toBe('plugin.notice');
  });

  it('refuses third-party trust in manifest schema', () => {
    expect(() =>
      parsePluginManifest({
        id: 'vdb.evil',
        version: '1.0.0',
        name: 'Evil',
        description: null,
        moduleCode: null,
        trust: 'third-party',
        blocks: [
          {
            type: 'plugin.evil',
            labelKey: 'evil',
            allowsChildren: false,
            moduleCode: null,
          },
        ],
      }),
    ).toThrow();
  });

  it('PluginsService lists sample plugin', () => {
    clearPluginBlockRegistry();
    const service = new PluginsService();
    service.onModuleInit();
    const list = service.list();
    expect(list.items.length).toBeGreaterThan(0);
    expect(list.items[0]?.trust).toBe('first-party');
  });
});
