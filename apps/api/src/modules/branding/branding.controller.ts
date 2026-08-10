import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { MembershipPermissionCodes } from '@vdb/shared-types';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { RequestUser } from '../identity/auth.types';
import { EntitlementGuard } from '../billing/guards/entitlement.guard';
import {
  RequirePermission,
  RequireWritable,
} from '../billing/decorators/require-entitlement.decorator';
import { TenancyService } from '../tenancy/tenancy.service';
import { BrandingService } from './branding.service';

class UpdateBrandingDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  primaryColor?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(253)
  customDomain?: string | null;

  @IsOptional()
  @IsBoolean()
  hidePoweredBy?: boolean;
}

@ApiTags('branding')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses/:businessId/branding')
export class BrandingController {
  constructor(
    private readonly branding: BrandingService,
    private readonly tenancy: TenancyService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get business white-label branding + capabilities' })
  @ApiOkResponse({ description: 'Branding' })
  async get(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
  ) {
    await this.tenancy.assertMembership(user.userId, businessId);
    const data = await this.branding.getForMember(businessId);
    return { data };
  }

  @Patch()
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @RequirePermission(MembershipPermissionCodes.ManageSettings)
  @ApiOperation({ summary: 'Update white-label branding (ADMIN+ + capability)' })
  async update(
    @Param('businessId') businessId: string,
    @Body() dto: UpdateBrandingDto,
  ) {
    const data = await this.branding.update({
      businessId,
      displayName: dto.displayName,
      primaryColor: dto.primaryColor,
      customDomain: dto.customDomain,
      hidePoweredBy: dto.hidePoweredBy,
    });
    return { data };
  }

  @Post('logo')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @RequirePermission(MembershipPermissionCodes.ManageSettings)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Upload branding logo (png/jpg/webp)' })
  async uploadLogo(
    @Param('businessId') businessId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const data = await this.branding.uploadLogo({ businessId, file });
    return { data };
  }

  @Delete('logo')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @RequirePermission(MembershipPermissionCodes.ManageSettings)
  @ApiOperation({ summary: 'Remove branding logo' })
  async deleteLogo(@Param('businessId') businessId: string) {
    const data = await this.branding.deleteLogo(businessId);
    return { data };
  }

  @Get('logo/file')
  @ApiOperation({ summary: 'Stream branding logo (membership)' })
  async logoFile(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Res() res: Response,
  ) {
    await this.tenancy.assertMembership(user.userId, businessId);
    const file = await this.branding.getLogoBytes(businessId);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(file.body);
  }
}

@ApiTags('branding')
@Controller('branding')
export class BrandingPublicController {
  constructor(private readonly branding: BrandingService) {}

  @Get('resolve')
  @ApiOperation({
    summary: 'Resolve branding by custom domain host (public; Web Publish)',
  })
  async resolve(@Query('host') host: string) {
    const data = await this.branding.resolveByHost(host ?? '');
    return { data };
  }
}

@ApiTags('branding')
@Controller('public/branding')
export class BrandingPublicLogoController {
  constructor(private readonly branding: BrandingService) {}

  @Get(':businessId/logo')
  @ApiOperation({ summary: 'Public branding logo bytes (no JWT)' })
  async logo(
    @Param('businessId') businessId: string,
    @Res() res: Response,
  ) {
    const file = await this.branding.getLogoBytes(businessId);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(file.body);
  }
}
