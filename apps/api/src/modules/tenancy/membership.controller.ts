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
import {
  CreateInvitationDto,
  UpdateMemberRoleDto,
} from './dto/membership.dto';
import { MembershipService } from './membership.service';

@ApiTags('members')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses/:businessId')
export class MembershipController {
  constructor(private readonly membership: MembershipService) {}

  @Get('members')
  @ApiOperation({ summary: 'List business members (any member)' })
  @ApiOkResponse({ description: 'Members' })
  async listMembers(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
  ) {
    const data = await this.membership.listMembers(user.userId, businessId);
    return { data };
  }

  @Patch('members/:userId')
  @ApiOperation({ summary: 'Change member role (ADMIN+; OWNER for admin targets)' })
  @ApiOkResponse({ description: 'Updated member' })
  async updateMember(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('userId') targetUserId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    const data = await this.membership.updateMemberRole(
      user.userId,
      businessId,
      targetUserId,
      dto.role,
    );
    return { data };
  }

  @Delete('members/:userId')
  @ApiOperation({ summary: 'Remove member (ADMIN+)' })
  @ApiOkResponse({ description: 'Removed' })
  async removeMember(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('userId') targetUserId: string,
  ) {
    await this.membership.removeMember(user.userId, businessId, targetUserId);
    return { data: { ok: true as const } };
  }

  @Get('invitations')
  @ApiOperation({ summary: 'List invitations (ADMIN+)' })
  @ApiOkResponse({ description: 'Invitations' })
  async listInvitations(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
  ) {
    const data = await this.membership.listInvitations(user.userId, businessId);
    return { data };
  }

  @Post('invitations')
  @ApiOperation({ summary: 'Invite member by mobile (ADMIN+; OWNER for ADMIN role)' })
  @ApiOkResponse({ description: 'Created invitation with token' })
  async createInvitation(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Body() dto: CreateInvitationDto,
  ) {
    const data = await this.membership.createInvitation(
      user.userId,
      businessId,
      dto.mobile,
      dto.role,
    );
    return { data };
  }

  @Delete('invitations/:invitationId')
  @ApiOperation({ summary: 'Revoke pending invitation (ADMIN+)' })
  @ApiOkResponse({ description: 'Revoked' })
  async revokeInvitation(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('invitationId') invitationId: string,
  ) {
    await this.membership.revokeInvitation(
      user.userId,
      businessId,
      invitationId,
    );
    return { data: { ok: true as const } };
  }
}
