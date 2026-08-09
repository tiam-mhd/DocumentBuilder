import { HttpStatus, Injectable, OnModuleInit } from '@nestjs/common';
import {
  DocumentStatus as PrismaDocumentStatus,
  DocumentVersionSource as PrismaDocumentVersionSource,
  type Document as PrismaDocument,
  type DocumentVersion as PrismaDocumentVersion,
} from '@prisma/client';
import {
  createEmptyDocumentBody,
  DOCUMENT_SCHEMA_VERSION,
  parseDocumentBody,
  walkDocumentBlocks,
  type DocumentBody,
} from '@vdb/document-schema';
import {
  DocumentErrorCodes,
  DocumentVersionSource,
  parseContentLocale,
  type PublicDocumentVersion,
  type PublicDocumentVersionCompare,
  type PublicDocumentVersionDetail,
  type PublicDocumentVersionList,
} from '@vdb/shared-types';
import { DomainException } from '../../common/errors/domain.exception';
import { PrismaService } from '../../config/prisma/prisma.service';
import { DocumentBodyRepository } from './document-body.repository';
import { DocumentVersionBodyRepository } from './document-version-body.repository';

function blockCount(body: DocumentBody): number {
  let n = 0;
  for (const page of body.pages ?? []) {
    walkDocumentBlocks(page.blocks ?? [], () => {
      n += 1;
    });
  }
  return n;
}

@Injectable()
export class DocumentVersionsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bodies: DocumentBodyRepository,
    private readonly versionBodies: DocumentVersionBodyRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.versionBodies.ensureIndexes();
    } catch {
      // Mongo may be down at boot.
    }
  }

  async list(
    businessId: string,
    documentId: string,
  ): Promise<PublicDocumentVersionList> {
    await this.requireDocument(businessId, documentId);
    const rows = await this.prisma.documentVersion.findMany({
      where: { businessId, documentId },
      orderBy: { versionNumber: 'desc' },
    });
    const items = await Promise.all(
      rows.map((r) => this.toPublicMeta(r)),
    );
    return { items, total: items.length };
  }

  async get(
    businessId: string,
    documentId: string,
    versionId: string,
  ): Promise<PublicDocumentVersionDetail> {
    const row = await this.requireVersion(businessId, documentId, versionId);
    const body = await this.versionBodies.find(businessId, versionId);
    if (!body) {
      throw new DomainException(
        DocumentErrorCodes.VersionNotFound,
        'Version body not found',
        HttpStatus.NOT_FOUND,
      );
    }
    const meta = await this.toPublicMeta(row, body);
    return { ...meta, body };
  }

  async createManual(input: {
    businessId: string;
    documentId: string;
    userId: string;
    note?: string;
  }): Promise<PublicDocumentVersionDetail> {
    const doc = await this.requireDocument(input.businessId, input.documentId);
    const body =
      (await this.bodies.find(input.businessId, input.documentId)) ??
      createEmptyDocumentBody(input.businessId, input.documentId, {
        title: doc.title,
        templateId: doc.templateId,
      });
    const created = await this.snapshot({
      document: doc,
      body,
      source: DocumentVersionSource.Manual,
      userId: input.userId,
      note: input.note?.trim().slice(0, 500) || null,
    });
    return created;
  }

  /** Called after successful publish transition. */
  async createPublishSnapshot(input: {
    document: PrismaDocument;
    body: DocumentBody;
    userId?: string | null;
  }): Promise<PublicDocumentVersionDetail> {
    return this.snapshot({
      document: input.document,
      body: input.body,
      source: DocumentVersionSource.Publish,
      userId: input.userId ?? null,
      note: null,
    });
  }

  async restore(input: {
    businessId: string;
    documentId: string;
    versionId: string;
  }): Promise<{ documentId: string }> {
    const doc = await this.requireDocument(input.businessId, input.documentId);
    const versionBody = await this.versionBodies.find(
      input.businessId,
      input.versionId,
    );
    const version = await this.requireVersion(
      input.businessId,
      input.documentId,
      input.versionId,
    );
    if (!versionBody) {
      throw new DomainException(
        DocumentErrorCodes.VersionNotFound,
        'Version body not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const restored = parseDocumentBody({
      ...versionBody,
      businessId: input.businessId,
      documentId: input.documentId,
      schemaVersion: DOCUMENT_SCHEMA_VERSION,
      templateId: versionBody.templateId ?? doc.templateId,
      title: version.title,
      locale: parseContentLocale(version.locale),
    });

    await this.prisma.document.update({
      where: { id: doc.id },
      data: {
        title: version.title,
        locale: parseContentLocale(version.locale),
        status: PrismaDocumentStatus.draft,
      },
    });
    await this.bodies.upsert(restored);
    return { documentId: doc.id };
  }

  async clone(input: {
    businessId: string;
    documentId: string;
    versionId: string;
    title?: string;
  }): Promise<{ documentId: string }> {
    const doc = await this.requireDocument(input.businessId, input.documentId);
    await this.requireVersion(
      input.businessId,
      input.documentId,
      input.versionId,
    );
    const versionBody = await this.versionBodies.find(
      input.businessId,
      input.versionId,
    );
    if (!versionBody) {
      throw new DomainException(
        DocumentErrorCodes.VersionNotFound,
        'Version body not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const title = (input.title?.trim() || `${doc.title} (copy)`).slice(0, 200);
    const locale = parseContentLocale(versionBody.locale ?? doc.locale);

    const created = await this.prisma.document.create({
      data: {
        businessId: input.businessId,
        templateId: doc.templateId,
        title,
        locale,
        status: PrismaDocumentStatus.draft,
      },
    });

    const body = parseDocumentBody({
      ...versionBody,
      businessId: input.businessId,
      documentId: created.id,
      schemaVersion: DOCUMENT_SCHEMA_VERSION,
      templateId: versionBody.templateId ?? doc.templateId,
      title,
      locale,
    });

    try {
      await this.bodies.upsert(body);
    } catch {
      await this.prisma.document.delete({ where: { id: created.id } });
      throw new DomainException(
        DocumentErrorCodes.StorageError,
        'Failed to store cloned document body',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return { documentId: created.id };
  }

  async compare(input: {
    businessId: string;
    documentId: string;
    leftVersionId: string;
    rightVersionId: string;
  }): Promise<PublicDocumentVersionCompare> {
    const [leftRow, rightRow] = await Promise.all([
      this.requireVersion(
        input.businessId,
        input.documentId,
        input.leftVersionId,
      ),
      this.requireVersion(
        input.businessId,
        input.documentId,
        input.rightVersionId,
      ),
    ]);
    const [leftBody, rightBody] = await Promise.all([
      this.versionBodies.find(input.businessId, input.leftVersionId),
      this.versionBodies.find(input.businessId, input.rightVersionId),
    ]);
    const left = await this.toPublicMeta(leftRow, leftBody);
    const right = await this.toPublicMeta(rightRow, rightBody);
    return {
      left,
      right,
      diff: {
        title: left.title !== right.title,
        locale: left.locale !== right.locale,
        status: left.status !== right.status,
        schemaVersion: left.stats.schemaVersion !== right.stats.schemaVersion,
        pageCount: left.stats.pageCount !== right.stats.pageCount,
        blockCount: left.stats.blockCount !== right.stats.blockCount,
        masterCount: left.stats.masterCount !== right.stats.masterCount,
      },
    };
  }

  async latestVersionNumber(
    businessId: string,
    documentId: string,
  ): Promise<number | null> {
    const row = await this.prisma.documentVersion.findFirst({
      where: { businessId, documentId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });
    return row?.versionNumber ?? null;
  }

  async deleteBodiesForDocument(
    businessId: string,
    documentId: string,
  ): Promise<void> {
    await this.versionBodies.deleteForDocument(businessId, documentId);
  }

  private async snapshot(input: {
    document: PrismaDocument;
    body: DocumentBody;
    source: string;
    userId: string | null;
    note: string | null;
  }): Promise<PublicDocumentVersionDetail> {
    const agg = await this.prisma.documentVersion.aggregate({
      where: {
        businessId: input.document.businessId,
        documentId: input.document.id,
      },
      _max: { versionNumber: true },
    });
    const versionNumber = (agg._max.versionNumber ?? 0) + 1;
    const source =
      input.source === DocumentVersionSource.Publish
        ? PrismaDocumentVersionSource.publish
        : PrismaDocumentVersionSource.manual;

    const row = await this.prisma.documentVersion.create({
      data: {
        businessId: input.document.businessId,
        documentId: input.document.id,
        versionNumber,
        source,
        note: input.note,
        title: input.document.title,
        locale: parseContentLocale(input.document.locale),
        status: input.document.status,
        createdByUserId: input.userId,
      },
    });

    const frozen = parseDocumentBody({
      ...input.body,
      businessId: input.document.businessId,
      documentId: input.document.id,
      title: input.document.title,
      locale: parseContentLocale(input.document.locale),
      schemaVersion: DOCUMENT_SCHEMA_VERSION,
    });

    try {
      await this.versionBodies.insert({
        versionId: row.id,
        body: frozen,
      });
    } catch {
      await this.prisma.documentVersion.delete({ where: { id: row.id } });
      throw new DomainException(
        DocumentErrorCodes.StorageError,
        'Failed to store version body',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const meta = await this.toPublicMeta(row, frozen);
    return { ...meta, body: frozen };
  }

  private async requireDocument(businessId: string, documentId: string) {
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

  private async requireVersion(
    businessId: string,
    documentId: string,
    versionId: string,
  ) {
    const row = await this.prisma.documentVersion.findFirst({
      where: { id: versionId, businessId, documentId },
    });
    if (!row) {
      throw new DomainException(
        DocumentErrorCodes.VersionNotFound,
        'Document version not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return row;
  }

  private async toPublicMeta(
    row: PrismaDocumentVersion,
    body?: DocumentBody | null,
  ): Promise<PublicDocumentVersion> {
    let stats = {
      schemaVersion: null as number | null,
      pageCount: 0,
      blockCount: 0,
      masterCount: 0,
    };
    const resolved =
      body ?? (await this.versionBodies.find(row.businessId, row.id));
    if (resolved) {
      stats = {
        schemaVersion: resolved.schemaVersion ?? null,
        pageCount: resolved.pages?.length ?? 0,
        blockCount: blockCount(resolved),
        masterCount: resolved.masters?.length ?? 0,
      };
    }
    return {
      id: row.id,
      businessId: row.businessId,
      documentId: row.documentId,
      versionNumber: row.versionNumber,
      source: row.source,
      note: row.note,
      title: row.title,
      locale: parseContentLocale(row.locale),
      status: row.status,
      createdByUserId: row.createdByUserId,
      createdAt: row.createdAt.toISOString(),
      stats,
    };
  }
}
