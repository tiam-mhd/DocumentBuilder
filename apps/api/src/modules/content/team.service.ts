import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, type Branch, type TeamMember } from '@prisma/client';
import {
  asEntityTranslations,
  TeamErrorCodes,
  type PublicBranch,
  type PublicBranchList,
  type PublicTeamMember,
  type PublicTeamMemberList,
} from '@vdb/shared-types';
import {
  parseTranslationsInput,
  translationsToJson,
} from '../../common/content-locale';
import { DomainException } from '../../common/errors/domain.exception';
import { PrismaService } from '../../config/prisma/prisma.service';
import { LocationService } from './location.service';

const MEMBER_TRANSLATION_FIELDS = ['name', 'roleTitle', 'department'] as const;
const BRANCH_TRANSLATION_FIELDS = [
  'name',
  'addressLine1',
  'addressLine2',
  'city',
  'province',
  'country',
] as const;

const MAX_FIELDS_KEYS = 40;
const MAX_FIELD_STRING = 4000;

@Injectable()
export class TeamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly locations: LocationService,
  ) {}

  async listMembers(input: {
    businessId: string;
    page: number;
    pageSize: number;
    q?: string;
    branchId?: string;
  }): Promise<PublicTeamMemberList> {
    const page = Math.max(1, input.page);
    const pageSize = Math.min(100, Math.max(1, input.pageSize));
    const where: Prisma.TeamMemberWhereInput = {
      businessId: input.businessId,
      deletedAt: null,
    };
    if (input.branchId) where.branchId = input.branchId;
    const q = input.q?.trim();
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { roleTitle: { contains: q, mode: 'insensitive' } },
        { department: { contains: q, mode: 'insensitive' } },
      ];
    }
    const [rows, total] = await Promise.all([
      this.prisma.teamMember.findMany({
        where,
        include: { branch: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.teamMember.count({ where }),
    ]);
    return {
      items: rows.map((r) => this.toPublicMember(r)),
      page,
      pageSize,
      total,
    };
  }

  async getMember(
    businessId: string,
    memberId: string,
  ): Promise<PublicTeamMember> {
    return this.toPublicMember(await this.requireMember(businessId, memberId));
  }

  async createMember(input: {
    businessId: string;
    name: string;
    roleTitle?: string;
    department?: string;
    photoMediaId?: string | null;
    branchId?: string | null;
    parentMemberId?: string | null;
    sortOrder?: number;
    fields?: Record<string, unknown>;
    translations?: Record<string, unknown>;
  }): Promise<PublicTeamMember> {
    const name = input.name.trim();
    if (name.length < 1 || name.length > 160) {
      throw new DomainException(
        TeamErrorCodes.InvalidName,
        'Team member name is invalid',
        HttpStatus.BAD_REQUEST,
      );
    }
    const branchId = await this.resolveBranchId(
      input.businessId,
      input.branchId,
    );
    const photoMediaId = await this.resolveOptionalMedia(
      input.businessId,
      input.photoMediaId,
    );
    const parentMemberId = await this.resolveParentId(
      input.businessId,
      null,
      input.parentMemberId,
    );
    const row = await this.prisma.teamMember.create({
      data: {
        businessId: input.businessId,
        name,
        roleTitle: (input.roleTitle ?? '').trim().slice(0, 160),
        department: (input.department ?? '').trim().slice(0, 160),
        photoMediaId,
        branchId,
        parentMemberId,
        sortOrder: input.sortOrder ?? 0,
        fields: this.normalizeFields(input.fields ?? {}) as Prisma.InputJsonValue,
        translations: translationsToJson(
          parseTranslationsInput(
            input.translations,
            MEMBER_TRANSLATION_FIELDS,
          ),
        ),
      },
      include: { branch: true },
    });
    return this.toPublicMember(row);
  }

  async updateMember(input: {
    businessId: string;
    memberId: string;
    name?: string;
    roleTitle?: string;
    department?: string;
    photoMediaId?: string | null;
    branchId?: string | null;
    parentMemberId?: string | null;
    sortOrder?: number;
    fields?: Record<string, unknown>;
    translations?: Record<string, unknown>;
  }): Promise<PublicTeamMember> {
    await this.requireMember(input.businessId, input.memberId);
    const data: Prisma.TeamMemberUpdateInput = {};
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (name.length < 1 || name.length > 160) {
        throw new DomainException(
          TeamErrorCodes.InvalidName,
          'Team member name is invalid',
          HttpStatus.BAD_REQUEST,
        );
      }
      data.name = name;
    }
    if (input.roleTitle !== undefined) {
      data.roleTitle = input.roleTitle.trim().slice(0, 160);
    }
    if (input.department !== undefined) {
      data.department = input.department.trim().slice(0, 160);
    }
    if (input.photoMediaId !== undefined) {
      data.photoMediaId = await this.resolveOptionalMedia(
        input.businessId,
        input.photoMediaId,
      );
    }
    if (input.branchId !== undefined) {
      const resolved = await this.resolveBranchId(
        input.businessId,
        input.branchId,
      );
      data.branch = resolved
        ? { connect: { id: resolved } }
        : { disconnect: true };
    }
    if (input.parentMemberId !== undefined) {
      const resolved = await this.resolveParentId(
        input.businessId,
        input.memberId,
        input.parentMemberId,
      );
      data.parent = resolved
        ? { connect: { id: resolved } }
        : { disconnect: true };
    }
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
    if (input.fields !== undefined) {
      data.fields = this.normalizeFields(
        input.fields,
      ) as Prisma.InputJsonValue;
    }
    if (input.translations !== undefined) {
      data.translations = translationsToJson(
        parseTranslationsInput(
          input.translations,
          MEMBER_TRANSLATION_FIELDS,
        ),
      );
    }
    const row = await this.prisma.teamMember.update({
      where: { id: input.memberId },
      data,
      include: { branch: true },
    });
    return this.toPublicMember(row);
  }

  async softDeleteMember(businessId: string, memberId: string): Promise<void> {
    await this.requireMember(businessId, memberId);
    await this.prisma.$transaction([
      this.prisma.teamMember.updateMany({
        where: { businessId, parentMemberId: memberId, deletedAt: null },
        data: { parentMemberId: null },
      }),
      this.prisma.teamMember.update({
        where: { id: memberId },
        data: { deletedAt: new Date(), parentMemberId: null },
      }),
    ]);
  }

  async listBranches(input: {
    businessId: string;
    page: number;
    pageSize: number;
    q?: string;
  }): Promise<PublicBranchList> {
    const page = Math.max(1, input.page);
    const pageSize = Math.min(100, Math.max(1, input.pageSize));
    const where: Prisma.BranchWhereInput = {
      businessId: input.businessId,
      deletedAt: null,
    };
    const q = input.q?.trim();
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
        { province: { contains: q, mode: 'insensitive' } },
      ];
    }
    const [rows, total] = await Promise.all([
      this.prisma.branch.findMany({
        where,
        include: { location: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.branch.count({ where }),
    ]);
    return {
      items: rows.map((r) => this.toPublicBranch(r)),
      page,
      pageSize,
      total,
    };
  }

  async getBranch(businessId: string, branchId: string): Promise<PublicBranch> {
    return this.toPublicBranch(await this.requireBranch(businessId, branchId));
  }

  async createBranch(input: {
    businessId: string;
    name: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    country?: string;
    phone?: string;
    locationId?: string | null;
    sortOrder?: number;
    fields?: Record<string, unknown>;
    translations?: Record<string, unknown>;
  }): Promise<PublicBranch> {
    const name = input.name.trim();
    if (name.length < 1 || name.length > 160) {
      throw new DomainException(
        TeamErrorCodes.InvalidName,
        'Branch name is invalid',
        HttpStatus.BAD_REQUEST,
      );
    }
    const locationId = await this.locations.resolveOptionalId(
      input.businessId,
      input.locationId,
    );
    const row = await this.prisma.branch.create({
      data: {
        businessId: input.businessId,
        name,
        addressLine1: (input.addressLine1 ?? '').trim().slice(0, 240),
        addressLine2: (input.addressLine2 ?? '').trim().slice(0, 240),
        city: (input.city ?? '').trim().slice(0, 120),
        province: (input.province ?? '').trim().slice(0, 120),
        postalCode: (input.postalCode ?? '').trim().slice(0, 40),
        country: (input.country ?? '').trim().slice(0, 120),
        phone: (input.phone ?? '').trim().slice(0, 40),
        locationId,
        sortOrder: input.sortOrder ?? 0,
        fields: this.normalizeFields(input.fields ?? {}) as Prisma.InputJsonValue,
        translations: translationsToJson(
          parseTranslationsInput(
            input.translations,
            BRANCH_TRANSLATION_FIELDS,
          ),
        ),
      },
      include: { location: true },
    });
    return this.toPublicBranch(row);
  }

  async updateBranch(input: {
    businessId: string;
    branchId: string;
    name?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    country?: string;
    phone?: string;
    locationId?: string | null;
    sortOrder?: number;
    fields?: Record<string, unknown>;
    translations?: Record<string, unknown>;
  }): Promise<PublicBranch> {
    await this.requireBranch(input.businessId, input.branchId);
    const data: Prisma.BranchUpdateInput = {};
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (name.length < 1 || name.length > 160) {
        throw new DomainException(
          TeamErrorCodes.InvalidName,
          'Branch name is invalid',
          HttpStatus.BAD_REQUEST,
        );
      }
      data.name = name;
    }
    if (input.addressLine1 !== undefined) {
      data.addressLine1 = input.addressLine1.trim().slice(0, 240);
    }
    if (input.addressLine2 !== undefined) {
      data.addressLine2 = input.addressLine2.trim().slice(0, 240);
    }
    if (input.city !== undefined) data.city = input.city.trim().slice(0, 120);
    if (input.province !== undefined) {
      data.province = input.province.trim().slice(0, 120);
    }
    if (input.postalCode !== undefined) {
      data.postalCode = input.postalCode.trim().slice(0, 40);
    }
    if (input.country !== undefined) {
      data.country = input.country.trim().slice(0, 120);
    }
    if (input.phone !== undefined) data.phone = input.phone.trim().slice(0, 40);
    if (input.locationId !== undefined) {
      const resolved = await this.locations.resolveOptionalId(
        input.businessId,
        input.locationId,
      );
      data.location = resolved
        ? { connect: { id: resolved } }
        : { disconnect: true };
    }
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
    if (input.fields !== undefined) {
      data.fields = this.normalizeFields(
        input.fields,
      ) as Prisma.InputJsonValue;
    }
    if (input.translations !== undefined) {
      data.translations = translationsToJson(
        parseTranslationsInput(
          input.translations,
          BRANCH_TRANSLATION_FIELDS,
        ),
      );
    }
    const row = await this.prisma.branch.update({
      where: { id: input.branchId },
      data,
      include: { location: true },
    });
    return this.toPublicBranch(row);
  }

  async softDeleteBranch(businessId: string, branchId: string): Promise<void> {
    await this.requireBranch(businessId, branchId);
    const inUse = await this.prisma.teamMember.count({
      where: { businessId, branchId, deletedAt: null },
    });
    if (inUse > 0) {
      throw new DomainException(
        TeamErrorCodes.BranchInUse,
        'Branch still has team members',
        HttpStatus.CONFLICT,
      );
    }
    await this.prisma.branch.update({
      where: { id: branchId },
      data: { deletedAt: new Date() },
    });
  }

  private async requireMember(businessId: string, memberId: string) {
    const row = await this.prisma.teamMember.findFirst({
      where: { id: memberId, businessId, deletedAt: null },
      include: { branch: true },
    });
    if (!row) {
      throw new DomainException(
        TeamErrorCodes.MemberNotFound,
        'Team member not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return row;
  }

  private async requireBranch(businessId: string, branchId: string) {
    const row = await this.prisma.branch.findFirst({
      where: { id: branchId, businessId, deletedAt: null },
      include: { location: true },
    });
    if (!row) {
      throw new DomainException(
        TeamErrorCodes.BranchNotFound,
        'Branch not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return row;
  }

  private async resolveBranchId(
    businessId: string,
    branchId: string | null | undefined,
  ): Promise<string | null> {
    if (branchId === undefined || branchId === null || branchId === '') {
      return null;
    }
    await this.requireBranch(businessId, branchId);
    return branchId;
  }

  /**
   * Resolve parent for create/update. Rejects self-parent and cycles.
   * `memberId` is null on create (no cycle possible yet beyond parent existence).
   */
  private async resolveParentId(
    businessId: string,
    memberId: string | null,
    parentMemberId: string | null | undefined,
  ): Promise<string | null> {
    if (
      parentMemberId === undefined ||
      parentMemberId === null ||
      parentMemberId === ''
    ) {
      return null;
    }
    if (memberId && parentMemberId === memberId) {
      throw new DomainException(
        TeamErrorCodes.ParentCycle,
        'A member cannot report to themselves',
        HttpStatus.BAD_REQUEST,
      );
    }
    const parent = await this.prisma.teamMember.findFirst({
      where: { id: parentMemberId, businessId, deletedAt: null },
      select: { id: true, parentMemberId: true },
    });
    if (!parent) {
      throw new DomainException(
        TeamErrorCodes.InvalidParent,
        'Parent team member not found',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (memberId) {
      let cursor: string | null = parent.parentMemberId;
      const seen = new Set<string>([parent.id]);
      while (cursor) {
        if (cursor === memberId) {
          throw new DomainException(
            TeamErrorCodes.ParentCycle,
            'Parent assignment would create a cycle',
            HttpStatus.BAD_REQUEST,
          );
        }
        if (seen.has(cursor)) break;
        seen.add(cursor);
        const next = await this.prisma.teamMember.findFirst({
          where: { id: cursor, businessId, deletedAt: null },
          select: { parentMemberId: true },
        });
        cursor = next?.parentMemberId ?? null;
      }
    }
    return parentMemberId;
  }

  private async resolveOptionalMedia(
    businessId: string,
    mediaId: string | null | undefined,
  ): Promise<string | null> {
    if (mediaId === undefined || mediaId === null || mediaId === '') {
      return null;
    }
    const row = await this.prisma.mediaAsset.findFirst({
      where: { id: mediaId, businessId, deletedAt: null },
      select: { id: true },
    });
    if (!row) {
      throw new DomainException(
        TeamErrorCodes.MediaNotFound,
        'Media asset not found for this business',
        HttpStatus.BAD_REQUEST,
      );
    }
    return mediaId;
  }

  private normalizeFields(
    fields: Record<string, unknown>,
  ): Record<string, unknown> {
    if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
      throw new DomainException(
        TeamErrorCodes.InvalidFields,
        'fields must be an object',
        HttpStatus.BAD_REQUEST,
      );
    }
    const keys = Object.keys(fields);
    if (keys.length > MAX_FIELDS_KEYS) {
      throw new DomainException(
        TeamErrorCodes.InvalidFields,
        'Too many field keys',
        HttpStatus.BAD_REQUEST,
      );
    }
    const out: Record<string, unknown> = {};
    for (const key of keys) {
      if (!/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(key)) {
        throw new DomainException(
          TeamErrorCodes.InvalidFields,
          `Invalid field key: ${key}`,
          HttpStatus.BAD_REQUEST,
        );
      }
      const value = fields[key];
      if (
        value === null ||
        typeof value === 'boolean' ||
        typeof value === 'number'
      ) {
        out[key] = value;
      } else if (typeof value === 'string') {
        out[key] = value.slice(0, MAX_FIELD_STRING);
      } else {
        throw new DomainException(
          TeamErrorCodes.InvalidFields,
          `Unsupported field type for ${key}`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    return out;
  }

  private toPublicMember(
    row: TeamMember & { branch?: Branch | null },
  ): PublicTeamMember {
    return {
      id: row.id,
      businessId: row.businessId,
      branchId: row.branchId,
      branchName: row.branch?.name ?? null,
      parentMemberId: row.parentMemberId,
      name: row.name,
      roleTitle: row.roleTitle,
      department: row.department,
      translations: asEntityTranslations(row.translations),
      photoMediaId: row.photoMediaId,
      sortOrder: row.sortOrder,
      fields:
        row.fields &&
        typeof row.fields === 'object' &&
        !Array.isArray(row.fields)
          ? (row.fields as Record<string, unknown>)
          : {},
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toPublicBranch(
    row: Branch & { location?: { name: string } | null },
  ): PublicBranch {
    return {
      id: row.id,
      businessId: row.businessId,
      name: row.name,
      addressLine1: row.addressLine1,
      addressLine2: row.addressLine2,
      city: row.city,
      province: row.province,
      postalCode: row.postalCode,
      country: row.country,
      phone: row.phone,
      translations: asEntityTranslations(row.translations),
      locationId: row.locationId,
      locationName: row.location?.name ?? null,
      sortOrder: row.sortOrder,
      fields:
        row.fields &&
        typeof row.fields === 'object' &&
        !Array.isArray(row.fields)
          ? (row.fields as Record<string, unknown>)
          : {},
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
