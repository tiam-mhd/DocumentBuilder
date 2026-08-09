import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { EntitlementCodes } from '@vdb/shared-types';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { EntitlementGuard } from '../billing/guards/entitlement.guard';
import { RequireEntitlement } from '../billing/decorators/require-entitlement.decorator';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { RequestUser } from '../identity/auth.types';
import { TenancyService } from '../tenancy/tenancy.service';
import { ExportService } from './export.service';

@ApiTags('export')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses/:businessId')
export class ExportController {
  constructor(
    private readonly exports: ExportService,
    private readonly tenancy: TenancyService,
  ) {}

  @Post('documents/:documentId/export/pdf')
  @UseGuards(EntitlementGuard)
  @RequireEntitlement(EntitlementCodes.ExportPdf)
  @ApiOperation({
    summary: 'Enqueue PDF export (BullMQ) — never runs in editor keystroke path',
  })
  async createPdf(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('documentId') documentId: string,
  ) {
    void user;
    const data = await this.exports.createPdfJob({ businessId, documentId });
    return { data };
  }

  @Get('documents/:documentId/exports')
  @ApiOperation({ summary: 'List export jobs for a document' })
  async list(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('documentId') documentId: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
  ) {
    await this.tenancy.assertMembership(user.userId, businessId);
    const data = await this.exports.listForDocument({
      businessId,
      documentId,
      page: Number(pageRaw ?? 1) || 1,
      pageSize: Number(pageSizeRaw ?? 20) || 20,
    });
    return { data };
  }

  @Get('exports/:jobId')
  @ApiOperation({ summary: 'Get export job status' })
  @ApiOkResponse({ description: 'Export job' })
  async getOne(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('jobId') jobId: string,
  ) {
    await this.tenancy.assertMembership(user.userId, businessId);
    const data = await this.exports.getJob(businessId, jobId);
    return { data };
  }

  @Get('exports/:jobId/file')
  @ApiOperation({ summary: 'Download completed PDF' })
  async download(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('jobId') jobId: string,
    @Res() res: Response,
  ) {
    await this.tenancy.assertMembership(user.userId, businessId);
    const file = await this.exports.readFile(businessId, jobId);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`,
    );
    res.send(file.body);
  }
}
