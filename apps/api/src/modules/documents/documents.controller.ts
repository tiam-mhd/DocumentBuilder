import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { EntitlementGuard } from '../billing/guards/entitlement.guard';
import { RequireWritable } from '../billing/decorators/require-entitlement.decorator';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { RequestUser } from '../identity/auth.types';
import { TenancyService } from '../tenancy/tenancy.service';
import { DocumentsService } from './documents.service';
import { DocumentVersionsService } from './document-versions.service';
import { DocumentWorkflowService } from './document-workflow.service';
import { DocumentCommentsService } from './document-comments.service';

class CreateDocumentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(1)
  templateId!: string;

  @IsOptional()
  @IsIn(['fa', 'en'])
  locale?: 'fa' | 'en';
}

class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsIn(['fa', 'en'])
  locale?: 'fa' | 'en';

  @IsOptional()
  @IsObject()
  body?: Record<string, unknown>;
}

class RejectWorkflowDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

class CreateCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  pageId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  blockId?: string | null;
}

class UpdateCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;
}

class CreateVersionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

class CloneVersionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;
}

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses/:businessId/documents')
export class DocumentsController {
  constructor(
    private readonly documents: DocumentsService,
    private readonly versions: DocumentVersionsService,
    private readonly workflow: DocumentWorkflowService,
    private readonly comments: DocumentCommentsService,
    private readonly tenancy: TenancyService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List documents (metadata only)' })
  @ApiOkResponse({ description: 'Paginated document list' })
  async list(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
    @Query('q') q?: string,
    @Query('status') status?: string,
  ) {
    await this.tenancy.assertMembership(user.userId, businessId);
    const data = await this.documents.list({
      businessId,
      page: Number(pageRaw ?? 1) || 1,
      pageSize: Number(pageSizeRaw ?? 50) || 50,
      q,
      status,
    });
    return { data };
  }

  @Post()
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @ApiOperation({
    summary: 'Create document from template (copies block snapshot)',
  })
  async create(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Body() body: CreateDocumentDto,
  ) {
    void user;
    const data = await this.documents.create({
      businessId,
      title: body.title,
      templateId: body.templateId,
      locale: body.locale,
    });
    return { data };
  }

  @Get(':documentId/versions')
  @ApiOperation({ summary: 'List immutable document versions' })
  async listVersions(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('documentId') documentId: string,
  ) {
    await this.tenancy.assertMembership(user.userId, businessId);
    const data = await this.versions.list(businessId, documentId);
    return { data };
  }

  @Post(':documentId/versions')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @ApiOperation({ summary: 'Create manual version snapshot of current body' })
  async createVersion(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('documentId') documentId: string,
    @Body() body: CreateVersionDto,
  ) {
    const data = await this.versions.createManual({
      businessId,
      documentId,
      userId: user.userId,
      note: body.note,
    });
    return { data };
  }

  @Get(':documentId/versions/compare')
  @ApiOperation({ summary: 'Compare two versions (metadata/stats)' })
  async compareVersions(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('documentId') documentId: string,
    @Query('left') left?: string,
    @Query('right') right?: string,
  ) {
    await this.tenancy.assertMembership(user.userId, businessId);
    const data = await this.versions.compare({
      businessId,
      documentId,
      leftVersionId: String(left ?? ''),
      rightVersionId: String(right ?? ''),
    });
    return { data };
  }

  @Get(':documentId/versions/:versionId')
  @ApiOperation({ summary: 'Get version metadata + immutable body snapshot' })
  async getVersion(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('documentId') documentId: string,
    @Param('versionId') versionId: string,
  ) {
    await this.tenancy.assertMembership(user.userId, businessId);
    const data = await this.versions.get(businessId, documentId, versionId);
    return { data };
  }

  @Post(':documentId/versions/:versionId/restore')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @ApiOperation({
    summary: 'Restore version body into current document (sets draft)',
  })
  async restoreVersion(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('documentId') documentId: string,
    @Param('versionId') versionId: string,
  ) {
    void user;
    const data = await this.versions.restore({
      businessId,
      documentId,
      versionId,
    });
    return { data };
  }

  @Post(':documentId/versions/:versionId/clone')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @ApiOperation({ summary: 'Clone version into a new draft document' })
  async cloneVersion(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('documentId') documentId: string,
    @Param('versionId') versionId: string,
    @Body() body: CloneVersionDto,
  ) {
    void user;
    const data = await this.versions.clone({
      businessId,
      documentId,
      versionId,
      title: body.title,
    });
    return { data };
  }

  @Get(':documentId/comments')
  @ApiOperation({ summary: 'List document comments' })
  async listComments(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('documentId') documentId: string,
    @Query('resolved') resolvedRaw?: string,
  ) {
    await this.tenancy.assertMembership(user.userId, businessId);
    const resolved =
      resolvedRaw === 'open' || resolvedRaw === 'resolved'
        ? resolvedRaw
        : 'all';
    const data = await this.comments.list({
      businessId,
      documentId,
      resolved,
    });
    return { data };
  }

  @Post(':documentId/comments')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @ApiOperation({ summary: 'Create document comment' })
  async createComment(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('documentId') documentId: string,
    @Body() body: CreateCommentDto,
  ) {
    const data = await this.comments.create({
      businessId,
      documentId,
      userId: user.userId,
      body: body.body,
      pageId: body.pageId,
      blockId: body.blockId,
    });
    return { data };
  }

  @Patch(':documentId/comments/:commentId')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @ApiOperation({ summary: 'Update comment body (author or OWNER/ADMIN)' })
  async updateComment(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('documentId') documentId: string,
    @Param('commentId') commentId: string,
    @Body() body: UpdateCommentDto,
  ) {
    const data = await this.comments.updateBody({
      businessId,
      documentId,
      commentId,
      userId: user.userId,
      body: body.body,
    });
    return { data };
  }

  @Post(':documentId/comments/:commentId/resolve')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @ApiOperation({ summary: 'Mark comment resolved' })
  async resolveComment(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('documentId') documentId: string,
    @Param('commentId') commentId: string,
  ) {
    const data = await this.comments.resolve({
      businessId,
      documentId,
      commentId,
      userId: user.userId,
    });
    return { data };
  }

  @Post(':documentId/comments/:commentId/unresolve')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @ApiOperation({ summary: 'Reopen resolved comment' })
  async unresolveComment(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('documentId') documentId: string,
    @Param('commentId') commentId: string,
  ) {
    const data = await this.comments.unresolve({
      businessId,
      documentId,
      commentId,
      userId: user.userId,
    });
    return { data };
  }

  @Delete(':documentId/comments/:commentId')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @ApiOperation({ summary: 'Soft-delete comment (author or OWNER/ADMIN)' })
  async deleteComment(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('documentId') documentId: string,
    @Param('commentId') commentId: string,
  ) {
    await this.comments.softDelete({
      businessId,
      documentId,
      commentId,
      userId: user.userId,
    });
    return { data: { ok: true as const } };
  }

  @Post(':documentId/workflow/submit')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @ApiOperation({ summary: 'Submit draft for review (draft → review)' })
  async workflowSubmit(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('documentId') documentId: string,
  ) {
    const data = await this.workflow.submit({
      businessId,
      documentId,
      userId: user.userId,
    });
    return { data };
  }

  @Post(':documentId/workflow/approve')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @ApiOperation({
    summary: 'Approve review (review → approved; OWNER/ADMIN)',
  })
  async workflowApprove(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('documentId') documentId: string,
  ) {
    const data = await this.workflow.approve({
      businessId,
      documentId,
      userId: user.userId,
    });
    return { data };
  }

  @Post(':documentId/workflow/reject')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @ApiOperation({ summary: 'Reject review (review → draft; OWNER/ADMIN)' })
  async workflowReject(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('documentId') documentId: string,
    @Body() body: RejectWorkflowDto,
  ) {
    const data = await this.workflow.reject({
      businessId,
      documentId,
      userId: user.userId,
      note: body.note,
    });
    return { data };
  }

  @Post(':documentId/workflow/publish')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @ApiOperation({
    summary:
      'Publish approved document (approved → published + version snapshot)',
  })
  async workflowPublish(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('documentId') documentId: string,
  ) {
    const data = await this.workflow.publish({
      businessId,
      documentId,
      userId: user.userId,
    });
    return { data };
  }

  @Post(':documentId/workflow/unpublish')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @ApiOperation({ summary: 'Unpublish (published → draft; OWNER/ADMIN)' })
  async workflowUnpublish(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('documentId') documentId: string,
  ) {
    const data = await this.workflow.unpublish({
      businessId,
      documentId,
      userId: user.userId,
    });
    return { data };
  }

  @Post(':documentId/workflow/reopen')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @ApiOperation({ summary: 'Reopen approved (approved → draft; OWNER/ADMIN)' })
  async workflowReopen(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('documentId') documentId: string,
  ) {
    const data = await this.workflow.reopen({
      businessId,
      documentId,
      userId: user.userId,
    });
    return { data };
  }

  @Get(':documentId')
  @ApiOperation({ summary: 'Get document metadata + Mongo body' })
  async getOne(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('documentId') documentId: string,
  ) {
    await this.tenancy.assertMembership(user.userId, businessId);
    const data = await this.documents.get(businessId, documentId);
    return { data };
  }

  @Patch(':documentId')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @ApiOperation({
    summary:
      'Update document title, status, and/or body (published body locked)',
  })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('documentId') documentId: string,
    @Body() body: UpdateDocumentDto,
  ) {
    const data = await this.documents.update({
      businessId,
      documentId,
      userId: user.userId,
      title: body.title,
      locale: body.locale,
      body: body.body,
    });
    return { data };
  }

  @Delete(':documentId')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @ApiOperation({ summary: 'Soft-delete document + remove Mongo body' })
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('documentId') documentId: string,
  ) {
    await this.documents.softDelete(businessId, documentId, user.userId);
    return { data: { ok: true as const } };
  }
}
