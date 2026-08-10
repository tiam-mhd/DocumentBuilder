import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { MembershipPermissionCodes } from '@vdb/shared-types';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { RequestUser } from '../identity/auth.types';
import { TenancyService } from '../tenancy/tenancy.service';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses/:businessId/analytics')
export class AnalyticsController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly tenancy: TenancyService,
  ) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Analytics summary (views/downloads) — OWNER/ADMIN',
  })
  @ApiOkResponse({ description: 'Aggregated analytics' })
  async summary(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    await this.tenancy.assertPermission(
      user.userId,
      businessId,
      MembershipPermissionCodes.AuditRead,
    );
    const data = await this.analytics.summary({ businessId, from, to });
    return { data };
  }
}
