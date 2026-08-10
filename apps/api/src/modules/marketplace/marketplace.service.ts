import { HttpStatus, Injectable } from '@nestjs/common';
import {
  createTemplateBodyFromMarketplace,
  documentCollectRequiredModuleCodes,
} from '@vdb/document-schema';
import {
  EntitlementCodes,
  MarketplaceErrorCodes,
  type PublicDocumentTemplateDetail,
  type PublicMarketplaceInstallResult,
  type PublicMarketplaceTemplate,
  type PublicMarketplaceTemplateDetail,
  type PublicMarketplaceTemplateList,
} from '@vdb/shared-types';
import { DomainException } from '../../common/errors/domain.exception';
import { EditionService } from '../../config/edition/edition.service';
import { PrismaService } from '../../config/prisma/prisma.service';
import { EntitlementsService } from '../billing/entitlements.service';
import { TemplateBodyRepository } from '../design/template-body.repository';

@Injectable()
export class MarketplaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly edition: EditionService,
    private readonly entitlements: EntitlementsService,
    private readonly bodies: TemplateBodyRepository,
  ) {}

  assertSaasEdition(): void {
    if (!this.edition.isSaas()) {
      throw new DomainException(
        MarketplaceErrorCodes.EditionRequired,
        'Template marketplace is available on SAAS only',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  async assertMarketplaceEntitlement(businessId: string): Promise<void> {
    const ents = await this.entitlements.getForBusiness(businessId);
    if (!ents.codes.includes(EntitlementCodes.MarketplaceTemplates)) {
      throw new DomainException(
        'ENTITLEMENT_MODULE_REQUIRED',
        'marketplace.templates required',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  async list(input: {
    page: number;
    pageSize: number;
    q?: string;
    locale?: string;
  }): Promise<PublicMarketplaceTemplateList> {
    this.assertSaasEdition();
    const page = Math.max(1, input.page);
    const pageSize = Math.min(50, Math.max(1, input.pageSize));
    const q = input.q?.trim();
    const locale = input.locale?.trim();
    const where = {
      isActive: true,
      ...(locale ? { locale } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' as const } },
              { slug: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.marketplaceTemplate.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.marketplaceTemplate.count({ where }),
    ]);
    return {
      items: rows.map((r) => this.toPublicMeta(r)),
      page,
      pageSize,
      total,
    };
  }

  async get(id: string): Promise<PublicMarketplaceTemplateDetail> {
    this.assertSaasEdition();
    const row = await this.prisma.marketplaceTemplate.findFirst({
      where: { id, isActive: true },
    });
    if (!row) {
      throw new DomainException(
        MarketplaceErrorCodes.NotFound,
        'Marketplace template not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return { ...this.toPublicMeta(row), body: row.body };
  }

  async install(input: {
    businessId: string;
    marketplaceTemplateId: string;
  }): Promise<PublicMarketplaceInstallResult> {
    this.assertSaasEdition();
    await this.assertMarketplaceEntitlement(input.businessId);

    const listing = await this.prisma.marketplaceTemplate.findFirst({
      where: { id: input.marketplaceTemplateId, isActive: true },
    });
    if (!listing) {
      throw new DomainException(
        MarketplaceErrorCodes.NotFound,
        'Marketplace template not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const sourceBody = {
      ...(listing.body as Record<string, unknown>),
      businessId: '_marketplace',
      templateId: listing.id,
    };

    let preview;
    try {
      preview = createTemplateBodyFromMarketplace({
        businessId: input.businessId,
        templateId: 'preview',
        marketplaceBody: sourceBody,
      });
    } catch {
      throw new DomainException(
        MarketplaceErrorCodes.InvalidBody,
        'Marketplace template body failed validation',
        HttpStatus.BAD_REQUEST,
      );
    }

    const ents = await this.entitlements.getForBusiness(input.businessId);
    for (const code of documentCollectRequiredModuleCodes(preview)) {
      if (!ents.codes.includes(code)) {
        throw new DomainException(
          'ENTITLEMENT_MODULE_REQUIRED',
          `Module ${code} required by marketplace template`,
          HttpStatus.FORBIDDEN,
        );
      }
    }

    const row = await this.prisma.documentTemplate.create({
      data: {
        businessId: input.businessId,
        name: listing.name,
        description: listing.description,
        themeId: null,
      },
    });

    const body = createTemplateBodyFromMarketplace({
      businessId: input.businessId,
      templateId: row.id,
      marketplaceBody: sourceBody,
    });

    try {
      await this.bodies.upsert(body);
    } catch (err) {
      await this.prisma.documentTemplate.delete({ where: { id: row.id } });
      throw new DomainException(
        MarketplaceErrorCodes.InstallFailed,
        err instanceof Error ? err.message : 'Install storage failed',
        HttpStatus.BAD_GATEWAY,
      );
    }

    const detail: PublicDocumentTemplateDetail = {
      id: row.id,
      businessId: row.businessId,
      themeId: row.themeId,
      name: row.name,
      description: row.description,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      body,
    };

    return {
      template: detail,
      marketplaceTemplateId: listing.id,
    };
  }

  private toPublicMeta(row: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    locale: string;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  }): PublicMarketplaceTemplate {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      locale: row.locale,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
