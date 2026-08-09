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
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { EntitlementGuard } from '../billing/guards/entitlement.guard';
import { RequireWritable } from '../billing/decorators/require-entitlement.decorator';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { RequestUser } from '../identity/auth.types';
import { TenancyService } from '../tenancy/tenancy.service';
import { TeamService } from './team.service';

class CreateMemberDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  roleTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  department?: string;

  @IsOptional()
  @IsString()
  photoMediaId?: string | null;

  @IsOptional()
  @IsString()
  branchId?: string | null;

  @IsOptional()
  @IsString()
  parentMemberId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsObject()
  fields?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  translations?: Record<string, unknown>;
}

class UpdateMemberDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  roleTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  department?: string;

  @IsOptional()
  @IsString()
  photoMediaId?: string | null;

  @IsOptional()
  @IsString()
  branchId?: string | null;

  @IsOptional()
  @IsString()
  parentMemberId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsObject()
  fields?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  translations?: Record<string, unknown>;
}

class CreateBranchDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  addressLine1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  addressLine2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  province?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  postalCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  locationId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsObject()
  fields?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  translations?: Record<string, unknown>;
}

class UpdateBranchDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  addressLine1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  addressLine2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  province?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  postalCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  locationId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsObject()
  fields?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  translations?: Record<string, unknown>;
}

@ApiTags('content')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses/:businessId')
export class TeamController {
  constructor(
    private readonly team: TeamService,
    private readonly tenancy: TenancyService,
  ) {}

  @Get('team-members')
  @ApiOperation({ summary: 'List team members' })
  @ApiOkResponse({ description: 'Paginated team members' })
  async listMembers(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
    @Query('q') q?: string,
    @Query('branchId') branchId?: string,
  ) {
    await this.tenancy.assertMembership(user.userId, businessId);
    const data = await this.team.listMembers({
      businessId,
      page: Number(pageRaw ?? 1) || 1,
      pageSize: Number(pageSizeRaw ?? 50) || 50,
      q,
      branchId,
    });
    return { data };
  }

  @Get('team-members/:memberId')
  @ApiOperation({ summary: 'Get one team member' })
  async getMember(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('memberId') memberId: string,
  ) {
    await this.tenancy.assertMembership(user.userId, businessId);
    const data = await this.team.getMember(businessId, memberId);
    return { data };
  }

  @Post('team-members')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @ApiOperation({ summary: 'Create team member' })
  async createMember(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Body() body: CreateMemberDto,
  ) {
    void user;
    const data = await this.team.createMember({
      businessId,
      name: body.name,
      roleTitle: body.roleTitle,
      department: body.department,
      photoMediaId: body.photoMediaId,
      branchId: body.branchId,
      parentMemberId: body.parentMemberId,
      sortOrder: body.sortOrder,
      fields: body.fields,
      translations: body.translations,
    });
    return { data };
  }

  @Patch('team-members/:memberId')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @ApiOperation({ summary: 'Update team member' })
  async updateMember(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('memberId') memberId: string,
    @Body() body: UpdateMemberDto,
  ) {
    void user;
    const data = await this.team.updateMember({
      businessId,
      memberId,
      name: body.name,
      roleTitle: body.roleTitle,
      department: body.department,
      photoMediaId: body.photoMediaId,
      branchId: body.branchId,
      parentMemberId: body.parentMemberId,
      sortOrder: body.sortOrder,
      fields: body.fields,
      translations: body.translations,
    });
    return { data };
  }

  @Delete('team-members/:memberId')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @ApiOperation({ summary: 'Soft-delete team member' })
  async deleteMember(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('memberId') memberId: string,
  ) {
    void user;
    await this.team.softDeleteMember(businessId, memberId);
    return { data: { ok: true as const } };
  }

  @Get('branches')
  @ApiOperation({ summary: 'List branches / offices' })
  async listBranches(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
    @Query('q') q?: string,
  ) {
    await this.tenancy.assertMembership(user.userId, businessId);
    const data = await this.team.listBranches({
      businessId,
      page: Number(pageRaw ?? 1) || 1,
      pageSize: Number(pageSizeRaw ?? 50) || 50,
      q,
    });
    return { data };
  }

  @Get('branches/:branchId')
  @ApiOperation({ summary: 'Get one branch' })
  async getBranch(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('branchId') branchId: string,
  ) {
    await this.tenancy.assertMembership(user.userId, businessId);
    const data = await this.team.getBranch(businessId, branchId);
    return { data };
  }

  @Post('branches')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @ApiOperation({ summary: 'Create branch' })
  async createBranch(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Body() body: CreateBranchDto,
  ) {
    void user;
    const data = await this.team.createBranch({
      businessId,
      name: body.name,
      addressLine1: body.addressLine1,
      addressLine2: body.addressLine2,
      city: body.city,
      province: body.province,
      postalCode: body.postalCode,
      country: body.country,
      phone: body.phone,
      locationId: body.locationId,
      sortOrder: body.sortOrder,
      fields: body.fields,
      translations: body.translations,
    });
    return { data };
  }

  @Patch('branches/:branchId')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @ApiOperation({ summary: 'Update branch' })
  async updateBranch(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('branchId') branchId: string,
    @Body() body: UpdateBranchDto,
  ) {
    void user;
    const data = await this.team.updateBranch({
      businessId,
      branchId,
      name: body.name,
      addressLine1: body.addressLine1,
      addressLine2: body.addressLine2,
      city: body.city,
      province: body.province,
      postalCode: body.postalCode,
      country: body.country,
      phone: body.phone,
      locationId: body.locationId,
      sortOrder: body.sortOrder,
      fields: body.fields,
      translations: body.translations,
    });
    return { data };
  }

  @Delete('branches/:branchId')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @ApiOperation({ summary: 'Soft-delete branch' })
  async deleteBranch(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('branchId') branchId: string,
  ) {
    void user;
    await this.team.softDeleteBranch(businessId, branchId);
    return { data: { ok: true as const } };
  }
}
