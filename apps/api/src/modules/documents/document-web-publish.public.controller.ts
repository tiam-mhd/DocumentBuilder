import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import {
  AnalyticsEventKind,
  AnalyticsEventSource,
} from '@vdb/shared-types';
import { AnalyticsService } from '../analytics/analytics.service';
import { analyticsHintsFromHeaders } from '../analytics/analytics-hints';
import { DocumentWebPublishService } from './document-web-publish.service';

@ApiTags('web-publish')
@Controller('public')
export class DocumentWebPublishPublicController {
  constructor(
    private readonly webPublish: DocumentWebPublishService,
    private readonly analytics: AnalyticsService,
  ) {}

  @Get('documents/by-host')
  @ApiOperation({
    summary: 'Public web document by custom domain host + slug',
  })
  @ApiOkResponse({ description: 'HTML + meta' })
  async byHost(
    @Query('host') host: string,
    @Query('slug') slug: string,
    @Req() req: Request,
  ) {
    const data = await this.webPublish.getPublicViewByHost(
      host ?? '',
      slug ?? '',
    );
    const hints = analyticsHintsFromHeaders(
      req.headers as Record<string, string | string[] | undefined>,
    );
    this.analytics.track({
      businessId: data.businessId,
      documentId: data.documentId,
      kind: AnalyticsEventKind.View,
      source: AnalyticsEventSource.WebPublish,
      ...hints,
    });
    return { data };
  }

  @Get('documents/:businessId/:slug')
  @ApiOperation({ summary: 'Public web document HTML + meta (no JWT)' })
  @ApiOkResponse({ description: 'HTML + meta' })
  async byBusinessSlug(
    @Param('businessId') businessId: string,
    @Param('slug') slug: string,
    @Req() req: Request,
  ) {
    const data = await this.webPublish.getPublicView(businessId, slug);
    const hints = analyticsHintsFromHeaders(
      req.headers as Record<string, string | string[] | undefined>,
    );
    this.analytics.track({
      businessId: data.businessId,
      documentId: data.documentId,
      kind: AnalyticsEventKind.View,
      source: AnalyticsEventSource.WebPublish,
      ...hints,
    });
    return { data };
  }
}
