import {
  ALL_BLOCK_TYPES,
  BLOCK_REGISTRY,
  TEMPLATE_SCHEMA_VERSION,
  createEmptyTemplateBody,
  parseTemplateBody,
} from '@vdb/document-schema';
import { TemplateErrorCodes } from '@vdb/shared-types';
import { TemplateService } from '../src/modules/design/template.service';

describe('TemplateService', () => {
  function build() {
    const bodies = {
      ensureIndexes: jest.fn().mockResolvedValue(undefined),
      upsert: jest.fn().mockResolvedValue(undefined),
      find: jest.fn().mockResolvedValue(null),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    const prisma = {
      documentTemplate: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn(),
        create: jest.fn().mockImplementation(async ({ data }) => ({
          id: 'tpl_1',
          businessId: data.businessId,
          themeId: data.themeId ?? null,
          name: data.name,
          description: data.description ?? null,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          deletedAt: null,
        })),
        update: jest.fn(),
        delete: jest.fn(),
      },
      designTheme: {
        findFirst: jest.fn().mockResolvedValue({ id: 'theme_1' }),
      },
    };
    const entitlements = {
      assertModule: jest.fn().mockResolvedValue({}),
    };
    const service = new TemplateService(
      prisma as never,
      bodies as never,
      entitlements as never,
    );
    return { service, prisma, bodies, entitlements };
  }

  it('exposes full block registry aligned with document-schema', () => {
    const { service } = build();
    const reg = service.getRegistry();
    expect(reg.schemaVersion).toBe(TEMPLATE_SCHEMA_VERSION);
    expect(reg.items.map((i) => i.type).sort()).toEqual(
      [...ALL_BLOCK_TYPES].sort(),
    );
    expect(reg.items).toHaveLength(BLOCK_REGISTRY.length);
    expect(reg.items.find((i) => i.type === 'gallery')?.moduleCode).toBe(
      'module.gallery',
    );
  });

  it('creates template with empty starter body in Mongo', async () => {
    const { service, bodies, prisma } = build();
    const detail = await service.create({
      businessId: 'biz_1',
      name: 'Profile',
      themeId: 'theme_1',
    });
    expect(prisma.documentTemplate.create).toHaveBeenCalled();
    expect(bodies.upsert).toHaveBeenCalled();
    expect(detail.body).toMatchObject({
      businessId: 'biz_1',
      templateId: 'tpl_1',
      schemaVersion: TEMPLATE_SCHEMA_VERSION,
    });
    const parsed = parseTemplateBody(detail.body);
    expect(parsed.pages[0]?.blocks.some((b) => b.type === 'headerSlot')).toBe(
      true,
    );
    expect(
      parsed.pages[0]?.blocks.some(
        (b) => b.type === 'text' || b.type === 'section',
      ),
    ).toBe(true);
    expect(parsed.masters.length).toBeGreaterThan(0);
    expect(parsed.pages[0]?.masterId).toBe(parsed.masters[0]?.id);
  });

  it('rejects invalid template name', async () => {
    const { service } = build();
    await expect(
      service.create({ businessId: 'biz_1', name: '  ' }),
    ).rejects.toMatchObject({ code: TemplateErrorCodes.InvalidName });
  });

  it('rejects unknown theme', async () => {
    const { service, prisma } = build();
    prisma.designTheme.findFirst.mockResolvedValue(null);
    await expect(
      service.create({
        businessId: 'biz_1',
        name: 'X',
        themeId: 'missing',
      }),
    ).rejects.toMatchObject({ code: TemplateErrorCodes.ThemeNotFound });
  });

  it('denies create when body requires a locked module', async () => {
    const { service, entitlements, prisma } = build();
    const { DomainException } = await import(
      '../src/common/errors/domain.exception'
    );
    const { EntitlementErrorCodes } = await import('@vdb/shared-types');
    entitlements.assertModule.mockRejectedValue(
      new DomainException(
        EntitlementErrorCodes.ModuleRequired,
        'Missing entitlement: module.map',
        403,
      ),
    );
    const body = createEmptyTemplateBody('biz_1', 'tmp');
    body.pages[0]!.blocks = [
      {
        id: 'm1',
        type: 'map',
        props: {
          centerLat: 35,
          centerLng: 51,
          zoom: 10,
          markersSource: 'none',
          showMarkers: false,
          heightPx: 200,
        },
      },
    ];
    await expect(
      service.create({
        businessId: 'biz_1',
        name: 'Map tpl',
        body,
      }),
    ).rejects.toMatchObject({ code: EntitlementErrorCodes.ModuleRequired });
    expect(prisma.documentTemplate.delete).toHaveBeenCalled();
  });
});
