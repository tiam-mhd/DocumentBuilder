import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { IdentityService } from './identity.service';
import {
  LoginOptionsDto,
  PasswordLoginDto,
  RequestOtpDto,
  SetPasswordDto,
  TwoFactorToggleDto,
  TwoFactorVerifyDto,
  VerifyOtpDto,
} from './dto/otp.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { RequestUser } from './auth.types';

@ApiTags('auth')
@Controller('auth')
export class IdentityController {
  constructor(private readonly identity: IdentityService) {}

  @Post('login/options')
  @ApiOperation({ summary: 'Discover OTP / password / 2FA options for mobile' })
  @ApiOkResponse({ description: 'Available login methods' })
  async loginOptions(@Body() dto: LoginOptionsDto) {
    const data = await this.identity.getLoginOptions(dto.mobile);
    return { data };
  }

  @Post('otp/request')
  @ApiOperation({ summary: 'Request mobile OTP (rate-limited)' })
  @ApiOkResponse({ description: 'OTP challenge created' })
  async request(@Body() dto: RequestOtpDto) {
    const data = await this.identity.requestOtp(dto.mobile);
    return { data };
  }

  @Post('otp/verify')
  @ApiOperation({
    summary: 'Verify OTP, upsert user, issue access JWT',
  })
  @ApiOkResponse({ description: 'User verified with access token' })
  async verify(@Body() dto: VerifyOtpDto) {
    const data = await this.identity.verifyOtp(dto.mobile, dto.code);
    return { data };
  }

  @Post('password/login')
  @ApiOperation({
    summary:
      'Password login; returns tokens or requiresOtp+challengeToken when 2FA on',
  })
  @ApiOkResponse({ description: 'Tokens or 2FA challenge' })
  async passwordLogin(@Body() dto: PasswordLoginDto) {
    const data = await this.identity.loginWithPassword(
      dto.mobile,
      dto.password,
    );
    return { data };
  }

  @Post('2fa/verify')
  @ApiOperation({ summary: 'Complete password+OTP two-factor login' })
  @ApiOkResponse({ description: 'Access token after 2FA' })
  async verifyTwoFactor(@Body() dto: TwoFactorVerifyDto) {
    const data = await this.identity.verifyTwoFactor(
      dto.challengeToken,
      dto.code,
    );
    return { data };
  }

  @Post('password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set or change account password' })
  @ApiOkResponse({ description: 'Updated public user' })
  async setPassword(
    @CurrentUser() user: RequestUser,
    @Body() dto: SetPasswordDto,
  ) {
    const data = await this.identity.setPassword(
      user.userId,
      dto.password,
      dto.currentPassword,
    );
    return { data };
  }

  @Post('2fa')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enable or disable password+OTP two-factor' })
  @ApiOkResponse({ description: 'Updated public user' })
  async setTwoFactor(
    @CurrentUser() user: RequestUser,
    @Body() dto: TwoFactorToggleDto,
  ) {
    const data = await this.identity.setTwoFactorEnabled(
      user.userId,
      dto.enabled,
    );
    return { data };
  }
}
