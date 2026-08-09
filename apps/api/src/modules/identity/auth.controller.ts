import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { RequestUser } from './auth.types';
import { IdentityService } from './identity.service';
import { AuthTokenService } from './auth-token.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly identity: IdentityService,
    private readonly tokens: AuthTokenService,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Current authenticated user' })
  @ApiOkResponse({ description: 'Public user profile' })
  async me(@CurrentUser() user: RequestUser) {
    const profile = await this.identity.getUserById(user.userId);
    return { data: profile };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke current access token (jti blacklist in Redis)' })
  @ApiOkResponse({ description: 'Logged out' })
  async logout(@CurrentUser() user: RequestUser) {
    await this.tokens.logout(user.jti);
    return { data: { ok: true as const } };
  }
}
