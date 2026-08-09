import { Body, Controller, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IdentityService } from './identity.service';
import { RequestOtpDto, VerifyOtpDto } from './dto/otp.dto';

@ApiTags('auth')
@Controller('auth/otp')
export class IdentityController {
  constructor(private readonly identity: IdentityService) {}

  @Post('request')
  @ApiOperation({ summary: 'Request mobile OTP (rate-limited)' })
  @ApiOkResponse({ description: 'OTP challenge created' })
  async request(@Body() dto: RequestOtpDto) {
    const data = await this.identity.requestOtp(dto.mobile);
    return { data };
  }

  @Post('verify')
  @ApiOperation({
    summary: 'Verify OTP, upsert user, issue access JWT',
  })
  @ApiOkResponse({ description: 'User verified with access token' })
  async verify(@Body() dto: VerifyOtpDto) {
    const data = await this.identity.verifyOtp(dto.mobile, dto.code);
    return { data };
  }
}
