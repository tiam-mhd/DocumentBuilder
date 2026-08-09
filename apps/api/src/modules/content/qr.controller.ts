import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { QR_TARGET_TYPES } from '@vdb/document-schema';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { RequestUser } from '../identity/auth.types';
import { TenancyService } from '../tenancy/tenancy.service';
import { QrService } from './qr.service';

class EncodeQrDto {
  @IsString()
  @IsIn([...QR_TARGET_TYPES])
  targetType!: (typeof QR_TARGET_TYPES)[number];

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  value!: string;

  @IsOptional()
  @IsInt()
  @Min(64)
  @Max(512)
  sizePx?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  caption?: string;
}

/**
 * Core QR encode for editor preview. Membership only (read-only subs can preview).
 * PDF export uses QrService directly — see ADR 011.
 */
@ApiTags('content')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses/:businessId/qr')
export class QrController {
  constructor(
    private readonly qr: QrService,
    private readonly tenancy: TenancyService,
  ) {}

  @Post('encode')
  @ApiOperation({
    summary: 'Encode QR PNG data URL from target props (core block)',
  })
  @ApiOkResponse({ description: 'payload + dataUrl' })
  async encode(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Body() body: EncodeQrDto,
  ) {
    await this.tenancy.assertMembership(user.userId, businessId);
    const data = await this.qr.encodeFromProps({
      targetType: body.targetType,
      value: body.value,
      sizePx: body.sizePx ?? 128,
      caption: body.caption ?? '',
    });
    return { data };
  }
}
