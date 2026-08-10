import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuditModule } from '../audit/audit.module';
import { IdentityController } from './identity.controller';
import { AuthController } from './auth.controller';
import { IdentityService } from './identity.service';
import { OtpChallengeStore } from './otp-challenge.store';
import { TwoFactorChallengeStore } from './two-factor-challenge.store';
import { FakeSmsSender } from './sms/fake-sms.sender';
import { ParsgreenSmsSender } from './sms/parsgreen-sms.sender';
import { SMS_SENDER } from './sms/sms-sender';
import { AuthTokenService } from './auth-token.service';
import { TokenBlacklistStore } from './token-blacklist.store';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
    forwardRef(() => AuditModule),
  ],
  controllers: [IdentityController, AuthController],
  providers: [
    IdentityService,
    OtpChallengeStore,
    TwoFactorChallengeStore,
    FakeSmsSender,
    ParsgreenSmsSender,
    AuthTokenService,
    TokenBlacklistStore,
    JwtStrategy,
    JwtAuthGuard,
    {
      provide: SMS_SENDER,
      inject: [ConfigService, FakeSmsSender, ParsgreenSmsSender],
      useFactory: (
        config: ConfigService,
        fake: FakeSmsSender,
        parsgreen: ParsgreenSmsSender,
      ) => {
        const provider = config.get<string>('SMS_PROVIDER', 'fake');
        if (provider === 'parsgreen') {
          return parsgreen;
        }
        return fake;
      },
    },
  ],
  exports: [
    IdentityService,
    JwtAuthGuard,
    AuthTokenService,
    FakeSmsSender,
    SMS_SENDER,
  ],
})
export class IdentityModule {}
