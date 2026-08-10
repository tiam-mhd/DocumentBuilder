import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { RequestUser } from '../identity/auth.types';
import { TenancyService } from './tenancy.service';
import { CreateBusinessDto, UpdateBusinessDto } from './dto/business.dto';

@ApiTags('businesses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses')
export class TenancyController {
  constructor(private readonly tenancy: TenancyService) {}

  @Get()
  @ApiOperation({ summary: 'List businesses for current user' })
  @ApiOkResponse({ description: 'Business list' })
  async list(@CurrentUser() user: RequestUser) {
    const data = await this.tenancy.listForUser(user.userId);
    return { data };
  }

  @Post()
  @ApiOperation({ summary: 'Create business (caller becomes OWNER)' })
  @ApiOkResponse({ description: 'Created business' })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateBusinessDto,
  ) {
    const data = await this.tenancy.create(user.userId, dto.name);
    return { data };
  }

  @Get(':businessId')
  @ApiOperation({ summary: 'Get business if member (IDOR-safe)' })
  @ApiOkResponse({ description: 'Business' })
  async get(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
  ) {
    const data = await this.tenancy.getForUser(user.userId, businessId);
    return { data };
  }

  @Get(':businessId/permissions')
  @ApiOperation({
    summary: 'List membership RBAC permissions for current user on this business',
  })
  @ApiOkResponse({ description: 'Role + permission codes' })
  async permissions(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
  ) {
    const data = await this.tenancy.getPermissions(user.userId, businessId);
    return { data };
  }

  @Patch(':businessId')
  @ApiOperation({ summary: 'Update business name (ADMIN+)' })
  @ApiOkResponse({ description: 'Updated business' })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Body() dto: UpdateBusinessDto,
  ) {
    const data = await this.tenancy.updateForAdmin(
      user.userId,
      businessId,
      dto.name,
    );
    return { data };
  }

  @Delete(':businessId')
  @ApiOperation({ summary: 'Soft-delete business (OWNER only)' })
  @ApiOkResponse({ description: 'Deleted' })
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
  ) {
    await this.tenancy.softDeleteForOwner(user.userId, businessId);
    return { data: { ok: true as const } };
  }
}
