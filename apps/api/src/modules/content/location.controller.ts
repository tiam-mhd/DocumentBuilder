import { MembershipPermissionCodes } from '@vdb/shared-types';
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
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { EntitlementGuard } from '../billing/guards/entitlement.guard';
import { RequireWritable, RequirePermission } from '../billing/decorators/require-entitlement.decorator';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { RequestUser } from '../identity/auth.types';
import { TenancyService } from '../tenancy/tenancy.service';
import { LocationService } from './location.service';

class CreateLocationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  province?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  address?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;
}

class UpdateLocationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  province?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  address?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;
}

@ApiTags('content')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses/:businessId/locations')
export class LocationController {
  constructor(
    private readonly locations: LocationService,
    private readonly tenancy: TenancyService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List locations' })
  @ApiOkResponse({ description: 'Paginated locations' })
  async list(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
    @Query('q') q?: string,
  ) {
    await this.tenancy.assertMembership(user.userId, businessId);
    const data = await this.locations.list({
      businessId,
      page: Number(pageRaw ?? 1) || 1,
      pageSize: Number(pageSizeRaw ?? 50) || 50,
      q,
    });
    return { data };
  }

  @Get(':locationId')
  @ApiOperation({ summary: 'Get one location' })
  async get(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
  ) {
    await this.tenancy.assertMembership(user.userId, businessId);
    const data = await this.locations.get(businessId, locationId);
    return { data };
  }

  @Post()
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @RequirePermission(MembershipPermissionCodes.ManageData)
  @ApiOperation({ summary: 'Create location' })
  async create(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Body() body: CreateLocationDto,
  ) {
    void user;
    const data = await this.locations.create({
      businessId,
      name: body.name,
      country: body.country,
      province: body.province,
      city: body.city,
      address: body.address,
      lat: body.lat,
      lng: body.lng,
    });
    return { data };
  }

  @Patch(':locationId')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @RequirePermission(MembershipPermissionCodes.ManageData)
  @ApiOperation({ summary: 'Update location' })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Body() body: UpdateLocationDto,
  ) {
    void user;
    const data = await this.locations.update({
      businessId,
      locationId,
      name: body.name,
      country: body.country,
      province: body.province,
      city: body.city,
      address: body.address,
      lat: body.lat,
      lng: body.lng,
    });
    return { data };
  }

  @Delete(':locationId')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @RequirePermission(MembershipPermissionCodes.ManageData)
  @ApiOperation({ summary: 'Soft-delete location' })
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
  ) {
    void user;
    await this.locations.softDelete(businessId, locationId);
    return { data: { ok: true as const } };
  }
}
