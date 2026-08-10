import {
  Body,
  Controller,
  Get,
  Param,
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
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { RequestUser } from '../identity/auth.types';
import { PlatformAdminGuard } from './guards/platform-admin.guard';
import { PlatformAdminService } from './platform-admin.service';
import { DunningService } from '../billing/dunning.service';

class SuspendBusinessBody {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

class RunDunningBody {
  @IsOptional()
  @IsString()
  nowIso?: string;
}

@ApiTags('platform-admin')
@ApiBearerAuth()
@Controller('platform-admin')
export class PlatformAdminController {
  constructor(
    private readonly platformAdmin: PlatformAdminService,
    private readonly dunning: DunningService,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Am I a SAAS platform admin?' })
  @ApiOkResponse({ description: 'Platform admin me' })
  async me(@CurrentUser() user: RequestUser) {
    const data = await this.platformAdmin.me(user.userId);
    return { data };
  }

  @Get('users')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiOperation({ summary: 'List platform users (minimal fields)' })
  async listUsers(
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
    @Query('q') q?: string,
  ) {
    const data = await this.platformAdmin.listUsers({
      page: Number(pageRaw ?? 1) || 1,
      pageSize: Number(pageSizeRaw ?? 20) || 20,
      q,
    });
    return { data };
  }

  @Get('businesses')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiOperation({ summary: 'List businesses' })
  async listBusinesses(
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
    @Query('q') q?: string,
    @Query('suspended') suspendedRaw?: string,
  ) {
    let suspended: boolean | undefined;
    if (suspendedRaw === 'true' || suspendedRaw === '1') suspended = true;
    if (suspendedRaw === 'false' || suspendedRaw === '0') suspended = false;
    const data = await this.platformAdmin.listBusinesses({
      page: Number(pageRaw ?? 1) || 1,
      pageSize: Number(pageSizeRaw ?? 20) || 20,
      q,
      suspended,
    });
    return { data };
  }

  @Post('businesses/:businessId/suspend')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiOperation({ summary: 'Suspend a Business' })
  async suspend(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Body() body: SuspendBusinessBody,
  ) {
    const data = await this.platformAdmin.suspendBusiness({
      businessId,
      actorUserId: user.userId,
      reason: body.reason,
    });
    return { data };
  }

  @Post('businesses/:businessId/unsuspend')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiOperation({ summary: 'Unsuspend a Business' })
  async unsuspend(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
  ) {
    const data = await this.platformAdmin.unsuspendBusiness({
      businessId,
      actorUserId: user.userId,
    });
    return { data };
  }

  @Get('subscriptions')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiOperation({ summary: 'List subscriptions' })
  async listSubscriptions(
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
    @Query('status') status?: string,
  ) {
    const data = await this.platformAdmin.listSubscriptions({
      page: Number(pageRaw ?? 1) || 1,
      pageSize: Number(pageSizeRaw ?? 20) || 20,
      status,
    });
    return { data };
  }

  @Get('jobs/failed')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiOperation({ summary: 'List failed export jobs' })
  async listFailedJobs(
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
  ) {
    const data = await this.platformAdmin.listFailedJobs({
      page: Number(pageRaw ?? 1) || 1,
      pageSize: Number(pageSizeRaw ?? 20) || 20,
    });
    return { data };
  }

  @Post('dunning/run')
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiOperation({
    summary: 'Run billing dunning tick now (optional fake clock nowIso)',
  })
  async runDunning(@Body() body: RunDunningBody) {
    const now = body.nowIso ? new Date(body.nowIso) : new Date();
    const data = await this.dunning.runTick(now);
    return { data };
  }
}
