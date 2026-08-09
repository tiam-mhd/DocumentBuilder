import { TeamErrorCodes } from '@vdb/shared-types';
import { TeamService } from '../src/modules/content/team.service';

describe('TeamService', () => {
  function build(overrides?: { mediaFindFirst?: jest.Mock }) {
    const branch = {
      findFirst: jest.fn().mockResolvedValue({
        id: 'br_1',
        businessId: 'biz_1',
        name: 'تهران',
        addressLine1: 'خیابان ۱',
        addressLine2: '',
        city: 'تهران',
        province: 'تهران',
        postalCode: '',
        country: 'IR',
        phone: '',
        locationId: null,
        sortOrder: 0,
        fields: {},
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        deletedAt: null,
      }),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'br_1',
        ...data,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        deletedAt: null,
      })),
      update: jest.fn(),
    };
    const teamMember = {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation(
        async ({ data }: { data: Record<string, unknown> }) => ({
          id: 'tm_1',
          parentMemberId: data.parentMemberId ?? null,
          branch: data.branchId
            ? {
                id: data.branchId,
                name: 'تهران',
              }
            : null,
          ...data,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          deletedAt: null,
        }),
      ),
      update: jest.fn(),
      updateMany: jest.fn(),
    };
    const mediaAsset = {
      findFirst:
        overrides?.mediaFindFirst ??
        jest.fn().mockResolvedValue({ id: 'media_1' }),
    };
    const prisma = {
      branch,
      teamMember,
      mediaAsset,
      $transaction: jest.fn(async (ops: unknown) => ops),
    };
    const locations = {
      resolveOptionalId: jest.fn().mockResolvedValue(null),
    };
    return {
      service: new TeamService(prisma as never, locations as never),
      prisma,
      locations,
    };
  }

  it('creates branch and team member with photo', async () => {
    const { service, prisma } = build();
    const br = await service.createBranch({
      businessId: 'biz_1',
      name: 'اصفهان',
      city: 'اصفهان',
      locationId: null,
    });
    expect(br.name).toBe('اصفهان');
    expect(br.locationId).toBeNull();

    const member = await service.createMember({
      businessId: 'biz_1',
      name: 'علی رضایی',
      roleTitle: 'مدیر پروژه',
      department: 'اجرا',
      photoMediaId: 'media_1',
      branchId: 'br_1',
      sortOrder: 1,
    });
    expect(prisma.teamMember.create).toHaveBeenCalled();
    expect(member.name).toBe('علی رضایی');
    expect(member.photoMediaId).toBe('media_1');
    expect(member.branchId).toBe('br_1');
  });

  it('rejects unknown photo media', async () => {
    const { service } = build({
      mediaFindFirst: jest.fn().mockResolvedValue(null),
    });
    await expect(
      service.createMember({
        businessId: 'biz_1',
        name: 'x',
        photoMediaId: 'missing',
      }),
    ).rejects.toMatchObject({ code: TeamErrorCodes.MediaNotFound });
  });

  it('blocks deleting branch with members', async () => {
    const { service, prisma } = build();
    prisma.teamMember.count = jest.fn().mockResolvedValue(2);
    await expect(
      service.softDeleteBranch('biz_1', 'br_1'),
    ).rejects.toMatchObject({ code: TeamErrorCodes.BranchInUse });
  });

  it('rejects self as parent', async () => {
    const { service, prisma } = build();
    prisma.teamMember.findFirst = jest.fn().mockResolvedValue({
      id: 'tm_1',
      businessId: 'biz_1',
      parentMemberId: null,
      branch: null,
      name: 'Ali',
      roleTitle: '',
      department: '',
      photoMediaId: null,
      branchId: null,
      sortOrder: 0,
      fields: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
    await expect(
      service.updateMember({
        businessId: 'biz_1',
        memberId: 'tm_1',
        parentMemberId: 'tm_1',
      }),
    ).rejects.toMatchObject({ code: TeamErrorCodes.ParentCycle });
  });
});
