import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { EntitlementCodes } from '@vdb/shared-types';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { EntitlementGuard } from '../billing/guards/entitlement.guard';
import { RequireModule } from '../billing/decorators/require-entitlement.decorator';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { RequestUser } from '../identity/auth.types';
import { OrgChartService } from './org-chart.service';

@ApiTags('content')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, EntitlementGuard)
@RequireModule(EntitlementCodes.ModuleOrgChart)
@Controller('businesses/:businessId/org-chart')
export class OrgChartController {
  constructor(private readonly orgChart: OrgChartService) {}

  @Get('tree')
  @ApiOperation({
    summary: 'Get organization chart tree from Team (module.org_chart)',
  })
  @ApiOkResponse({ description: 'Reporting tree of team members' })
  async tree(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Query('rootMemberId') rootMemberId?: string,
  ) {
    void user;
    const data = await this.orgChart.getTree({
      businessId,
      rootMemberId: rootMemberId || null,
    });
    return { data };
  }
}
