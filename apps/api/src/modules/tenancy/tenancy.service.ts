import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { MembershipRole } from '@prisma/client';
import {
  MembershipRole as PublicMembershipRole,
  TenancyErrorCodes,
  type PublicBusiness,
} from '@vdb/shared-types';
import { DomainException } from '../../common/errors/domain.exception';
import { PrismaService } from '../../config/prisma/prisma.service';
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

    return this.toPublic(created.business, created.membership.role);
  }

  async getForUser(userId: string, businessId: string): Promise<PublicBusiness> {
    const membership = await this.requireMembership(userId, businessId);
    return this.toPublic(membership.business, membership.role);
  }

  async updateForOwner(
    userId: string,
    businessId: string,
    name: string,
  ): Promise<PublicBusiness> {
    const membership = await this.requireMembership(userId, businessId);
    if (membership.role !== MembershipRole.OWNER) {
      throw new DomainException(
        TenancyErrorCodes.BusinessForbidden,
        'Only the owner can update this business',
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
  }

  async assertMembership(userId: string, businessId: string): Promise<void> {
    await this.requireMembership(userId, businessId);
  }

  private async requireMembership(userId: string, businessId: string) {
    const membership = await this.prisma.businessMembership.findUnique({
      where: {
        businessId_userId: { businessId, userId },
      },
      include: { business: true },
    });

    if (!membership || membership.business.deletedAt) {
      // Same error for missing vs non-member to reduce IDOR leakage.
      throw new DomainException(
        TenancyErrorCodes.BusinessNotFound,
        'Business not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return membership;
  }

  private toPublic(
    business: { id: string; name: string; createdAt: Date; updatedAt: Date },
    role: MembershipRole,
  ): PublicBusiness {
    return {
      id: business.id,
      name: business.name,
      role: role as unknown as PublicMembershipRole,
      createdAt: business.createdAt.toISOString(),
      updatedAt: business.updatedAt.toISOString(),
    };
  }
}
