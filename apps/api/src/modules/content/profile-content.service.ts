import { HttpStatus, Injectable } from '@nestjs/common';
import {
  Prisma,
  type BusinessService,
  type Certificate,
  type Client,
} from '@prisma/client';
import {
  ProfileContentErrorCodes,
  type PublicBusinessService,
  type PublicBusinessServiceList,
  type PublicCertificate,
  type PublicCertificateList,
  type PublicClient,
  type PublicClientList,
} from '@vdb/shared-types';
import { DomainException } from '../../common/errors/domain.exception';
import { PrismaService } from '../../config/prisma/prisma.service';

const MAX_FIELDS_KEYS = 40;
const MAX_FIELD_STRING = 4000;
const MAX_DESCRIPTION = 4000;

@Injectable()
export class ProfileContentService {
  constructor(private readonly prisma: PrismaService) {}

  async listServices(input: {
    businessId: string;
    page: number;
    pageSize: number;
    q?: string;
  }): Promise<PublicBusinessServiceList> {
    const page = Math.max(1, input.page);
    const pageSize = Math.min(100, Math.max(1, input.pageSize));
    const where: Prisma.BusinessServiceWhereInput = {
      businessId: input.businessId,
      deletedAt: null,
    };
    const q = input.q?.trim();
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }
    const [rows, total] = await Promise.all([
      this.prisma.businessService.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.businessService.count({ where }),
    ]);
    return {
      items: rows.map((r) => this.toPublicService(r)),
      page,
      pageSize,
      total,
    };
  }

  async getService(
    businessId: string,
    serviceId: string,
  ): Promise<PublicBusinessService> {
    return this.toPublicService(await this.requireService(businessId, serviceId));
  }

  async createService(input: {
    businessId: string;
    name: string;
    description?: string;
    iconMediaId?: string | null;
    sortOrder?: number;
    fields?: Record<string, unknown>;
  }): Promise<PublicBusinessService> {
    const name = this.requireName(input.name);
    const iconMediaId = await this.resolveOptionalMedia(
      input.businessId,
      input.iconMediaId,
    );
    const row = await this.prisma.businessService.create({
      data: {
        businessId: input.businessId,
        name,
        description: (input.description ?? '').trim().slice(0, MAX_DESCRIPTION),
        iconMediaId,
        sortOrder: input.sortOrder ?? 0,
        fields: this.normalizeFields(input.fields ?? {}) as Prisma.InputJsonValue,
      },
    });
    return this.toPublicService(row);
  }

  async updateService(input: {
    businessId: string;
    serviceId: string;
    name?: string;
    description?: string;
    iconMediaId?: string | null;
    sortOrder?: number;
    fields?: Record<string, unknown>;
  }): Promise<PublicBusinessService> {
    await this.requireService(input.businessId, input.serviceId);
    const data: Prisma.BusinessServiceUpdateInput = {};
    if (input.name !== undefined) data.name = this.requireName(input.name);
    if (input.description !== undefined) {
      data.description = input.description.trim().slice(0, MAX_DESCRIPTION);
    }
    if (input.iconMediaId !== undefined) {
      data.iconMediaId = await this.resolveOptionalMedia(
        input.businessId,
        input.iconMediaId,
      );
    }
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
    if (input.fields !== undefined) {
      data.fields = this.normalizeFields(
        input.fields,
      ) as Prisma.InputJsonValue;
    }
    const row = await this.prisma.businessService.update({
      where: { id: input.serviceId },
      data,
    });
    return this.toPublicService(row);
  }

  async softDeleteService(businessId: string, serviceId: string): Promise<void> {
    await this.requireService(businessId, serviceId);
    await this.prisma.businessService.update({
      where: { id: serviceId },
      data: { deletedAt: new Date() },
    });
  }

  async listClients(input: {
    businessId: string;
    page: number;
    pageSize: number;
    q?: string;
  }): Promise<PublicClientList> {
    const page = Math.max(1, input.page);
    const pageSize = Math.min(100, Math.max(1, input.pageSize));
    const where: Prisma.ClientWhereInput = {
      businessId: input.businessId,
      deletedAt: null,
    };
    const q = input.q?.trim();
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { website: { contains: q, mode: 'insensitive' } },
      ];
    }
    const [rows, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.client.count({ where }),
    ]);
    return {
      items: rows.map((r) => this.toPublicClient(r)),
      page,
      pageSize,
      total,
    };
  }

  async getClient(businessId: string, clientId: string): Promise<PublicClient> {
    return this.toPublicClient(await this.requireClient(businessId, clientId));
  }

  async createClient(input: {
    businessId: string;
    name: string;
    website?: string;
    logoMediaId?: string | null;
    sortOrder?: number;
    fields?: Record<string, unknown>;
  }): Promise<PublicClient> {
    const name = this.requireName(input.name);
    const logoMediaId = await this.resolveOptionalMedia(
      input.businessId,
      input.logoMediaId,
    );
    const row = await this.prisma.client.create({
      data: {
        businessId: input.businessId,
        name,
        website: (input.website ?? '').trim().slice(0, 400),
        logoMediaId,
        sortOrder: input.sortOrder ?? 0,
        fields: this.normalizeFields(input.fields ?? {}) as Prisma.InputJsonValue,
      },
    });
    return this.toPublicClient(row);
  }

  async updateClient(input: {
    businessId: string;
    clientId: string;
    name?: string;
    website?: string;
    logoMediaId?: string | null;
    sortOrder?: number;
    fields?: Record<string, unknown>;
  }): Promise<PublicClient> {
    await this.requireClient(input.businessId, input.clientId);
    const data: Prisma.ClientUpdateInput = {};
    if (input.name !== undefined) data.name = this.requireName(input.name);
    if (input.website !== undefined) {
      data.website = input.website.trim().slice(0, 400);
    }
    if (input.logoMediaId !== undefined) {
      data.logoMediaId = await this.resolveOptionalMedia(
        input.businessId,
        input.logoMediaId,
      );
    }
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
    if (input.fields !== undefined) {
      data.fields = this.normalizeFields(
        input.fields,
      ) as Prisma.InputJsonValue;
    }
    const row = await this.prisma.client.update({
      where: { id: input.clientId },
      data,
    });
    return this.toPublicClient(row);
  }

  async softDeleteClient(businessId: string, clientId: string): Promise<void> {
    await this.requireClient(businessId, clientId);
    await this.prisma.client.update({
      where: { id: clientId },
      data: { deletedAt: new Date() },
    });
  }

  async listCertificates(input: {
    businessId: string;
    page: number;
    pageSize: number;
    q?: string;
  }): Promise<PublicCertificateList> {
    const page = Math.max(1, input.page);
    const pageSize = Math.min(100, Math.max(1, input.pageSize));
    const where: Prisma.CertificateWhereInput = {
      businessId: input.businessId,
      deletedAt: null,
    };
    const q = input.q?.trim();
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { issuer: { contains: q, mode: 'insensitive' } },
      ];
    }
    const [rows, total] = await Promise.all([
      this.prisma.certificate.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.certificate.count({ where }),
    ]);
    return {
      items: rows.map((r) => this.toPublicCertificate(r)),
      page,
      pageSize,
      total,
    };
  }

  async getCertificate(
    businessId: string,
    certificateId: string,
  ): Promise<PublicCertificate> {
    return this.toPublicCertificate(
      await this.requireCertificate(businessId, certificateId),
    );
  }

  async createCertificate(input: {
    businessId: string;
    name: string;
    issuer?: string;
    issuedAt?: string | null;
    expiresAt?: string | null;
    documentMediaId?: string | null;
    sortOrder?: number;
    fields?: Record<string, unknown>;
  }): Promise<PublicCertificate> {
    const name = this.requireName(input.name);
    const documentMediaId = await this.resolveOptionalMedia(
      input.businessId,
      input.documentMediaId,
    );
    const issuedAt = this.parseOptionalDate(input.issuedAt);
    const expiresAt = this.parseOptionalDate(input.expiresAt);
    this.assertDateOrder(issuedAt, expiresAt);
    const row = await this.prisma.certificate.create({
      data: {
        businessId: input.businessId,
        name,
        issuer: (input.issuer ?? '').trim().slice(0, 200),
        issuedAt,
        expiresAt,
        documentMediaId,
        sortOrder: input.sortOrder ?? 0,
        fields: this.normalizeFields(input.fields ?? {}) as Prisma.InputJsonValue,
      },
    });
    return this.toPublicCertificate(row);
  }

  async updateCertificate(input: {
    businessId: string;
    certificateId: string;
    name?: string;
    issuer?: string;
    issuedAt?: string | null;
    expiresAt?: string | null;
    documentMediaId?: string | null;
    sortOrder?: number;
    fields?: Record<string, unknown>;
  }): Promise<PublicCertificate> {
    const existing = await this.requireCertificate(
      input.businessId,
      input.certificateId,
    );
    const data: Prisma.CertificateUpdateInput = {};
    if (input.name !== undefined) data.name = this.requireName(input.name);
    if (input.issuer !== undefined) {
      data.issuer = input.issuer.trim().slice(0, 200);
    }
    let issuedAt = existing.issuedAt;
    let expiresAt = existing.expiresAt;
    if (input.issuedAt !== undefined) {
      issuedAt = this.parseOptionalDate(input.issuedAt);
      data.issuedAt = issuedAt;
    }
    if (input.expiresAt !== undefined) {
      expiresAt = this.parseOptionalDate(input.expiresAt);
      data.expiresAt = expiresAt;
    }
    this.assertDateOrder(issuedAt, expiresAt);
    if (input.documentMediaId !== undefined) {
      data.documentMediaId = await this.resolveOptionalMedia(
        input.businessId,
        input.documentMediaId,
      );
    }
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
    if (input.fields !== undefined) {
      data.fields = this.normalizeFields(
        input.fields,
      ) as Prisma.InputJsonValue;
    }
    const row = await this.prisma.certificate.update({
      where: { id: input.certificateId },
      data,
    });
    return this.toPublicCertificate(row);
  }

  async softDeleteCertificate(
    businessId: string,
    certificateId: string,
  ): Promise<void> {
    await this.requireCertificate(businessId, certificateId);
    await this.prisma.certificate.update({
      where: { id: certificateId },
      data: { deletedAt: new Date() },
    });
  }

  private requireName(raw: string): string {
    const name = raw.trim();
    if (name.length < 1 || name.length > 160) {
      throw new DomainException(
        ProfileContentErrorCodes.InvalidName,
        'Name is invalid',
        HttpStatus.BAD_REQUEST,
      );
    }
    return name;
  }

  private parseOptionalDate(value: string | null | undefined): Date | null {
    if (value === undefined || value === null || value === '') return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      throw new DomainException(
        ProfileContentErrorCodes.InvalidDate,
        'Invalid date',
        HttpStatus.BAD_REQUEST,
      );
    }
    return d;
  }

  private assertDateOrder(issuedAt: Date | null, expiresAt: Date | null): void {
    if (issuedAt && expiresAt && expiresAt.getTime() < issuedAt.getTime()) {
      throw new DomainException(
        ProfileContentErrorCodes.InvalidDate,
        'expiresAt must be on or after issuedAt',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async requireService(businessId: string, serviceId: string) {
    const row = await this.prisma.businessService.findFirst({
      where: { id: serviceId, businessId, deletedAt: null },
    });
    if (!row) {
      throw new DomainException(
        ProfileContentErrorCodes.ServiceNotFound,
        'Service not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return row;
  }

  private async requireClient(businessId: string, clientId: string) {
    const row = await this.prisma.client.findFirst({
      where: { id: clientId, businessId, deletedAt: null },
    });
    if (!row) {
      throw new DomainException(
        ProfileContentErrorCodes.ClientNotFound,
        'Client not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return row;
  }

  private async requireCertificate(businessId: string, certificateId: string) {
    const row = await this.prisma.certificate.findFirst({
      where: { id: certificateId, businessId, deletedAt: null },
    });
    if (!row) {
      throw new DomainException(
        ProfileContentErrorCodes.CertificateNotFound,
        'Certificate not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return row;
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
        ProfileContentErrorCodes.MediaNotFound,
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
        ProfileContentErrorCodes.InvalidFields,
        'fields must be an object',
        HttpStatus.BAD_REQUEST,
      );
    }
    const keys = Object.keys(fields);
    if (keys.length > MAX_FIELDS_KEYS) {
      throw new DomainException(
        ProfileContentErrorCodes.InvalidFields,
        'Too many field keys',
        HttpStatus.BAD_REQUEST,
      );
    }
    const out: Record<string, unknown> = {};
    for (const key of keys) {
      if (!/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(key)) {
        throw new DomainException(
          ProfileContentErrorCodes.InvalidFields,
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
          ProfileContentErrorCodes.InvalidFields,
          `Unsupported field type for ${key}`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    return out;
  }

  private fieldsOf(row: { fields: Prisma.JsonValue }): Record<string, unknown> {
    return row.fields &&
      typeof row.fields === 'object' &&
      !Array.isArray(row.fields)
      ? (row.fields as Record<string, unknown>)
      : {};
  }

  private toPublicService(row: BusinessService): PublicBusinessService {
    return {
      id: row.id,
      businessId: row.businessId,
      name: row.name,
      description: row.description,
      iconMediaId: row.iconMediaId,
      sortOrder: row.sortOrder,
      fields: this.fieldsOf(row),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toPublicClient(row: Client): PublicClient {
    return {
      id: row.id,
      businessId: row.businessId,
      name: row.name,
      website: row.website,
      logoMediaId: row.logoMediaId,
      sortOrder: row.sortOrder,
      fields: this.fieldsOf(row),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toPublicCertificate(row: Certificate): PublicCertificate {
    return {
      id: row.id,
      businessId: row.businessId,
      name: row.name,
      issuer: row.issuer,
      issuedAt: row.issuedAt?.toISOString() ?? null,
      expiresAt: row.expiresAt?.toISOString() ?? null,
      documentMediaId: row.documentMediaId,
      sortOrder: row.sortOrder,
      fields: this.fieldsOf(row),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
