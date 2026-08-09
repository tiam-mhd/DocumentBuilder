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
import { EntitlementCodes } from '@vdb/shared-types';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { EntitlementGuard } from '../billing/guards/entitlement.guard';
import { RequireModule } from '../billing/decorators/require-entitlement.decorator';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { RequestUser } from '../identity/auth.types';
import { TimelineService } from './timeline.service';

class CreateTimelineEventDto {
  @IsString()
  @MinLength(1)
  occurredAt!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  body?: string;

  @IsOptional()
  @IsString()
  mediaId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsObject()
  fields?: Record<string, unknown>;
}

class UpdateTimelineEventDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  occurredAt?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  body?: string;

  @IsOptional()
  @IsString()
  mediaId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsObject()
  fields?: Record<string, unknown>;
}

@ApiTags('content')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, EntitlementGuard)
@RequireModule(EntitlementCodes.ModuleTimeline)
@Controller('businesses/:businessId/timeline-events')
export class TimelineController {
  constructor(private readonly timeline: TimelineService) {}

  @Get()
  @ApiOperation({ summary: 'List timeline events (module.timeline)' })
  @ApiOkResponse({ description: 'Paginated timeline events' })
  async list(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('q') q?: string,
  ) {
    void user;
    const data = await this.timeline.list({
      businessId,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 50,
      q,
    });
    return { data };
  }

  @Get(':eventId')
  @ApiOperation({ summary: 'Get timeline event' })
  async get(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('eventId') eventId: string,
  ) {
    void user;
    const data = await this.timeline.get(businessId, eventId);
    return { data };
  }

  @Post()
  @ApiOperation({ summary: 'Create timeline event' })
  async create(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Body() body: CreateTimelineEventDto,
  ) {
    void user;
    const data = await this.timeline.create({
      businessId,
      occurredAt: body.occurredAt,
      title: body.title,
      body: body.body,
      mediaId: body.mediaId,
      sortOrder: body.sortOrder,
      fields: body.fields,
    });
    return { data };
  }

  @Patch(':eventId')
  @ApiOperation({ summary: 'Update timeline event' })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('eventId') eventId: string,
    @Body() body: UpdateTimelineEventDto,
  ) {
    void user;
    const data = await this.timeline.update({
      businessId,
      eventId,
      occurredAt: body.occurredAt,
      title: body.title,
      body: body.body,
      mediaId: body.mediaId,
      sortOrder: body.sortOrder,
      fields: body.fields,
    });
    return { data };
  }

  @Delete(':eventId')
  @ApiOperation({ summary: 'Soft-delete timeline event' })
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('eventId') eventId: string,
  ) {
    void user;
    await this.timeline.softDelete(businessId, eventId);
    return { data: { ok: true as const } };
  }
}
