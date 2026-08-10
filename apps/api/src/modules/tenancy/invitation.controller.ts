import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { RequestUser } from '../identity/auth.types';
import { MembershipService } from './membership.service';

@ApiTags('invitations')
@Controller('invitations')
export class InvitationController {
  constructor(private readonly membership: MembershipService) {}

  @Get(':token')
  @ApiOperation({ summary: 'Preview invitation by token (public)' })
  @ApiOkResponse({ description: 'Invitation preview' })
  async preview(@Param('token') token: string) {
    const data = await this.membership.previewInvitation(token);
    return { data };
  }

  @Post(':token/accept')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Accept invitation (JWT; mobile must match invite)',
  })
  @ApiOkResponse({ description: 'Membership created' })
  async accept(
    @CurrentUser() user: RequestUser,
    @Param('token') token: string,
  ) {
    const data = await this.membership.acceptInvitation(
      user.userId,
      user.mobile,
      token,
    );
    return { data };
  }
}

@ApiTags('invitations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('me/invitations')
export class MyInvitationsController {
  constructor(private readonly membership: MembershipService) {}

  @Get()
  @ApiOperation({ summary: 'Pending invitations for signed-in mobile' })
  @ApiOkResponse({ description: 'Pending invitations' })
  async listPending(@CurrentUser() user: RequestUser) {
    const data = await this.membership.listPendingForUser(
      user.userId,
      user.mobile,
    );
    return { data };
  }
}
