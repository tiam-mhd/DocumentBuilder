import { MembershipRole } from '@prisma/client';
import { TenancyService } from '../src/modules/tenancy/tenancy.service';
import { TenancyErrorCodes } from '@vdb/shared-types';
import { DomainException } from '../src/common/errors/domain.exception';

describe('TenancyService', () => {
  const userId = 'user_1';

  function build(overrides?: {
    count?: number;
    findUnique?: unknown;
  }) {
    const hook = { afterBusinessCreated: jest.fn().mockResolvedValue(undefined) };
    const prisma = {
      businessMembership: {
        count: jest.fn().mockResolvedValue(overrides?.count ?? 0),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(
          overrides?.findUnique === undefined
            ? null
            : overrides.findUnique,
        ),
        create: jest.fn(),
      },
      business: {
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          business: {
            create: jest.fn().mockResolvedValue({
              id: 'biz_1',
              name: 'Acme',
              createdAt: new Date('2026-01-01T00:00:00.000Z'),
              updatedAt: new Date('2026-01-01T00:00:00.000Z'),
              deletedAt: null,
            }),
          },
          businessMembership: {
            create: jest.fn().mockResolvedValue({
              id: 'mem_1',
              role: MembershipRole.OWNER,
            }),
          },
        };
        return fn(tx);
      }),
    };

    return {
      service: new TenancyService(prisma as never, hook, {
        log: jest.fn().mockResolvedValue(undefined),
      } as never),
      prisma,
      hook,
    };
  }

  it('creates business with OWNER membership and invokes trial hook stub', async () => {
    const { service, hook } = build({ count: 0 });
    const result = await service.create(userId, 'Acme');
    expect(result.id).toBe('biz_1');
    expect(result.role).toBe('OWNER');
    expect(hook.afterBusinessCreated).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId,
        businessId: 'biz_1',
        isFirstOwnedBusiness: true,
      }),
    );
  });

  it('marks isFirstOwnedBusiness false when user already owns one', async () => {
    const { service, hook } = build({ count: 1 });
    await service.create(userId, 'Second');
    expect(hook.afterBusinessCreated).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ isFirstOwnedBusiness: false }),
    );
  });

  it('hides non-member businesses (IDOR)', async () => {
    const { service } = build({ findUnique: null });
    await expect(service.getForUser(userId, 'other')).rejects.toMatchObject({
      code: TenancyErrorCodes.BusinessNotFound,
    });
  });

  it('allows member to read business', async () => {
    const { service } = build({
      findUnique: {
        role: MembershipRole.MEMBER,
        business: {
          id: 'biz_2',
          name: 'Owned',
          createdAt: new Date('2026-01-02T00:00:00.000Z'),
          updatedAt: new Date('2026-01-02T00:00:00.000Z'),
          deletedAt: null,
        },
      },
    });
    const result = await service.getForUser(userId, 'biz_2');
    expect(result.name).toBe('Owned');
    expect(result.role).toBe('MEMBER');
  });

  it('forbids non-owner update', async () => {
    const { service } = build({
      findUnique: {
        role: MembershipRole.MEMBER,
        business: {
          id: 'biz_2',
          name: 'Owned',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      },
    });
    await expect(
      service.updateForOwner(userId, 'biz_2', 'Nope'),
    ).rejects.toBeInstanceOf(DomainException);
    await expect(
      service.updateForOwner(userId, 'biz_2', 'Nope'),
    ).rejects.toMatchObject({ code: TenancyErrorCodes.BusinessForbidden });
  });
});
