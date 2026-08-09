import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  REPEATER_SOURCE_MODULE,
  type RepeaterSource,
} from '@vdb/document-schema';
import type { EntitlementCode } from '@vdb/shared-types';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { EntitlementGuard } from '../billing/guards/entitlement.guard';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { RequestUser } from '../identity/auth.types';
import { TenancyService } from '../tenancy/tenancy.service';
import { EntitlementsService } from '../billing/entitlements.service';
import { CollectionService } from './collection.service';

@ApiTags('content')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, EntitlementGuard)
@Controller('businesses/:businessId/collections')
export class CollectionController {
  constructor(
    private readonly collections: CollectionService,
    private readonly tenancy: TenancyService,
    private readonly entitlements: EntitlementsService,
  ) {}

  @Get(':source')
  @ApiOperation({
    summary: 'List Business collection items for repeater binding',
  })
  @ApiOkResponse({ description: 'Flat items for {{item.*}} placeholders' })
  async list(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('source') source: string,
    @Query('limit') limitRaw?: string,
    @Query('locale') locale?: string,
  ) {
    await this.tenancy.assertMembership(user.userId, businessId);
    await this.assertSourceModule(businessId, source);
    const data = await this.collections.list({
      businessId,
      source,
      limit: limitRaw ? Number(limitRaw) : 50,
      locale,
    });
    return { data };
  }

  private async assertSourceModule(
    businessId: string,
    source: string,
  ): Promise<void> {
    const moduleCode =
      REPEATER_SOURCE_MODULE[source as RepeaterSource] ?? null;
    if (!moduleCode) return;
    await this.entitlements.assertModule(
      businessId,
      moduleCode as EntitlementCode,
    );
  }
}
