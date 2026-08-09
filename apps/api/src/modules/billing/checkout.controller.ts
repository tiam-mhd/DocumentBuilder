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
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { RequestUser } from '../identity/auth.types';
import { TenancyService } from '../tenancy/tenancy.service';
import { CheckoutService } from './checkout.service';
import { CheckoutBodyDto } from './dto/checkout.dto';

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses/:businessId/billing')
export class CheckoutController {
  constructor(
    private readonly tenancy: TenancyService,
    private readonly checkout: CheckoutService,
  ) {}

  @Post('checkout')
  @ApiOperation({ summary: 'Start SAAS checkout for plan + modules' })
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
    await this.tenancy.assertMembership(user.userId, businessId);
    const data = await this.checkout.startCheckout({
      businessId,
      planCode: dto.planCode,
      moduleCodes: dto.moduleCodes ?? [],
      idempotencyKey: idempotencyKey?.trim() || undefined,
    });
    return { data };
  }
}
