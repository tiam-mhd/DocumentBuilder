import { MembershipRole } from '@prisma/client';
import {
  MembershipRole as PublicRole,
  TenancyErrorCodes,
  membershipCanWriteContent,
  membershipRoleAtLeast,
} from '@vdb/shared-types';
import { DomainException } from '../src/common/errors/domain.exception';
import { MembershipService } from '../src/modules/tenancy/membership.service';
import { TenancyService } from '../src/modules/tenancy/tenancy.service';

describe('membership roles (P04-T01)', () => {
  it('ranks OWNER > ADMIN > EDITOR > VIEWER', () => {
    expect(membershipRoleAtLeast(PublicRole.Owner, PublicRole.Admin)).toBe(
      true,
    );
    expect(membershipRoleAtLeast(PublicRole.Editor, PublicRole.Admin)).toBe(
      false,
    );
    expect(membershipCanWriteContent(PublicRole.Viewer)).toBe(false);
    expect(membershipCanWriteContent(PublicRole.Editor)).toBe(true);
  });

  it('assertContentWriter denies VIEWER', async () => {
    const prisma = {
      businessMembership: {
        findUnique: jest.fn().mockResolvedValue({
          role: MembershipRole.VIEWER,
          business: {
            id: 'b1',
            name: 'Acme',
            deletedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        }),
      },
    };
    const service = new TenancyService(
      prisma as never,
      { afterBusinessCreated: jest.fn() } as never,
      { log: jest.fn() } as never,
    );
    await expect(service.assertContentWriter('u1', 'b1')).rejects.toMatchObject(
      {
        code: TenancyErrorCodes.MembershipPermissionDenied,
      },
    );
  });

  it('createInvitation rejects invalid mobile', async () => {
    const tenancy = {
      getMembershipRole: jest.fn().mockResolvedValue(MembershipRole.OWNER),
      assertMembership: jest.fn(),
      assertAdmin: jest.fn(),
    };
    const prisma = {
      user: { findUnique: jest.fn() },
      businessMembership: { findUnique: jest.fn() },
      businessInvitation: {
        findFirst: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const service = new MembershipService(
      prisma as never,
      tenancy as never,
      { log: jest.fn() } as never,
    );
    await expect(
      service.createInvitation('owner', 'biz', '123', PublicRole.Editor),
    ).rejects.toBeInstanceOf(DomainException);
    await expect(
      service.createInvitation('owner', 'biz', '123', PublicRole.Editor),
    ).rejects.toMatchObject({ code: TenancyErrorCodes.MobileInvalid });
  });

  it('acceptInvitation requires matching mobile', async () => {
    const tenancy = {
      getMembershipRole: jest.fn(),
      assertMembership: jest.fn(),
      assertAdmin: jest.fn(),
    };
    const prisma = {
      businessInvitation: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'inv_1',
          businessId: 'biz_1',
          mobile: '+989121111111',
          role: MembershipRole.EDITOR,
          token: 'tok',
          status: 'pending',
          expiresAt: new Date(Date.now() + 60_000),
          business: { name: 'Acme', deletedAt: null },
        }),
        update: jest.fn(),
      },
      businessMembership: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn(),
    };
    const service = new MembershipService(
      prisma as never,
      tenancy as never,
      { log: jest.fn() } as never,
    );
    await expect(
      service.acceptInvitation('u1', '+989999999999', 'tok'),
    ).rejects.toMatchObject({
      code: TenancyErrorCodes.InvitationMobileMismatch,
    });
  });

  it('acceptInvitation creates membership when pending', async () => {
    const tenancy = {
      getMembershipRole: jest.fn(),
      assertMembership: jest.fn(),
      assertAdmin: jest.fn(),
    };
    const created = {
      id: 'mem_1',
      userId: 'u1',
      role: MembershipRole.VIEWER,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      user: { mobile: '+989121111111' },
    };
    const prisma = {
      businessInvitation: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'inv_1',
          businessId: 'biz_1',
          mobile: '+989121111111',
          role: MembershipRole.VIEWER,
          token: 'tok',
          status: 'pending',
          expiresAt: new Date(Date.now() + 60_000),
          business: { name: 'Acme', deletedAt: null },
        }),
        update: jest.fn(),
      },
      businessMembership: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          businessMembership: {
            create: jest.fn().mockResolvedValue(created),
          },
          businessInvitation: { update: jest.fn() },
        };
        return fn(tx);
      }),
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new MembershipService(
      prisma as never,
      tenancy as never,
      audit as never,
    );
    const member = await service.acceptInvitation(
      'u1',
      '+989121111111',
      'tok',
    );
    expect(member.role).toBe('VIEWER');
    expect(audit.log).toHaveBeenCalled();
  });
});
