import {
  Body,
  Controller,
  Headers,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { MembershipPermissionCodes } from '@vdb/shared-types';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { RequestUser } from '../identity/auth.types';
import { EntitlementGuard } from './guards/entitlement.guard';
import { RequirePermission } from './decorators/require-entitlement.decorator';
import { CheckoutService } from './checkout.service';
import { CheckoutBodyDto } from './dto/checkout.dto';

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, EntitlementGuard)
@RequirePermission(MembershipPermissionCodes.ManageBilling)
@Controller('businesses/:businessId/billing')
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService) {}

  @Post('checkout')
  @ApiOperation({
    summary: 'Start SAAS checkout for plan + modules (OWNER / manage.billing)',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Optional idempotent checkout key',
  })
  @ApiOkResponse({ description: 'Checkout session with redirectUrl' })
  async checkoutSession(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Body() dto: CheckoutBodyDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const data = await this.checkout.startCheckout({
      businessId,
      planCode: dto.planCode,
      moduleCodes: dto.moduleCodes ?? [],
      idempotencyKey: idempotencyKey?.trim() || undefined,
    });
    return { data };
  }
}
