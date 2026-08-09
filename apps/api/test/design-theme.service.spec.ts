import {
  DEFAULT_DESIGN_THEME_TOKENS,
  DesignThemeErrorCodes,
} from '@vdb/shared-types';
import { DesignThemeService } from '../src/modules/design/design-theme.service';

describe('DesignThemeService', () => {
  function build(overrides?: {
    findFirst?: jest.Mock;
    fontFindFirst?: jest.Mock;
  }) {
    const designTheme = {
      findFirst: overrides?.findFirst ?? jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'theme_1',
        ...data,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        deletedAt: null,
      })),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      update: jest.fn(),
      updateMany: jest.fn(),
    };
    const prisma = {
      designTheme,
      fontFace: {
        findFirst: overrides?.fontFindFirst ?? jest.fn().mockResolvedValue(null),
      },
      $transaction: jest.fn(
        async <T>(fn: (tx: typeof designTheme extends never ? never : object) => Promise<T>): Promise<T> =>
          fn({ designTheme } as never),
      ),
    };
    const service = new DesignThemeService(prisma as never);
    return { service, prisma };
  }

  it('normalizes default token shape', () => {
    const { service } = build();
    expect(service.normalizeTokens(DEFAULT_DESIGN_THEME_TOKENS)).toEqual(
      expect.objectContaining({
        colors: expect.objectContaining({ primary: '#1B4D3E' }),
        fonts: { headingFontFaceId: null, bodyFontFaceId: null },
      }),
    );
  });

  it('rejects invalid hex colors', () => {
    const { service } = build();
    try {
      service.normalizeTokens({
        ...DEFAULT_DESIGN_THEME_TOKENS,
        colors: {
          ...DEFAULT_DESIGN_THEME_TOKENS.colors,
          primary: 'green',
        },
      });
      fail('expected throw');
    } catch (err) {
      expect(err).toMatchObject({ code: DesignThemeErrorCodes.InvalidTokens });
    }
  });

  it('ensureDefault creates when missing', async () => {
    const { service, prisma } = build();
    const theme = await service.ensureDefault('biz_1');
    expect(prisma.designTheme.create).toHaveBeenCalled();
    expect(theme.isDefault).toBe(true);
    expect(theme.businessId).toBe('biz_1');
  });

  it('rejects unknown font face refs on update path', async () => {
    const existing = {
      id: 'theme_1',
      businessId: 'biz_1',
      name: 'Default',
      isDefault: true,
      tokens: DEFAULT_DESIGN_THEME_TOKENS,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
    };
    const { service } = build({
      findFirst: jest.fn().mockResolvedValue(existing),
      fontFindFirst: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.update({
        businessId: 'biz_1',
        themeId: 'theme_1',
        tokens: {
          ...DEFAULT_DESIGN_THEME_TOKENS,
          fonts: {
            headingFontFaceId: 'missing_font',
            bodyFontFaceId: null,
          },
        },
      }),
    ).rejects.toMatchObject({ code: DesignThemeErrorCodes.FontNotFound });
  });

  it('seedDefaultInTx writes default tokens', async () => {
    const { service } = build();
    const tx = {
      designTheme: {
        create: jest.fn().mockResolvedValue({}),
      },
    };
    await service.seedDefaultInTx(tx as never, 'biz_9');
    expect(tx.designTheme.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        businessId: 'biz_9',
        isDefault: true,
        name: 'Default',
      }),
    });
  });
});
