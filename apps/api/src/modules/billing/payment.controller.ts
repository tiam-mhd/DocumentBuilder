import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { RequestUser } from '../identity/auth.types';
import { TenancyService } from '../tenancy/tenancy.service';
import { CheckoutService } from './checkout.service';
import { ConfirmPaymentBodyDto } from './dto/checkout.dto';

@ApiTags('billing')
@Controller('billing')
export class PaymentController {
  constructor(
    private readonly checkout: CheckoutService,
    private readonly tenancy: TenancyService,
  ) {}

  @Get('payments/callback')
  @ApiOperation({
    summary: 'Payment gateway return URL (redirects to web)',
  })
  async gatewayCallback(
    @Query('paymentId') paymentId: string | undefined,
    @Query('Authority') Authority: string | undefined,
    @Query('Status') Status: string | undefined,
    @Res() res: Response,
  ) {
    const { redirectUrl } = await this.checkout.handleGatewayCallback({
      paymentId,
      Authority,
      Status,
    });
    return res.redirect(302, redirectUrl);
  }

  @Post('webhooks/payment')
  @ApiOperation({
    summary: 'Idempotent payment webhook (Authority + optional paymentId)',
  })
  @ApiOkResponse({ description: 'Activated subscription + payment' })
  async webhook(
    @Body()
    body: {
      Authority?: string;
      gatewayRef?: string;
      paymentId?: string;
      Status?: string;
    },
  ) {
    const gatewayRef = (body.Authority ?? body.gatewayRef ?? '').trim();
    if (body.Status && body.Status.toUpperCase() !== 'OK') {
      return {
        data: { ok: false as const, reason: 'canceled' },
      };
    }
    const result = await this.checkout.confirmByGatewayRef(
      gatewayRef,
      body.paymentId,
    );
    return { data: result };
  }

  @Post('payments/confirm')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Confirm payment after return (membership required)',
  })
  @ApiOkResponse({ description: 'Payment + subscription' })
  async confirm(
    @CurrentUser() user: RequestUser,
    @Body() dto: ConfirmPaymentBodyDto,
  ) {
    const businessId = await this.checkout.getPaymentBusinessId(dto.paymentId);
    await this.tenancy.assertMembership(user.userId, businessId);
    const result = await this.checkout.confirmForMember({
      paymentId: dto.paymentId,
      gatewayRef: dto.gatewayRef,
    });
    return { data: result };
  }
}
