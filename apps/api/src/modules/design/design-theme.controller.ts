import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import type { DesignThemeTokens } from '@vdb/shared-types';
import { MembershipPermissionCodes } from '@vdb/shared-types';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { EntitlementGuard } from '../billing/guards/entitlement.guard';
import { RequireWritable, RequirePermission } from '../billing/decorators/require-entitlement.decorator';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { RequestUser } from '../identity/auth.types';
import { TenancyService } from '../tenancy/tenancy.service';
import { DesignThemeService } from './design-theme.service';
class CreateThemeDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsObject()
  tokens?: DesignThemeTokens;

  @IsOptional()
  @IsBoolean()
  makeDefault?: boolean;
}

class UpdateThemeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsObject()
  tokens?: DesignThemeTokens;
}

@ApiTags('design')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses/:businessId/themes')
export class DesignThemeController {
  constructor(
    private readonly themes: DesignThemeService,
    private readonly tenancy: TenancyService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List document brand themes (ensures default exists)',
  })
  @ApiOkResponse({ description: 'Paginated theme list' })
  async list(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
  ) {
    await this.tenancy.assertMembership(user.userId, businessId);
    const data = await this.themes.list({
      businessId,
      page: Number(pageRaw ?? 1) || 1,
      pageSize: Number(pageSizeRaw ?? 50) || 50,
    });
    return { data };
  }

  @Get('default')
  @ApiOperation({ summary: 'Get (or seed) the default document brand theme' })
  async getDefault(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
  ) {
    await this.tenancy.assertMembership(user.userId, businessId);
    const data = await this.themes.getDefault(businessId);
    return { data };
  }

  @Get(':themeId')
  @ApiOperation({ summary: 'Get one design theme' })
  async getOne(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('themeId') themeId: string,
  ) {
    await this.tenancy.assertMembership(user.userId, businessId);
    const data = await this.themes.get(businessId, themeId);
    return { data };
  }

  @Post()
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @RequirePermission(MembershipPermissionCodes.ManageThemes)
  @ApiOperation({ summary: 'Create a document brand theme' })
  async create(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Body() body: CreateThemeDto,
  ) {
    void user;
    const data = await this.themes.create({
      businessId,
      name: body.name,
      tokens: body.tokens,
      makeDefault: body.makeDefault,
    });
    return { data };
  }

  @Patch(':themeId')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @RequirePermission(MembershipPermissionCodes.ManageThemes)
  @ApiOperation({ summary: 'Update theme name and/or tokens' })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('themeId') themeId: string,
    @Body() body: UpdateThemeDto,
  ) {
    void user;
    const data = await this.themes.update({
      businessId,
      themeId,
      name: body.name,
      tokens: body.tokens,
    });
    return { data };
  }

  @Post(':themeId/default')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @RequirePermission(MembershipPermissionCodes.ManageThemes)
  @ApiOperation({ summary: 'Mark theme as Business default' })
  async setDefault(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('themeId') themeId: string,
  ) {
    void user;
    const data = await this.themes.setDefault(businessId, themeId);
    return { data };
  }

  @Delete(':themeId')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @RequirePermission(MembershipPermissionCodes.ManageThemes)
  @ApiOperation({ summary: 'Soft-delete a non-default theme' })
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('themeId') themeId: string,
  ) {
    void user;
    await this.themes.softDelete(businessId, themeId);
    return { data: { ok: true as const } };
  }
}
