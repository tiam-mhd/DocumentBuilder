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
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { EntitlementGuard } from '../billing/guards/entitlement.guard';
import { RequireWritable } from '../billing/decorators/require-entitlement.decorator';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { RequestUser } from '../identity/auth.types';
import { TenancyService } from '../tenancy/tenancy.service';
import { TemplateService } from './template.service';

class CreateTemplateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  themeId?: string | null;

  @IsOptional()
  @IsObject()
  body?: Record<string, unknown>;
}

class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsOptional()
  @IsString()
  themeId?: string | null;

  @IsOptional()
  @IsObject()
  body?: Record<string, unknown>;
}

@ApiTags('design')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses/:businessId')
export class TemplateController {
  constructor(
    private readonly templates: TemplateService,
    private readonly tenancy: TenancyService,
  ) {}

  @Get('blocks')
  @ApiOperation({ summary: 'Core block registry for templates / editor' })
  @ApiOkResponse({ description: 'Block type registry' })
  async registry(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
  ) {
    await this.tenancy.assertMembership(user.userId, businessId);
    return { data: this.templates.getRegistry() };
  }

  @Get('templates')
  @ApiOperation({ summary: 'List document templates (metadata only)' })
  async list(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
    @Query('q') q?: string,
  ) {
    await this.tenancy.assertMembership(user.userId, businessId);
    const data = await this.templates.list({
      businessId,
      page: Number(pageRaw ?? 1) || 1,
      pageSize: Number(pageSizeRaw ?? 50) || 50,
      q,
    });
    return { data };
  }

  @Post('templates')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @ApiOperation({ summary: 'Create template (PG meta + Mongo body)' })
  async create(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Body() body: CreateTemplateDto,
  ) {
    void user;
    const data = await this.templates.create({
      businessId,
      name: body.name,
      description: body.description,
      themeId: body.themeId,
      body: body.body,
    });
    return { data };
  }

  @Get('templates/:templateId')
  @ApiOperation({ summary: 'Get template metadata + Mongo body' })
  async getOne(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('templateId') templateId: string,
  ) {
    await this.tenancy.assertMembership(user.userId, businessId);
    const data = await this.templates.get(businessId, templateId);
    return { data };
  }

  @Patch('templates/:templateId')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @ApiOperation({ summary: 'Update template metadata and/or body' })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('templateId') templateId: string,
    @Body() body: UpdateTemplateDto,
  ) {
    void user;
    const data = await this.templates.update({
      businessId,
      templateId,
      name: body.name,
      description: body.description,
      themeId: body.themeId,
      body: body.body,
    });
    return { data };
  }

  @Delete('templates/:templateId')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @ApiOperation({ summary: 'Soft-delete template + remove Mongo body' })
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('templateId') templateId: string,
  ) {
    void user;
    await this.templates.softDelete(businessId, templateId);
    return { data: { ok: true as const } };
  }
}
