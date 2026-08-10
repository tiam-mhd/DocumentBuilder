import { HttpStatus, Injectable } from '@nestjs/common';
import {
  AuditActions,
  DOCUMENT_EXPORT_ALLOWED_STATUSES,
  DocumentErrorCodes,
  contentLocaleDir,
  parseContentLocale,
  type PublicDocumentWebPublish,
  type PublicWebDocumentView,
} from '@vdb/shared-types';
import { DomainException } from '../../common/errors/domain.exception';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { BrandingService } from '../branding/branding.service';
import { ExportService } from '../export/export.service';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

@Injectable()
export class DocumentWebPublishService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exportService: ExportService,
    private readonly branding: BrandingService,
    private readonly audit: AuditService,
  ) {}

  async getSettings(
    businessId: string,
    documentId: string,
  ): Promise<PublicDocumentWebPublish> {
    const row = await this.requireDoc(businessId, documentId);
    return this.toSettings(row);
  }

  async updateSettings(input: {
    businessId: string;
    documentId: string;
    userId: string;
    webSlug?: string | null;
    webPublished?: boolean;
  }): Promise<PublicDocumentWebPublish> {
    const row = await this.requireDoc(input.businessId, input.documentId);

    let webSlug = row.webSlug;
    if (input.webSlug !== undefined) {
      if (input.webSlug === null || input.webSlug.trim() === '') {
        if (input.webPublished === true || row.webPublished) {
          throw new DomainException(
            DocumentErrorCodes.WebSlugInvalid,
            'Slug is required while web published',
            HttpStatus.BAD_REQUEST,
          );
        }
        webSlug = null;
      } else {
        webSlug = this.normalizeSlug(input.webSlug);
        const taken = await this.prisma.document.findFirst({
          where: {
            businessId: input.businessId,
            webSlug,
            deletedAt: null,
            NOT: { id: input.documentId },
          },
        });
        if (taken) {
          throw new DomainException(
            DocumentErrorCodes.WebSlugTaken,
            'Web slug already in use',
            HttpStatus.CONFLICT,
          );
        }
      }
    }

    let webPublished = row.webPublished;
    let webPublishedAt = row.webPublishedAt;
    if (input.webPublished !== undefined) {
      if (input.webPublished) {
        const slug = webSlug ?? row.webSlug;
        if (!slug) {
          throw new DomainException(
            DocumentErrorCodes.WebSlugInvalid,
            'Slug is required to publish to web',
            HttpStatus.BAD_REQUEST,
          );
        }
        if (
          !DOCUMENT_EXPORT_ALLOWED_STATUSES.includes(
            row.status as (typeof DOCUMENT_EXPORT_ALLOWED_STATUSES)[number],
          )
        ) {
          throw new DomainException(
            DocumentErrorCodes.WebNotAllowed,
            'Web publish requires approved or published workflow status',
            HttpStatus.CONFLICT,
          );
        }
        webPublished = true;
        webPublishedAt = row.webPublishedAt ?? new Date();
        webSlug = slug;
      } else {
        webPublished = false;
        webPublishedAt = null;
      }
    }

    const updated = await this.prisma.document.update({
      where: { id: row.id },
      data: {
        webSlug,
        webPublished,
        webPublishedAt,
      },
    });

    const becameLive = !row.webPublished && updated.webPublished;
    const wentOffline = row.webPublished && !updated.webPublished;
    if (becameLive || wentOffline) {
      await this.audit.log({
        action: becameLive
          ? AuditActions.DocumentWebPublish
          : AuditActions.DocumentWebUnpublish,
        entityType: 'document',
        entityId: updated.id,
        businessId: input.businessId,
        userId: input.userId,
        meta: {
          webSlug: updated.webSlug,
          webPublished: updated.webPublished,
        },
      });
    }

    return this.toSettings(updated);
  }

  async getPublicView(
    businessId: string,
    slugRaw: string,
  ): Promise<PublicWebDocumentView> {
    const slug = this.normalizeSlug(slugRaw);
    const row = await this.prisma.document.findFirst({
      where: {
        businessId,
        webSlug: slug,
        webPublished: true,
        deletedAt: null,
      },
    });
    if (!row) {
      throw new DomainException(
        DocumentErrorCodes.WebNotPublished,
        'Public document not found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (
      !DOCUMENT_EXPORT_ALLOWED_STATUSES.includes(
        row.status as (typeof DOCUMENT_EXPORT_ALLOWED_STATUSES)[number],
      )
    ) {
      throw new DomainException(
        DocumentErrorCodes.WebNotPublished,
        'Public document not available',
        HttpStatus.NOT_FOUND,
      );
    }

    const built = await this.exportService.buildDocumentHtml({
      businessId,
      documentId: row.id,
    });
    const brand = await this.branding.getForMember(businessId);

    return {
      businessId,
      documentId: row.id,
      slug,
      title: built.title,
      locale: parseContentLocale(built.locale),
      dir: built.dir ?? contentLocaleDir(parseContentLocale(built.locale)),
      html: built.html,
      branding: {
        displayName: brand.displayName,
        primaryColor: brand.primaryColor,
        hasLogo: brand.hasLogo,
        logoUrl: brand.hasLogo
          ? `/api/public/branding/${businessId}/logo`
          : null,
        showPoweredByEffective: brand.showPoweredByEffective,
      },
    };
  }

  async getPublicViewByHost(
    host: string,
    slug: string,
  ): Promise<PublicWebDocumentView> {
    const resolved = await this.branding.resolveByHost(host);
    return this.getPublicView(resolved.businessId, slug);
  }

  private toSettings(row: {
    id: string;
    businessId: string;
    status: string;
    webSlug: string | null;
    webPublished: boolean;
    webPublishedAt: Date | null;
  }): PublicDocumentWebPublish {
    const canPublishToWeb = DOCUMENT_EXPORT_ALLOWED_STATUSES.includes(
      row.status as (typeof DOCUMENT_EXPORT_ALLOWED_STATUSES)[number],
    );
    const publicPath =
      row.webPublished && row.webSlug
        ? `/p/${row.businessId}/${row.webSlug}`
        : null;
    return {
      documentId: row.id,
      businessId: row.businessId,
      webSlug: row.webSlug,
      webPublished: row.webPublished,
      webPublishedAt: row.webPublishedAt?.toISOString() ?? null,
      publicPath,
      canPublishToWeb,
    };
  }

  private normalizeSlug(raw: string): string {
    const s = raw.trim().toLowerCase();
    if (s.length < 3 || s.length > 64 || !SLUG_RE.test(s)) {
      throw new DomainException(
        DocumentErrorCodes.WebSlugInvalid,
        'Slug must be 3–64 chars: lowercase letters, digits, hyphens',
        HttpStatus.BAD_REQUEST,
      );
    }
    return s;
  }

  private async requireDoc(businessId: string, documentId: string) {
    const row = await this.prisma.document.findFirst({
      where: { id: documentId, businessId, deletedAt: null },
    });
    if (!row) {
      throw new DomainException(
        DocumentErrorCodes.NotFound,
        'Document not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return row;
  }
}
