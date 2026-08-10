import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { MembershipRole } from '@prisma/client';
import {
  AuditActions,
  MembershipPermissionCodes,
  MembershipRole as PublicMembershipRole,
  TenancyErrorCodes,
  membershipCanManageSettings,
  membershipCanWriteContent,
  membershipRoleAtLeast,
  permissionsForRole,
  roleHasPermission,
  type MembershipPermissionCode,
  type PublicBusiness,
  type PublicBusinessPermissions,
} from '@vdb/shared-types';
import { DomainException } from '../../common/errors/domain.exception';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  BUSINESS_CREATED_HOOK,
  type BusinessCreatedHook,
} from './business-created.hook';

@Injectable()
export class TenancyService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(BUSINESS_CREATED_HOOK)
    private readonly createdHook: BusinessCreatedHook,
    private readonly audit: AuditService,
  ) {}

  async listForUser(userId: string): Promise<PublicBusiness[]> {
    const rows = await this.prisma.businessMembership.findMany({
      where: {
        userId,
        business: { deletedAt: null },
      },
      include: { business: true },
      orderBy: { createdAt: 'asc' },
    });

    return rows.map((row) => this.toPublic(row.business, row.role));
  }

  async create(userId: string, name: string): Promise<PublicBusiness> {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      throw new DomainException(
        TenancyErrorCodes.BusinessNameInvalid,
        'Business name is invalid',
        HttpStatus.BAD_REQUEST,
      );
    }

    const ownedBefore = await this.prisma.businessMembership.count({
      where: { userId, role: MembershipRole.OWNER },
    });

    const created = await this.prisma.$transaction(async (tx) => {
      const business = await tx.business.create({
        data: { name: trimmed },
      });
      const membership = await tx.businessMembership.create({
        data: {
          businessId: business.id,
          userId,
          role: MembershipRole.OWNER,
        },
      });

      await this.createdHook.afterBusinessCreated(tx, {
        userId,
        businessId: business.id,
        isFirstOwnedBusiness: ownedBefore === 0,
      });

      return { business, membership };
    });

    await this.audit.log({
      action: AuditActions.BusinessCreate,
      entityType: 'business',
      entityId: created.business.id,
      businessId: created.business.id,
      userId,
      meta: { name: created.business.name },
    });

    return this.toPublic(created.business, created.membership.role);
  }

  async getForUser(userId: string, businessId: string): Promise<PublicBusiness> {
    const membership = await this.requireMembership(userId, businessId);
    return this.toPublic(membership.business, membership.role);
  }

  /** Rename — ADMIN+ (settings). */
  async updateForAdmin(
    userId: string,
    businessId: string,
    name: string,
  ): Promise<PublicBusiness> {
    const membership = await this.requireMembership(userId, businessId);
    if (!membershipCanManageSettings(membership.role)) {
      throw new DomainException(
        TenancyErrorCodes.BusinessForbidden,
        'Admin or owner role required',
        HttpStatus.FORBIDDEN,
      );
    }

    const trimmed = name.trim();
    if (trimmed.length < 2) {
      throw new DomainException(
        TenancyErrorCodes.BusinessNameInvalid,
        'Business name is invalid',
        HttpStatus.BAD_REQUEST,
      );
    }

    const business = await this.prisma.business.update({
      where: { id: businessId },
      data: { name: trimmed },
    });

    return this.toPublic(business, membership.role);
  }

  /** Alias kept for older call sites / tests. */
  async updateForOwner(
    userId: string,
    businessId: string,
    name: string,
  ): Promise<PublicBusiness> {
    return this.updateForAdmin(userId, businessId, name);
  }

  async softDeleteForOwner(userId: string, businessId: string): Promise<void> {
    const membership = await this.requireMembership(userId, businessId);
    if (membership.role !== MembershipRole.OWNER) {
      throw new DomainException(
        TenancyErrorCodes.BusinessForbidden,
        'Only the owner can delete this business',
        HttpStatus.FORBIDDEN,
      );
    }

    await this.prisma.business.update({
      where: { id: businessId },
      data: { deletedAt: new Date() },
    });

    await this.audit.log({
      action: AuditActions.BusinessDelete,
      entityType: 'business',
      entityId: businessId,
      businessId,
      userId,
      meta: { name: membership.business.name },
    });
  }

  async assertMembership(userId: string, businessId: string): Promise<void> {
    await this.requireMembership(userId, businessId);
  }

  async getMembershipRole(
    userId: string,
    businessId: string,
  ): Promise<MembershipRole> {
    const membership = await this.requireMembership(userId, businessId);
    return membership.role;
  }

  async assertMinRole(
    userId: string,
    businessId: string,
    minimum: PublicMembershipRole,
  ): Promise<MembershipRole> {
    const role = await this.getMembershipRole(userId, businessId);
    if (!membershipRoleAtLeast(role, minimum)) {
      throw new DomainException(
        TenancyErrorCodes.BusinessForbidden,
        `Role ${minimum} or higher required`,
        HttpStatus.FORBIDDEN,
      );
    }
    return role;
  }

  /** EDITOR+ — content writes behind EntitlementGuard (legacy fallback). */
  async assertContentWriter(userId: string, businessId: string): Promise<void> {
    const role = await this.getMembershipRole(userId, businessId);
    if (!membershipCanWriteContent(role)) {
      throw new DomainException(
        TenancyErrorCodes.MembershipPermissionDenied,
        'Editor role or higher required to write',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  async assertPermission(
    userId: string,
    businessId: string,
    permission: MembershipPermissionCode | string,
  ): Promise<void> {
    const role = await this.getMembershipRole(userId, businessId);
    if (!roleHasPermission(role, permission)) {
      throw new DomainException(
        TenancyErrorCodes.MembershipPermissionDenied,
        `Permission required: ${permission}`,
        HttpStatus.FORBIDDEN,
      );
    }
  }

  async assertPermissions(
    userId: string,
    businessId: string,
    permissions: readonly string[],
  ): Promise<void> {
    for (const permission of permissions) {
      await this.assertPermission(userId, businessId, permission);
    }
  }

  async getPermissions(
    userId: string,
    businessId: string,
  ): Promise<PublicBusinessPermissions> {
    const role = await this.getMembershipRole(userId, businessId);
    return {
      businessId,
      role: role as unknown as PublicMembershipRole,
      permissions: permissionsForRole(role),
    };
  }

  /** ADMIN+ — settings / members / audit. */
  async assertAdmin(userId: string, businessId: string): Promise<void> {
    await this.assertPermission(
      userId,
      businessId,
      MembershipPermissionCodes.ManageMembers,
    );
  }

  /** OWNER or ADMIN — document approvers / publishers (ADR 021). */
  async assertApprover(userId: string, businessId: string): Promise<void> {
    await this.assertPermission(
      userId,
      businessId,
      MembershipPermissionCodes.DocumentsPublish,
    );
  }

  /** OWNER only — billing mutate, backup/restore, delete. */
  async assertOwner(userId: string, businessId: string): Promise<void> {
    const role = await this.getMembershipRole(userId, businessId);
    if (role !== MembershipRole.OWNER) {
      throw new DomainException(
        TenancyErrorCodes.BusinessForbidden,
        'Owner role required',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private async requireMembership(userId: string, businessId: string) {
    const membership = await this.prisma.businessMembership.findUnique({
      where: {
        businessId_userId: { businessId, userId },
      },
      include: { business: true },
    });

    if (!membership || membership.business.deletedAt) {
      throw new DomainException(
        TenancyErrorCodes.BusinessNotFound,
        'Business not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return membership;
  }

  private toPublic(
    business: {
      id: string;
      name: string;
      createdAt: Date;
      updatedAt: Date;
      suspendedAt?: Date | null;
    },
    role: MembershipRole,
  ): PublicBusiness {
    return {
      id: business.id,
      name: business.name,
      role: role as unknown as PublicMembershipRole,
      createdAt: business.createdAt.toISOString(),
      updatedAt: business.updatedAt.toISOString(),
      suspended: Boolean(business.suspendedAt),
    };
  }
}
