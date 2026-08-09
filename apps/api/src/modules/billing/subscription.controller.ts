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
import { SubscriptionService } from './subscription.service';

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses/:businessId/subscription')
export class SubscriptionController {
  constructor(
    private readonly tenancy: TenancyService,
    private readonly subscriptions: SubscriptionService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get subscription status for a business' })
  @ApiOkResponse({ description: 'Subscription (membership required)' })
  async get(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
  ) {
    await this.tenancy.assertMembership(user.userId, businessId);
    const data = await this.subscriptions.getForBusiness(businessId);
    return { data };
  }
}
