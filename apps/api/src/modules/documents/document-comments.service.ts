import { HttpStatus, Injectable } from '@nestjs/common';
import { MembershipRole, type DocumentComment } from '@prisma/client';
import {
  DocumentErrorCodes,
  type PublicDocumentComment,
  type PublicDocumentCommentList,
} from '@vdb/shared-types';
import { DomainException } from '../../common/errors/domain.exception';
import { PrismaService } from '../../config/prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';

const MAX_BODY = 4000;

@Injectable()
export class DocumentCommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
  ) {}

  async list(input: {
    businessId: string;
    documentId: string;
    resolved?: 'all' | 'open' | 'resolved';
  }): Promise<PublicDocumentCommentList> {
    await this.requireDocument(input.businessId, input.documentId);
    const resolvedFilter = input.resolved ?? 'all';
    const where = {
      businessId: input.businessId,
      documentId: input.documentId,
      deletedAt: null,
      ...(resolvedFilter === 'open'
        ? { resolvedAt: null }
        : resolvedFilter === 'resolved'
          ? { resolvedAt: { not: null } }
          : {}),
    };
    const [rows, total, unresolvedCount] = await Promise.all([
      this.prisma.documentComment.findMany({
        where,
        orderBy: [{ resolvedAt: 'asc' }, { createdAt: 'desc' }],
        take: 200,
      }),
      this.prisma.documentComment.count({ where }),
      this.prisma.documentComment.count({
        where: {
          businessId: input.businessId,
          documentId: input.documentId,
          deletedAt: null,
          resolvedAt: null,
        },
      }),
    ]);
    return {
      items: rows.map((r) => this.toPublic(r)),
      total,
      unresolvedCount,
    };
  }

  async create(input: {
    businessId: string;
    documentId: string;
    userId: string;
    body: string;
    pageId?: string | null;
    blockId?: string | null;
  }): Promise<PublicDocumentComment> {
    await this.requireDocument(input.businessId, input.documentId);
    const body = this.validateBody(input.body);
    const row = await this.prisma.documentComment.create({
      data: {
        businessId: input.businessId,
        documentId: input.documentId,
        authorUserId: input.userId,
        body,
        pageId: this.optionalId(input.pageId),
        blockId: this.optionalId(input.blockId),
      },
    });
    return this.toPublic(row);
  }

  async updateBody(input: {
    businessId: string;
    documentId: string;
    commentId: string;
    userId: string;
    body: string;
  }): Promise<PublicDocumentComment> {
    const row = await this.requireComment(
      input.businessId,
      input.documentId,
      input.commentId,
    );
    await this.assertAuthorOrApprover(
      input.userId,
      input.businessId,
      row.authorUserId,
    );
    if (row.resolvedAt) {
      throw new DomainException(
        DocumentErrorCodes.CommentForbidden,
        'Resolved comments cannot be edited',
        HttpStatus.CONFLICT,
      );
    }
    const updated = await this.prisma.documentComment.update({
      where: { id: row.id },
      data: { body: this.validateBody(input.body) },
    });
    return this.toPublic(updated);
  }

  async resolve(input: {
    businessId: string;
    documentId: string;
    commentId: string;
    userId: string;
  }): Promise<PublicDocumentComment> {
    const row = await this.requireComment(
      input.businessId,
      input.documentId,
      input.commentId,
    );
    if (row.resolvedAt) return this.toPublic(row);
    const updated = await this.prisma.documentComment.update({
      where: { id: row.id },
      data: {
        resolvedAt: new Date(),
        resolvedByUserId: input.userId,
      },
    });
    return this.toPublic(updated);
  }

  async unresolve(input: {
    businessId: string;
    documentId: string;
    commentId: string;
    userId: string;
  }): Promise<PublicDocumentComment> {
    const row = await this.requireComment(
      input.businessId,
      input.documentId,
      input.commentId,
    );
    await this.assertAuthorOrApprover(
      input.userId,
      input.businessId,
      row.authorUserId,
    );
    const updated = await this.prisma.documentComment.update({
      where: { id: row.id },
      data: {
        resolvedAt: null,
        resolvedByUserId: null,
      },
    });
    return this.toPublic(updated);
  }

  async softDelete(input: {
    businessId: string;
    documentId: string;
    commentId: string;
    userId: string;
  }): Promise<void> {
    const row = await this.requireComment(
      input.businessId,
      input.documentId,
      input.commentId,
    );
    await this.assertAuthorOrApprover(
      input.userId,
      input.businessId,
      row.authorUserId,
    );
    await this.prisma.documentComment.update({
      where: { id: row.id },
      data: { deletedAt: new Date() },
    });
  }

  private async requireDocument(businessId: string, documentId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, businessId, deletedAt: null },
      select: { id: true },
    });
    if (!doc) {
      throw new DomainException(
        DocumentErrorCodes.NotFound,
        'Document not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  private async requireComment(
    businessId: string,
    documentId: string,
    commentId: string,
  ) {
    const row = await this.prisma.documentComment.findFirst({
      where: {
        id: commentId,
        businessId,
        documentId,
        deletedAt: null,
      },
    });
    if (!row) {
      throw new DomainException(
        DocumentErrorCodes.CommentNotFound,
        'Comment not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return row;
  }

  private async assertAuthorOrApprover(
    userId: string,
    businessId: string,
    authorUserId: string,
  ): Promise<void> {
    if (userId === authorUserId) return;
    const role = await this.tenancy.getMembershipRole(userId, businessId);
    if (role !== MembershipRole.OWNER && role !== MembershipRole.ADMIN) {
      throw new DomainException(
        DocumentErrorCodes.CommentForbidden,
        'Only the author or an OWNER/ADMIN may do this',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private validateBody(raw: string): string {
    const body = raw.trim();
    if (body.length < 1 || body.length > MAX_BODY) {
      throw new DomainException(
        DocumentErrorCodes.CommentInvalidBody,
        `Comment body must be 1–${MAX_BODY} characters`,
        HttpStatus.BAD_REQUEST,
      );
    }
    return body;
  }

  private optionalId(raw?: string | null): string | null {
    if (raw == null || raw === '') return null;
    const id = String(raw).trim().slice(0, 64);
    return id.length ? id : null;
  }

  private toPublic(row: DocumentComment): PublicDocumentComment {
    return {
      id: row.id,
      businessId: row.businessId,
      documentId: row.documentId,
      authorUserId: row.authorUserId,
      body: row.body,
      pageId: row.pageId,
      blockId: row.blockId,
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
      resolvedByUserId: row.resolvedByUserId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
