import {
  Controller,
  Get,
  Param,
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
  EntitlementCodes,
  MembershipPermissionCodes,
} from '@vdb/shared-types';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { RequestUser } from '../identity/auth.types';
import { EntitlementGuard } from '../billing/guards/entitlement.guard';
import {
  RequireEntitlement,
  RequirePermission,
  RequireWritable,
} from '../billing/decorators/require-entitlement.decorator';
import { TenancyService } from '../tenancy/tenancy.service';
import { MarketplaceService } from './marketplace.service';

@ApiTags('marketplace')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class MarketplaceController {
  constructor(
    private readonly marketplace: MarketplaceService,
    private readonly tenancy: TenancyService,
  ) {}

  @Get('marketplace/templates')
  @ApiOperation({ summary: 'List SAAS marketplace templates' })
  @ApiOkResponse({ description: 'Paginated catalog' })
  async list(
    @CurrentUser() user: RequestUser,
    @Query('businessId') businessId: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
    @Query('q') q?: string,
    @Query('locale') locale?: string,
  ) {
    this.marketplace.assertSaasEdition();
    await this.tenancy.assertMembership(user.userId, businessId);
    await this.marketplace.assertMarketplaceEntitlement(businessId);
    const data = await this.marketplace.list({
      page: Number(pageRaw ?? 1) || 1,
      pageSize: Number(pageSizeRaw ?? 20) || 20,
      q,
      locale,
    });
    return { data };
  }

  @Get('marketplace/templates/:id')
  @ApiOperation({ summary: 'Get marketplace template detail' })
  async getOne(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Query('businessId') businessId: string,
  ) {
    this.marketplace.assertSaasEdition();
    await this.tenancy.assertMembership(user.userId, businessId);
    await this.marketplace.assertMarketplaceEntitlement(businessId);
    const data = await this.marketplace.get(id);
    return { data };
  }

  @Post('businesses/:businessId/marketplace/templates/:id/install')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @RequireEntitlement(EntitlementCodes.MarketplaceTemplates)
  @RequirePermission(MembershipPermissionCodes.ManageTemplates)
  @ApiOperation({
    summary: 'Install marketplace template into Business (snapshot copy)',
  })
  async install(
    @Param('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    const data = await this.marketplace.install({
      businessId,
      marketplaceTemplateId: id,
    });
    return { data };
  }
}
