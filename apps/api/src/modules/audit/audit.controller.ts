import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { RequestUser } from '../identity/auth.types';
import { TenancyService } from '../tenancy/tenancy.service';
import { AuditService } from './audit.service';

class ListAuditEventsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  action?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  entityType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  from?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  to?: string;
}

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses/:businessId/audit-events')
export class AuditController {
  constructor(
    private readonly audit: AuditService,
    private readonly tenancy: TenancyService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'List audit events for a business (OWNER/ADMIN; tenant-scoped + safe login/license)',
  })
  @ApiOkResponse({ description: 'Paginated audit events' })
  async list(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Query() query: ListAuditEventsQueryDto,
  ) {
    await this.tenancy.assertApprover(user.userId, businessId);
    const data = await this.audit.listForBusiness({
      businessId,
      page: query.page,
      pageSize: query.pageSize,
      action: query.action,
      entityType: query.entityType,
      from: query.from,
      to: query.to,
    });
    return { data };
  }
}
