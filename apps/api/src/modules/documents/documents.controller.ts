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

class CreateDocumentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(1)
  templateId!: string;
}

class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsIn(['draft', 'published'])
  status?: 'draft' | 'published';

  @IsOptional()
  @IsObject()
  body?: Record<string, unknown>;
}

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses/:businessId/documents')
export class DocumentsController {
  constructor(
    private readonly documents: DocumentsService,
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
  @ApiOperation({ summary: 'Update document title, status, and/or body' })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('documentId') documentId: string,
    @Body() body: UpdateDocumentDto,
  ) {
    void user;
    const data = await this.documents.update({
      businessId,
      documentId,
      title: body.title,
      status: body.status,
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
    void user;
    await this.documents.softDelete(businessId, documentId);
    return { data: { ok: true as const } };
  }
}
