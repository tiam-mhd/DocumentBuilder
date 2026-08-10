import { MembershipRole, MembershipPermissionCodes, permissionsForRole, roleHasPermission } from '@vdb/shared-types';
import { TenancyErrorCodes } from '@vdb/shared-types';
import { TenancyService } from '../src/modules/tenancy/tenancy.service';

describe('membership RBAC matrix (P04-T02)', () => {
  it('Viewer has no mutate/export/publish permissions', () => {
    const perms = permissionsForRole(MembershipRole.Viewer);
    expect(perms).toEqual([]);
    expect(
      roleHasPermission(MembershipRole.Viewer, MembershipPermissionCodes.ExportPdf),
    ).toBe(false);
    expect(
      roleHasPermission(
        MembershipRole.Viewer,
        MembershipPermissionCodes.ManageDocuments,
      ),
    ).toBe(false);
  });

  it('Editor can manage data/templates/export but not publish or billing', () => {
    expect(
      roleHasPermission(
        MembershipRole.Editor,
        MembershipPermissionCodes.ManageTemplates,
      ),
    ).toBe(true);
    expect(
      roleHasPermission(MembershipRole.Editor, MembershipPermissionCodes.ExportPdf),
    ).toBe(true);
    expect(
      roleHasPermission(
        MembershipRole.Editor,
        MembershipPermissionCodes.DocumentsPublish,
      ),
    ).toBe(false);
    expect(
      roleHasPermission(
        MembershipRole.Editor,
        MembershipPermissionCodes.ManageBilling,
      ),
    ).toBe(false);
  });

  it('Admin can publish and audit but not billing/backup', () => {
    expect(
      roleHasPermission(
        MembershipRole.Admin,
        MembershipPermissionCodes.DocumentsPublish,
      ),
    ).toBe(true);
    expect(
      roleHasPermission(MembershipRole.Admin, MembershipPermissionCodes.AuditRead),
    ).toBe(true);
    expect(
      roleHasPermission(
        MembershipRole.Admin,
        MembershipPermissionCodes.ManageBilling,
      ),
    ).toBe(false);
    expect(
      roleHasPermission(
        MembershipRole.Admin,
        MembershipPermissionCodes.ManageBackup,
      ),
    ).toBe(false);
  });

  it('Owner has full matrix', () => {
    const perms = permissionsForRole(MembershipRole.Owner);
    expect(perms).toEqual(
      expect.arrayContaining([
        MembershipPermissionCodes.ManageBilling,
        MembershipPermissionCodes.ManageBackup,
        MembershipPermissionCodes.DocumentsPublish,
        MembershipPermissionCodes.ExportPdf,
      ]),
    );
  });

  it('assertPermission denies Viewer export', async () => {
    const prisma = {
      businessMembership: {
        findUnique: jest.fn().mockResolvedValue({
          role: MembershipRole.Viewer,
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
    await expect(
      service.assertPermission(
        'u1',
        'b1',
        MembershipPermissionCodes.ExportPdf,
      ),
    ).rejects.toMatchObject({
      code: TenancyErrorCodes.MembershipPermissionDenied,
    });
    await expect(
      service.assertPermission(
        'u1',
        'b1',
        MembershipPermissionCodes.ManageDocuments,
      ),
    ).rejects.toMatchObject({
      code: TenancyErrorCodes.MembershipPermissionDenied,
    });
  });
});
