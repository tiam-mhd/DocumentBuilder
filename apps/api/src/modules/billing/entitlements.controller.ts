import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { RequestUser } from '../identity/auth.types';
import { TenancyService } from '../tenancy/tenancy.service';
import { EntitlementsService } from './entitlements.service';

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses/:businessId/entitlements')
export class EntitlementsController {
  constructor(
    private readonly tenancy: TenancyService,
    private readonly entitlements: EntitlementsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Resolved entitlements for a business (plan + modules)',
  })
  @ApiOkResponse({ description: 'Entitlement snapshot' })
  async get(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
  ) {
    await this.tenancy.assertMembership(user.userId, businessId);
    const data = await this.entitlements.getForBusiness(businessId);
    return { data };
  }
}
