import { HttpStatus, Injectable } from '@nestjs/common';
import {
  DocumentStatus as PrismaDocumentStatus,
  MembershipRole,
  type Document as PrismaDocument,
} from '@prisma/client';
import {
  createEmptyDocumentBody,
  parseDocumentBody,
  DOCUMENT_SCHEMA_VERSION,
} from '@vdb/document-schema';
import {
  AuditActions,
  DocumentErrorCodes,
  DocumentStatus,
  parseContentLocale,
  type PublicDocumentDetail,
} from '@vdb/shared-types';
import { DomainException } from '../../common/errors/domain.exception';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TenancyService } from '../tenancy/tenancy.service';
import { DocumentBodyRepository } from './document-body.repository';
import { DocumentVersionsService } from './document-versions.service';
import { DocumentsService } from './documents.service';

type WorkflowAction =
  | 'submit'
  | 'approve'
  | 'reject'
  | 'publish'
  | 'unpublish'
  | 'reopen';

@Injectable()
export class DocumentWorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documents: DocumentsService,
    private readonly versions: DocumentVersionsService,
    private readonly bodies: DocumentBodyRepository,
    private readonly tenancy: TenancyService,
    private readonly audit: AuditService,
  ) {}

  async submit(input: {
    businessId: string;
    documentId: string;
    userId: string;
  }): Promise<PublicDocumentDetail> {
    return this.transition({
      ...input,
      action: 'submit',
      from: DocumentStatus.Draft,
      to: DocumentStatus.Review,
      auditAction: AuditActions.DocumentWorkflowSubmit,
      requireApprover: false,
    });
  }

  async approve(input: {
    businessId: string;
    documentId: string;
    userId: string;
  }): Promise<PublicDocumentDetail> {
    return this.transition({
      ...input,
      action: 'approve',
      from: DocumentStatus.Review,
      to: DocumentStatus.Approved,
      auditAction: AuditActions.DocumentWorkflowApprove,
      requireApprover: true,
    });
  }

  async reject(input: {
    businessId: string;
    documentId: string;
    userId: string;
    note?: string;
  }): Promise<PublicDocumentDetail> {
    return this.transition({
      ...input,
      action: 'reject',
      from: DocumentStatus.Review,
      to: DocumentStatus.Draft,
      auditAction: AuditActions.DocumentWorkflowReject,
      requireApprover: true,
      note: input.note,
    });
  }

  async publish(input: {
    businessId: string;
    documentId: string;
    userId: string;
  }): Promise<PublicDocumentDetail> {
    return this.transition({
      ...input,
      action: 'publish',
      from: DocumentStatus.Approved,
      to: DocumentStatus.Published,
      auditAction: AuditActions.DocumentWorkflowPublish,
      requireApprover: true,
      createVersion: true,
    });
  }

  async unpublish(input: {
    businessId: string;
    documentId: string;
    userId: string;
  }): Promise<PublicDocumentDetail> {
    return this.transition({
      ...input,
      action: 'unpublish',
      from: DocumentStatus.Published,
      to: DocumentStatus.Draft,
      auditAction: AuditActions.DocumentWorkflowUnpublish,
      requireApprover: true,
    });
  }

  async reopen(input: {
    businessId: string;
    documentId: string;
    userId: string;
  }): Promise<PublicDocumentDetail> {
    return this.transition({
      ...input,
      action: 'reopen',
      from: DocumentStatus.Approved,
      to: DocumentStatus.Draft,
      auditAction: AuditActions.DocumentWorkflowReopen,
      requireApprover: true,
    });
  }

  private async transition(input: {
    businessId: string;
    documentId: string;
    userId: string;
    action: WorkflowAction;
    from: string;
    to: string;
    auditAction: string;
    requireApprover: boolean;
    note?: string;
    createVersion?: boolean;
  }): Promise<PublicDocumentDetail> {
    if (input.requireApprover) {
      await this.tenancy.assertApprover(input.userId, input.businessId);
    } else {
      await this.tenancy.assertMembership(input.userId, input.businessId);
    }

    const row = await this.requireMeta(input.businessId, input.documentId);
    if (row.status !== input.from) {
      throw new DomainException(
        DocumentErrorCodes.WorkflowInvalid,
        `Cannot ${input.action}: expected status ${input.from}, got ${row.status}`,
        HttpStatus.CONFLICT,
      );
    }

    const updated = await this.prisma.document.update({
      where: { id: row.id },
      data: {
        status: input.to as PrismaDocumentStatus,
        ...(input.to === DocumentStatus.Draft
          ? { webPublished: false, webPublishedAt: null }
          : {}),
      },
    });

    let body =
      (await this.bodies.find(input.businessId, input.documentId)) ??
      createEmptyDocumentBody(input.businessId, input.documentId, {
        title: updated.title,
        templateId: updated.templateId,
      });
    body = parseDocumentBody({
      ...body,
      title: updated.title,
      locale: parseContentLocale(updated.locale),
      schemaVersion: DOCUMENT_SCHEMA_VERSION,
      businessId: input.businessId,
      documentId: input.documentId,
    });

    if (input.createVersion) {
      await this.versions.createPublishSnapshot({
        document: updated,
        body,
        userId: input.userId,
      });
    }

    await this.audit.log({
      action: input.auditAction,
      entityType: 'document',
      entityId: updated.id,
      businessId: input.businessId,
      userId: input.userId,
      meta: {
        from: input.from,
        to: input.to,
        ...(input.note?.trim()
          ? { note: input.note.trim().slice(0, 500) }
          : {}),
      },
    });

    return this.documents.get(input.businessId, input.documentId);
  }

  private async requireMeta(
    businessId: string,
    documentId: string,
  ): Promise<PrismaDocument> {
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

/** Helper for UI/tests — OWNER/ADMIN. */
export function isApproverRole(role: MembershipRole | string): boolean {
  return role === MembershipRole.OWNER || role === MembershipRole.ADMIN;
}
