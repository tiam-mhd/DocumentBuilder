import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ShareLinkScope as PrismaShareScope,
  type DocumentShareLink,
} from '@prisma/client';
import {
  AuditActions,
  DOCUMENT_EXPORT_ALLOWED_STATUSES,
  DocumentErrorCodes,
  ShareLinkScope,
  contentLocaleDir,
  parseContentLocale,
  type PublicDocumentShareLink,
  type PublicDocumentShareLinkList,
  type PublicShareLinkMeta,
  type PublicShareLinkPdfView,
  type PublicShareLinkWebView,
} from '@vdb/shared-types';
import { DomainException } from '../../common/errors/domain.exception';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { BrandingService } from '../branding/branding.service';
import { ExportService } from '../export/export.service';
import { ShareLinkRateStore } from './share-link-rate.store';
import {
  generateShareToken,
  hashShareSecret,
  shareHashesEqual,
  shareTokenHint,
} from './share-link.crypto';

@Injectable()
export class DocumentShareLinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly exportService: ExportService,
    private readonly branding: BrandingService,
    private readonly rate: ShareLinkRateStore,
    private readonly audit: AuditService,
  ) {}

  async list(
    businessId: string,
    documentId: string,
  ): Promise<PublicDocumentShareLinkList> {
    await this.requireDoc(businessId, documentId);
    const rows = await this.prisma.documentShareLink.findMany({
      where: { businessId, documentId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { items: rows.map((r) => this.toPublic(r)) };
  }

  async create(input: {
    businessId: string;
    documentId: string;
    userId: string;
    scope: 'web' | 'pdf';
    password?: string | null;
    expiresAt?: string | null;
  }): Promise<PublicDocumentShareLink> {
    const doc = await this.requireDoc(input.businessId, input.documentId);
    if (
      !DOCUMENT_EXPORT_ALLOWED_STATUSES.includes(
        doc.status as (typeof DOCUMENT_EXPORT_ALLOWED_STATUSES)[number],
      )
    ) {
      throw new DomainException(
        DocumentErrorCodes.ShareNotAllowed,
        'Share links require approved or published status',
        HttpStatus.CONFLICT,
      );
    }
    if (
      input.scope !== ShareLinkScope.Web &&
      input.scope !== ShareLinkScope.Pdf
    ) {
      throw new DomainException(
        DocumentErrorCodes.ShareInvalidScope,
        'scope must be web or pdf',
        HttpStatus.BAD_REQUEST,
      );
    }

    const pepper = this.config.getOrThrow<string>('SHARE_LINK_PEPPER');
    const token = generateShareToken();
    const tokenHash = hashShareSecret(token, pepper);
    let passwordHash: string | null = null;
    if (input.password != null && input.password.trim() !== '') {
      if (input.password.length < 4 || input.password.length > 128) {
        throw new DomainException(
          DocumentErrorCodes.SharePasswordInvalid,
          'Password must be 4–128 characters',
          HttpStatus.BAD_REQUEST,
        );
      }
      passwordHash = hashShareSecret(input.password, pepper);
    }

    let expiresAt: Date | null = null;
    if (input.expiresAt != null && input.expiresAt.trim() !== '') {
      expiresAt = new Date(input.expiresAt);
      if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
        throw new DomainException(
          DocumentErrorCodes.ShareExpired,
          'expiresAt must be a future ISO datetime',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const row = await this.prisma.documentShareLink.create({
      data: {
        businessId: input.businessId,
        documentId: input.documentId,
        tokenHash,
        tokenHint: shareTokenHint(token),
        passwordHash,
        scope:
          input.scope === ShareLinkScope.Pdf
            ? PrismaShareScope.pdf
            : PrismaShareScope.web,
        expiresAt,
        createdByUserId: input.userId,
      },
    });

    await this.audit.log({
      action: AuditActions.DocumentShareCreate,
      entityType: 'document_share_link',
      entityId: row.id,
      businessId: input.businessId,
      userId: input.userId,
      meta: { documentId: input.documentId, scope: input.scope },
    });

    return {
      ...this.toPublic(row),
      token,
      publicPath: `/s/${token}`,
    };
  }

  async revoke(input: {
    businessId: string;
    documentId: string;
    shareId: string;
    userId: string;
  }): Promise<PublicDocumentShareLink> {
    const row = await this.prisma.documentShareLink.findFirst({
      where: {
        id: input.shareId,
        businessId: input.businessId,
        documentId: input.documentId,
      },
    });
    if (!row) {
      throw new DomainException(
        DocumentErrorCodes.ShareNotFound,
        'Share link not found',
        HttpStatus.NOT_FOUND,
      );
    }
    const updated = row.revokedAt
      ? row
      : await this.prisma.documentShareLink.update({
          where: { id: row.id },
          data: { revokedAt: new Date() },
        });

    await this.audit.log({
      action: AuditActions.DocumentShareRevoke,
      entityType: 'document_share_link',
      entityId: updated.id,
      businessId: input.businessId,
      userId: input.userId,
      meta: { documentId: input.documentId },
    });

    return this.toPublic(updated);
  }

  async getMeta(tokenRaw: string): Promise<PublicShareLinkMeta> {
    const { row, tokenHash } = await this.findByToken(tokenRaw);
    const unlocked = await this.isUnlocked(row, tokenHash);
    return {
      scope: row.scope,
      title: row.document.title,
      locale: parseContentLocale(row.document.locale),
      requiresPassword: Boolean(row.passwordHash),
      unlocked,
      expired: this.isExpired(row),
      revoked: Boolean(row.revokedAt),
    };
  }

  async unlock(
    tokenRaw: string,
    password?: string | null,
  ): Promise<PublicShareLinkWebView | PublicShareLinkPdfView> {
    const { row, tokenHash } = await this.findByToken(tokenRaw);
    this.assertActive(row);

    if (row.passwordHash) {
      await this.rate.assertCanAttempt(tokenHash);
      const pepper = this.config.getOrThrow<string>('SHARE_LINK_PEPPER');
      const ok =
        password != null &&
        shareHashesEqual(
          hashShareSecret(password, pepper),
          row.passwordHash,
        );
      if (!ok) {
        await this.rate.recordFailedAttempt(tokenHash);
        throw new DomainException(
          DocumentErrorCodes.SharePasswordInvalid,
          'Invalid password',
          HttpStatus.UNAUTHORIZED,
        );
      }
      await this.rate.clearAttempts(tokenHash);
      await this.rate.grantSession(tokenHash);
    }

    return this.buildPayload(row, tokenRaw);
  }

  async resolve(
    tokenRaw: string,
  ): Promise<
    | { meta: PublicShareLinkMeta }
    | { meta: PublicShareLinkMeta; view: PublicShareLinkWebView | PublicShareLinkPdfView }
  > {
    const { row, tokenHash } = await this.findByToken(tokenRaw);
    const meta = {
      scope: row.scope,
      title: row.document.title,
      locale: parseContentLocale(row.document.locale),
      requiresPassword: Boolean(row.passwordHash),
      unlocked: await this.isUnlocked(row, tokenHash),
      expired: this.isExpired(row),
      revoked: Boolean(row.revokedAt),
    };

    if (meta.revoked || meta.expired) {
      return { meta };
    }
    if (meta.requiresPassword && !meta.unlocked) {
      return { meta };
    }
    return { meta, view: await this.buildPayload(row, tokenRaw) };
  }

  async readPdfFile(tokenRaw: string): Promise<{
    body: Buffer;
    contentType: string;
    filename: string;
    businessId: string;
    documentId: string;
  }> {
    const { row, tokenHash } = await this.findByToken(tokenRaw);
    this.assertActive(row);
    if (row.scope !== PrismaShareScope.pdf) {
      throw new DomainException(
        DocumentErrorCodes.ShareInvalidScope,
        'Not a PDF share link',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (row.passwordHash && !(await this.rate.hasSession(tokenHash))) {
      throw new DomainException(
        DocumentErrorCodes.SharePasswordRequired,
        'Password unlock required',
        HttpStatus.UNAUTHORIZED,
      );
    }
    const pdf = await this.exportService.renderPdfBuffer({
      businessId: row.businessId,
      documentId: row.documentId,
    });
    return {
      body: pdf,
      contentType: 'application/pdf',
      filename: `document-${row.documentId}.pdf`,
      businessId: row.businessId,
      documentId: row.documentId,
    };
  }

  private async buildPayload(
    row: DocumentShareLink & {
      document: { title: string; locale: string; status: string };
    },
    tokenRaw: string,
  ): Promise<PublicShareLinkWebView | PublicShareLinkPdfView> {
    if (
      !DOCUMENT_EXPORT_ALLOWED_STATUSES.includes(
        row.document.status as (typeof DOCUMENT_EXPORT_ALLOWED_STATUSES)[number],
      )
    ) {
      throw new DomainException(
        DocumentErrorCodes.ShareNotAllowed,
        'Document no longer shareable',
        HttpStatus.CONFLICT,
      );
    }

    if (row.scope === PrismaShareScope.pdf) {
      return {
        scope: 'pdf',
        businessId: row.businessId,
        documentId: row.documentId,
        title: row.document.title,
        filePath: `/api/public/share/${encodeURIComponent(tokenRaw)}/file`,
      };
    }

    const built = await this.exportService.buildDocumentHtml({
      businessId: row.businessId,
      documentId: row.documentId,
    });
    const brand = await this.branding.getForMember(row.businessId);
    return {
      scope: 'web',
      businessId: row.businessId,
      documentId: row.documentId,
      title: built.title,
      locale: parseContentLocale(built.locale),
      dir: built.dir ?? contentLocaleDir(parseContentLocale(built.locale)),
      html: built.html,
      branding: {
        displayName: brand.displayName,
        primaryColor: brand.primaryColor,
        hasLogo: brand.hasLogo,
        logoUrl: brand.hasLogo
          ? `/api/public/branding/${row.businessId}/logo`
          : null,
        showPoweredByEffective: brand.showPoweredByEffective,
      },
    };
  }

  private async findByToken(tokenRaw: string) {
    const token = tokenRaw?.trim();
    if (!token || token.length < 16) {
      throw new DomainException(
        DocumentErrorCodes.ShareNotFound,
        'Share link not found',
        HttpStatus.NOT_FOUND,
      );
    }
    const pepper = this.config.getOrThrow<string>('SHARE_LINK_PEPPER');
    const tokenHash = hashShareSecret(token, pepper);
    const row = await this.prisma.documentShareLink.findUnique({
      where: { tokenHash },
      include: {
        document: {
          select: { title: true, locale: true, status: true, deletedAt: true },
        },
      },
    });
    if (!row || row.document.deletedAt) {
      throw new DomainException(
        DocumentErrorCodes.ShareNotFound,
        'Share link not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return { row, tokenHash };
  }

  private assertActive(
    row: DocumentShareLink & { document?: { deletedAt?: Date | null } },
  ): void {
    if (row.revokedAt) {
      throw new DomainException(
        DocumentErrorCodes.ShareRevoked,
        'Share link revoked',
        HttpStatus.GONE,
      );
    }
    if (this.isExpired(row)) {
      throw new DomainException(
        DocumentErrorCodes.ShareExpired,
        'Share link expired',
        HttpStatus.GONE,
      );
    }
  }

  private isExpired(row: { expiresAt: Date | null }): boolean {
    return Boolean(row.expiresAt && row.expiresAt.getTime() <= Date.now());
  }

  private async isUnlocked(
    row: DocumentShareLink,
    tokenHash: string,
  ): Promise<boolean> {
    if (!row.passwordHash) return true;
    if (this.isExpired(row) || row.revokedAt) return false;
    return this.rate.hasSession(tokenHash);
  }

  private toPublic(row: DocumentShareLink): PublicDocumentShareLink {
    return {
      id: row.id,
      businessId: row.businessId,
      documentId: row.documentId,
      tokenHint: row.tokenHint,
      scope: row.scope,
      hasPassword: Boolean(row.passwordHash),
      expiresAt: row.expiresAt?.toISOString() ?? null,
      revokedAt: row.revokedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
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
