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
import { ProfileContentService } from './profile-content.service';

class CreateServiceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsString()
  iconMediaId?: string | null;

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

class UpdateServiceDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsString()
  iconMediaId?: string | null;

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

class CreateClientDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  website?: string;

  @IsOptional()
  @IsString()
  logoMediaId?: string | null;

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

class UpdateClientDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  website?: string;

  @IsOptional()
  @IsString()
  logoMediaId?: string | null;

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

class CreateCertificateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  issuer?: string;

  @IsOptional()
  @IsString()
  issuedAt?: string | null;

  @IsOptional()
  @IsString()
  expiresAt?: string | null;

  @IsOptional()
  @IsString()
  documentMediaId?: string | null;

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

class UpdateCertificateDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  issuer?: string;

  @IsOptional()
  @IsString()
  issuedAt?: string | null;

  @IsOptional()
  @IsString()
  expiresAt?: string | null;

  @IsOptional()
  @IsString()
  documentMediaId?: string | null;

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
export class ProfileContentController {
  constructor(
    private readonly profile: ProfileContentService,
    private readonly tenancy: TenancyService,
  ) {}

  @Get('services')
  @ApiOperation({ summary: 'List business services' })
  @ApiOkResponse({ description: 'Paginated services' })
  async listServices(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
    @Query('q') q?: string,
  ) {
    await this.tenancy.assertMembership(user.userId, businessId);
    const data = await this.profile.listServices({
      businessId,
      page: Number(pageRaw ?? 1) || 1,
      pageSize: Number(pageSizeRaw ?? 50) || 50,
      q,
    });
    return { data };
  }

  @Get('services/:serviceId')
  @ApiOperation({ summary: 'Get one service' })
  async getService(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('serviceId') serviceId: string,
  ) {
    await this.tenancy.assertMembership(user.userId, businessId);
    const data = await this.profile.getService(businessId, serviceId);
    return { data };
  }

  @Post('services')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @ApiOperation({ summary: 'Create service' })
  async createService(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Body() body: CreateServiceDto,
  ) {
    void user;
    const data = await this.profile.createService({
      businessId,
      name: body.name,
      description: body.description,
      iconMediaId: body.iconMediaId,
      sortOrder: body.sortOrder,
      fields: body.fields,
      translations: body.translations,
    });
    return { data };
  }

  @Patch('services/:serviceId')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @ApiOperation({ summary: 'Update service' })
  async updateService(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('serviceId') serviceId: string,
    @Body() body: UpdateServiceDto,
  ) {
    void user;
    const data = await this.profile.updateService({
      businessId,
      serviceId,
      name: body.name,
      description: body.description,
      iconMediaId: body.iconMediaId,
      sortOrder: body.sortOrder,
      fields: body.fields,
      translations: body.translations,
    });
    return { data };
  }

  @Delete('services/:serviceId')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @ApiOperation({ summary: 'Soft-delete service' })
  async deleteService(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('serviceId') serviceId: string,
  ) {
    void user;
    await this.profile.softDeleteService(businessId, serviceId);
    return { data: { ok: true as const } };
  }

  @Get('clients')
  @ApiOperation({ summary: 'List clients / partners' })
  async listClients(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
    @Query('q') q?: string,
  ) {
    await this.tenancy.assertMembership(user.userId, businessId);
    const data = await this.profile.listClients({
      businessId,
      page: Number(pageRaw ?? 1) || 1,
      pageSize: Number(pageSizeRaw ?? 50) || 50,
      q,
    });
    return { data };
  }

  @Get('clients/:clientId')
  @ApiOperation({ summary: 'Get one client' })
  async getClient(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('clientId') clientId: string,
  ) {
    await this.tenancy.assertMembership(user.userId, businessId);
    const data = await this.profile.getClient(businessId, clientId);
    return { data };
  }

  @Post('clients')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @ApiOperation({ summary: 'Create client' })
  async createClient(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Body() body: CreateClientDto,
  ) {
    void user;
    const data = await this.profile.createClient({
      businessId,
      name: body.name,
      website: body.website,
      logoMediaId: body.logoMediaId,
      sortOrder: body.sortOrder,
      fields: body.fields,
      translations: body.translations,
    });
    return { data };
  }

  @Patch('clients/:clientId')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @ApiOperation({ summary: 'Update client' })
  async updateClient(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('clientId') clientId: string,
    @Body() body: UpdateClientDto,
  ) {
    void user;
    const data = await this.profile.updateClient({
      businessId,
      clientId,
      name: body.name,
      website: body.website,
      logoMediaId: body.logoMediaId,
      sortOrder: body.sortOrder,
      fields: body.fields,
      translations: body.translations,
    });
    return { data };
  }

  @Delete('clients/:clientId')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @ApiOperation({ summary: 'Soft-delete client' })
  async deleteClient(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('clientId') clientId: string,
  ) {
    void user;
    await this.profile.softDeleteClient(businessId, clientId);
    return { data: { ok: true as const } };
  }

  @Get('certificates')
  @ApiOperation({ summary: 'List certificates' })
  async listCertificates(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
    @Query('q') q?: string,
  ) {
    await this.tenancy.assertMembership(user.userId, businessId);
    const data = await this.profile.listCertificates({
      businessId,
      page: Number(pageRaw ?? 1) || 1,
      pageSize: Number(pageSizeRaw ?? 50) || 50,
      q,
    });
    return { data };
  }

  @Get('certificates/:certificateId')
  @ApiOperation({ summary: 'Get one certificate' })
  async getCertificate(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('certificateId') certificateId: string,
  ) {
    await this.tenancy.assertMembership(user.userId, businessId);
    const data = await this.profile.getCertificate(businessId, certificateId);
    return { data };
  }

  @Post('certificates')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @ApiOperation({ summary: 'Create certificate' })
  async createCertificate(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Body() body: CreateCertificateDto,
  ) {
    void user;
    const data = await this.profile.createCertificate({
      businessId,
      name: body.name,
      issuer: body.issuer,
      issuedAt: body.issuedAt,
      expiresAt: body.expiresAt,
      documentMediaId: body.documentMediaId,
      sortOrder: body.sortOrder,
      fields: body.fields,
      translations: body.translations,
    });
    return { data };
  }

  @Patch('certificates/:certificateId')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @ApiOperation({ summary: 'Update certificate' })
  async updateCertificate(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('certificateId') certificateId: string,
    @Body() body: UpdateCertificateDto,
  ) {
    void user;
    const data = await this.profile.updateCertificate({
      businessId,
      certificateId,
      name: body.name,
      issuer: body.issuer,
      issuedAt: body.issuedAt,
      expiresAt: body.expiresAt,
      documentMediaId: body.documentMediaId,
      sortOrder: body.sortOrder,
      fields: body.fields,
      translations: body.translations,
    });
    return { data };
  }

  @Delete('certificates/:certificateId')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @ApiOperation({ summary: 'Soft-delete certificate' })
  async deleteCertificate(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('certificateId') certificateId: string,
  ) {
    void user;
    await this.profile.softDeleteCertificate(businessId, certificateId);
    return { data: { ok: true as const } };
  }
}
