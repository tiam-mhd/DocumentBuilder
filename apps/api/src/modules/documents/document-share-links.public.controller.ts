import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import type { Request, Response } from 'express';
import {
  AnalyticsEventKind,
  AnalyticsEventSource,
} from '@vdb/shared-types';
import { AnalyticsService } from '../analytics/analytics.service';
import { analyticsHintsFromHeaders } from '../analytics/analytics-hints';
import { DocumentShareLinksService } from './document-share-links.service';

class UnlockShareDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  password?: string | null;
}

@ApiTags('share-links')
@Controller('public/share')
export class DocumentShareLinksPublicController {
  constructor(
    private readonly shareLinks: DocumentShareLinksService,
    private readonly analytics: AnalyticsService,
  ) {}

  @Get(':token')
  @ApiOperation({
    summary: 'Resolve share link meta (+ view when unlocked / no password)',
  })
  @ApiOkResponse({ description: 'Meta and optional view' })
  async resolve(@Param('token') token: string, @Req() req: Request) {
    const data = await this.shareLinks.resolve(token);
    if ('view' in data && data.view) {
      this.trackShareView(data.view, req);
    }
    return { data };
  }

  @Post(':token/unlock')
  @ApiOperation({ summary: 'Unlock password-protected share link' })
  async unlock(
    @Param('token') token: string,
    @Body() body: UnlockShareDto,
    @Req() req: Request,
  ) {
    const view = await this.shareLinks.unlock(token, body.password);
    const meta = await this.shareLinks.getMeta(token);
    this.trackShareView(view, req);
    return { data: { meta, view } };
  }

  @Get(':token/file')
  @ApiOperation({ summary: 'Download PDF for pdf-scope share link' })
  async file(
    @Param('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const file = await this.shareLinks.readPdfFile(token);
    const hints = analyticsHintsFromHeaders(
      req.headers as Record<string, string | string[] | undefined>,
    );
    this.analytics.track({
      businessId: file.businessId,
      documentId: file.documentId,
      kind: AnalyticsEventKind.Download,
      source: AnalyticsEventSource.SharePdf,
      ...hints,
    });
    res.setHeader('Content-Type', file.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`,
    );
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(file.body);
  }

  private trackShareView(
    view: {
      scope: string;
      businessId: string;
      documentId: string;
    },
    req: Request,
  ): void {
    if (view.scope !== 'web') return;
    const hints = analyticsHintsFromHeaders(
      req.headers as Record<string, string | string[] | undefined>,
    );
    this.analytics.track({
      businessId: view.businessId,
      documentId: view.documentId,
      kind: AnalyticsEventKind.View,
      source: AnalyticsEventSource.ShareWeb,
      ...hints,
    });
  }
}
