import { randomBytes } from 'node:crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import {
  InvitationStatus as PrismaInvitationStatus,
  MembershipRole as PrismaMembershipRole,
} from '@prisma/client';
import {
  AuditActions,
  INVITABLE_MEMBERSHIP_ROLES,
  InvitationStatus,
  MembershipRole,
  TenancyErrorCodes,
  membershipCanManageMembers,
  type InvitableMembershipRole,
  type PublicBusinessInvitation,
  type PublicBusinessMember,
  type PublicInvitationPreview,
} from '@vdb/shared-types';
import { DomainException } from '../../common/errors/domain.exception';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { normalizeMobile } from '../identity/mobile.util';
import { TenancyService } from './tenancy.service';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class MembershipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
    private readonly audit: AuditService,
  ) {}

  async listMembers(
    actorUserId: string,
    businessId: string,
  ): Promise<PublicBusinessMember[]> {
    await this.tenancy.assertMembership(actorUserId, businessId);
    const rows = await this.prisma.businessMembership.findMany({
      where: { businessId },
      include: { user: true },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((row) => ({
      userId: row.userId,
      mobile: row.user.mobile,
      role: row.role as MembershipRole,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async updateMemberRole(
    actorUserId: string,
    businessId: string,
    targetUserId: string,
    nextRole: MembershipRole,
  ): Promise<PublicBusinessMember> {
    const actorRole = await this.tenancy.getMembershipRole(
      actorUserId,
      businessId,
    );
    this.assertCanManageMembers(actorRole);

    if (nextRole === MembershipRole.Owner) {
      throw new DomainException(
        TenancyErrorCodes.InvitationInvalidRole,
        'Cannot assign OWNER via role change',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!this.isInvitableRole(nextRole) && nextRole !== MembershipRole.Admin) {
      throw new DomainException(
        TenancyErrorCodes.InvitationInvalidRole,
        'Invalid membership role',
        HttpStatus.BAD_REQUEST,
      );
    }

    const target = await this.prisma.businessMembership.findUnique({
      where: { businessId_userId: { businessId, userId: targetUserId } },
      include: { user: true },
    });
    if (!target) {
      throw new DomainException(
        TenancyErrorCodes.MemberNotFound,
        'Member not found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (target.role === PrismaMembershipRole.OWNER) {
      throw new DomainException(
        TenancyErrorCodes.MemberCannotModifyOwner,
        'Cannot change owner role',
        HttpStatus.FORBIDDEN,
      );
    }

    if (actorRole === MembershipRole.Admin) {
      if (
        target.role === PrismaMembershipRole.ADMIN ||
        nextRole === MembershipRole.Admin
      ) {
        throw new DomainException(
          TenancyErrorCodes.BusinessForbidden,
          'Admin cannot manage other admins',
          HttpStatus.FORBIDDEN,
        );
      }
    }

    const updated = await this.prisma.businessMembership.update({
      where: { id: target.id },
      data: { role: nextRole as PrismaMembershipRole },
      include: { user: true },
    });

    await this.audit.log({
      action: AuditActions.MembershipRoleChange,
      entityType: 'membership',
      entityId: updated.id,
      businessId,
      userId: actorUserId,
      meta: {
        targetUserId,
        from: target.role,
        to: nextRole,
      },
    });

    return {
      userId: updated.userId,
      mobile: updated.user.mobile,
      role: updated.role as MembershipRole,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async removeMember(
    actorUserId: string,
    businessId: string,
    targetUserId: string,
  ): Promise<void> {
    const actorRole = await this.tenancy.getMembershipRole(
      actorUserId,
      businessId,
    );
    this.assertCanManageMembers(actorRole);

    if (actorUserId === targetUserId) {
      throw new DomainException(
        TenancyErrorCodes.MemberCannotRemoveSelf,
        'Cannot remove yourself',
        HttpStatus.BAD_REQUEST,
      );
    }

    const target = await this.prisma.businessMembership.findUnique({
      where: { businessId_userId: { businessId, userId: targetUserId } },
    });
    if (!target) {
      throw new DomainException(
        TenancyErrorCodes.MemberNotFound,
        'Member not found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (target.role === PrismaMembershipRole.OWNER) {
      throw new DomainException(
        TenancyErrorCodes.MemberCannotModifyOwner,
        'Cannot remove the owner',
        HttpStatus.FORBIDDEN,
      );
    }
    if (
      actorRole === MembershipRole.Admin &&
      target.role === PrismaMembershipRole.ADMIN
    ) {
      throw new DomainException(
        TenancyErrorCodes.BusinessForbidden,
        'Admin cannot remove other admins',
        HttpStatus.FORBIDDEN,
      );
    }

    await this.prisma.businessMembership.delete({ where: { id: target.id } });

    await this.audit.log({
      action: AuditActions.MembershipRemove,
      entityType: 'membership',
      entityId: target.id,
      businessId,
      userId: actorUserId,
      meta: { targetUserId, role: target.role },
    });
  }

  async listInvitations(
    actorUserId: string,
    businessId: string,
  ): Promise<PublicBusinessInvitation[]> {
    await this.tenancy.assertAdmin(actorUserId, businessId);
    await this.expireStale(businessId);
    const rows = await this.prisma.businessInvitation.findMany({
      where: {
        businessId,
        status: {
          in: [
            PrismaInvitationStatus.pending,
            PrismaInvitationStatus.accepted,
            PrismaInvitationStatus.revoked,
            PrismaInvitationStatus.expired,
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map((row) => this.toPublicInvitation(row));
  }

  async createInvitation(
    actorUserId: string,
    businessId: string,
    rawMobile: string,
    role: MembershipRole,
  ): Promise<PublicBusinessInvitation> {
    const actorRole = await this.tenancy.getMembershipRole(
      actorUserId,
      businessId,
    );
    this.assertCanManageMembers(actorRole);

    if (!this.isInvitableRole(role)) {
      throw new DomainException(
        TenancyErrorCodes.InvitationInvalidRole,
        'Invite role must be ADMIN, EDITOR, or VIEWER',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (role === MembershipRole.Admin && actorRole !== MembershipRole.Owner) {
      throw new DomainException(
        TenancyErrorCodes.BusinessForbidden,
        'Only owner can invite admins',
        HttpStatus.FORBIDDEN,
      );
    }

    const mobile = normalizeMobile(rawMobile);
    if (!mobile) {
      throw new DomainException(
        TenancyErrorCodes.MobileInvalid,
        'Invalid mobile number',
        HttpStatus.BAD_REQUEST,
      );
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { mobile },
    });
    if (existingUser) {
      const already = await this.prisma.businessMembership.findUnique({
        where: {
          businessId_userId: { businessId, userId: existingUser.id },
        },
      });
      if (already) {
        throw new DomainException(
          TenancyErrorCodes.MemberAlreadyExists,
          'User is already a member',
          HttpStatus.CONFLICT,
        );
      }
    }

    await this.expireStale(businessId);

    const pending = await this.prisma.businessInvitation.findFirst({
      where: {
        businessId,
        mobile,
        status: PrismaInvitationStatus.pending,
      },
    });
    if (pending) {
      throw new DomainException(
        TenancyErrorCodes.InvitationDuplicate,
        'A pending invitation already exists for this mobile',
        HttpStatus.CONFLICT,
      );
    }

    const token = randomBytes(24).toString('base64url');
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
    const row = await this.prisma.businessInvitation.create({
      data: {
        businessId,
        mobile,
        role: role as PrismaMembershipRole,
        token,
        invitedByUserId: actorUserId,
        expiresAt,
        status: PrismaInvitationStatus.pending,
      },
    });

    await this.audit.log({
      action: AuditActions.MembershipInvite,
      entityType: 'invitation',
      entityId: row.id,
      businessId,
      userId: actorUserId,
      meta: { mobile, role },
    });

    return this.toPublicInvitation(row, { includeToken: true });
  }

  async revokeInvitation(
    actorUserId: string,
    businessId: string,
    invitationId: string,
  ): Promise<void> {
    await this.tenancy.assertAdmin(actorUserId, businessId);
    const row = await this.prisma.businessInvitation.findFirst({
      where: { id: invitationId, businessId },
    });
    if (!row) {
      throw new DomainException(
        TenancyErrorCodes.InvitationNotFound,
        'Invitation not found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (row.status !== PrismaInvitationStatus.pending) {
      throw new DomainException(
        TenancyErrorCodes.InvitationRevoked,
        'Invitation is not pending',
        HttpStatus.CONFLICT,
      );
    }
    await this.prisma.businessInvitation.update({
      where: { id: row.id },
      data: { status: PrismaInvitationStatus.revoked },
    });
  }

  async previewInvitation(token: string): Promise<PublicInvitationPreview> {
    const row = await this.loadInvitationByToken(token);
    return {
      token: row.token,
      businessId: row.businessId,
      businessName: row.business.name,
      role: row.role as InvitableMembershipRole,
      mobile: row.mobile,
      status: row.status,
      expiresAt: row.expiresAt.toISOString(),
    };
  }

  async listPendingForUser(
    userId: string,
    mobile: string,
  ): Promise<PublicInvitationPreview[]> {
    await this.expireStaleForMobile(mobile);
    const rows = await this.prisma.businessInvitation.findMany({
      where: {
        mobile,
        status: PrismaInvitationStatus.pending,
        expiresAt: { gt: new Date() },
      },
      include: { business: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows
      .filter((row) => !row.business.deletedAt)
      .map((row) => ({
        token: row.token,
        businessId: row.businessId,
        businessName: row.business.name,
        role: row.role as InvitableMembershipRole,
        mobile: row.mobile,
        status: row.status,
        expiresAt: row.expiresAt.toISOString(),
      }));
  }

  async acceptInvitation(
    userId: string,
    mobile: string,
    token: string,
  ): Promise<PublicBusinessMember> {
    const row = await this.loadInvitationByToken(token);
    if (row.status === PrismaInvitationStatus.revoked) {
      throw new DomainException(
        TenancyErrorCodes.InvitationRevoked,
        'Invitation was revoked',
        HttpStatus.CONFLICT,
      );
    }
    if (
      row.status === PrismaInvitationStatus.expired ||
      row.expiresAt.getTime() <= Date.now()
    ) {
      if (row.status === PrismaInvitationStatus.pending) {
        await this.prisma.businessInvitation.update({
          where: { id: row.id },
          data: { status: PrismaInvitationStatus.expired },
        });
      }
      throw new DomainException(
        TenancyErrorCodes.InvitationExpired,
        'Invitation expired',
        HttpStatus.GONE,
      );
    }
    if (row.status !== PrismaInvitationStatus.pending) {
      throw new DomainException(
        TenancyErrorCodes.InvitationNotFound,
        'Invitation is not pending',
        HttpStatus.CONFLICT,
      );
    }
    if (row.mobile !== mobile) {
      throw new DomainException(
        TenancyErrorCodes.InvitationMobileMismatch,
        'Signed-in mobile does not match invitation',
        HttpStatus.FORBIDDEN,
      );
    }

    const existing = await this.prisma.businessMembership.findUnique({
      where: { businessId_userId: { businessId: row.businessId, userId } },
      include: { user: true },
    });
    if (existing) {
      await this.prisma.businessInvitation.update({
        where: { id: row.id },
        data: {
          status: PrismaInvitationStatus.accepted,
          acceptedAt: new Date(),
        },
      });
      return {
        userId: existing.userId,
        mobile: existing.user.mobile,
        role: existing.role as MembershipRole,
        createdAt: existing.createdAt.toISOString(),
        updatedAt: existing.updatedAt.toISOString(),
      };
    }

    const membership = await this.prisma.$transaction(async (tx) => {
      const created = await tx.businessMembership.create({
        data: {
          businessId: row.businessId,
          userId,
          role: row.role,
        },
        include: { user: true },
      });
      await tx.businessInvitation.update({
        where: { id: row.id },
        data: {
          status: PrismaInvitationStatus.accepted,
          acceptedAt: new Date(),
        },
      });
      return created;
    });

    await this.audit.log({
      action: AuditActions.MembershipAccept,
      entityType: 'membership',
      entityId: membership.id,
      businessId: row.businessId,
      userId,
      meta: { invitationId: row.id, role: row.role },
    });

    return {
      userId: membership.userId,
      mobile: membership.user.mobile,
      role: membership.role as MembershipRole,
      createdAt: membership.createdAt.toISOString(),
      updatedAt: membership.updatedAt.toISOString(),
    };
  }

  private assertCanManageMembers(role: MembershipRole | string): void {
    if (!membershipCanManageMembers(role)) {
      throw new DomainException(
        TenancyErrorCodes.BusinessForbidden,
        'Admin or owner role required to manage members',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private isInvitableRole(role: MembershipRole): role is InvitableMembershipRole {
    return (INVITABLE_MEMBERSHIP_ROLES as readonly string[]).includes(role);
  }

  private async loadInvitationByToken(token: string) {
    const trimmed = token.trim();
    if (!trimmed) {
      throw new DomainException(
        TenancyErrorCodes.InvitationNotFound,
        'Invitation not found',
        HttpStatus.NOT_FOUND,
      );
    }
    const row = await this.prisma.businessInvitation.findUnique({
      where: { token: trimmed },
      include: { business: true },
    });
    if (!row || row.business.deletedAt) {
      throw new DomainException(
        TenancyErrorCodes.InvitationNotFound,
        'Invitation not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return row;
  }

  private async expireStale(businessId: string): Promise<void> {
    await this.prisma.businessInvitation.updateMany({
      where: {
        businessId,
        status: PrismaInvitationStatus.pending,
        expiresAt: { lte: new Date() },
      },
      data: { status: PrismaInvitationStatus.expired },
    });
  }

  private async expireStaleForMobile(mobile: string): Promise<void> {
    await this.prisma.businessInvitation.updateMany({
      where: {
        mobile,
        status: PrismaInvitationStatus.pending,
        expiresAt: { lte: new Date() },
      },
      data: { status: PrismaInvitationStatus.expired },
    });
  }

  private toPublicInvitation(
    row: {
      id: string;
      businessId: string;
      mobile: string;
      role: PrismaMembershipRole;
      status: PrismaInvitationStatus;
      expiresAt: Date;
      createdAt: Date;
      token: string;
    },
    opts?: { includeToken?: boolean },
  ): PublicBusinessInvitation {
    const base: PublicBusinessInvitation = {
      id: row.id,
      businessId: row.businessId,
      mobile: row.mobile,
      role: row.role as InvitableMembershipRole,
      status: row.status as typeof InvitationStatus.Pending,
      expiresAt: row.expiresAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    };
    if (opts?.includeToken) {
      base.token = row.token;
      base.acceptPath = `/invite/${row.token}`;
    }
    return base;
  }
}
