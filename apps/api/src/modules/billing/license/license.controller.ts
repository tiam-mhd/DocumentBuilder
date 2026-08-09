import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../../identity/guards/jwt-auth.guard';
import { CurrentUser } from '../../identity/decorators/current-user.decorator';
import type { RequestUser } from '../../identity/auth.types';
import { LicenseService } from './license.service';

class ActivateLicenseDto {
  @IsString()
  @MinLength(8)
  licenseKey!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  organizationName?: string;
}

@ApiTags('system')
@Controller('system/license')
export class LicenseController {
  constructor(private readonly licenses: LicenseService) {}

  @Get()
  @ApiOperation({
    summary: 'Installation license status (no secrets)',
  })
  @ApiOkResponse({ description: 'License status' })
  async status() {
    const data = await this.licenses.getPublicStatus();
    return { data };
  }

  @Post('activate')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Activate SELF_HOSTED installation license (hashed at rest)',
  })
  @ApiOkResponse({ description: 'Activated license status' })
  async activate(
    @CurrentUser() user: RequestUser,
    @Body() dto: ActivateLicenseDto,
  ) {
    const data = await this.licenses.activate({
      licenseKey: dto.licenseKey,
      organizationName: dto.organizationName,
      userId: user.userId,
    });
    return { data };
  }
}
