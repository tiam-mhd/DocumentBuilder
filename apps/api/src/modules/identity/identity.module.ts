import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { IdentityController } from './identity.controller';
import { AuthController } from './auth.controller';
import { IdentityService } from './identity.service';
import { OtpChallengeStore } from './otp-challenge.store';
import { FakeSmsSender } from './sms/fake-sms.sender';
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
  ],
  controllers: [IdentityController, AuthController],
  providers: [
    IdentityService,
    OtpChallengeStore,
    FakeSmsSender,
    AuthTokenService,
    TokenBlacklistStore,
    JwtStrategy,
    JwtAuthGuard,
    {
      provide: SMS_SENDER,
      inject: [ConfigService, FakeSmsSender],
      useFactory: (config: ConfigService, fake: FakeSmsSender) => {
        const provider = config.get<string>('SMS_PROVIDER', 'fake');
        if (provider === 'fake') {
          return fake;
        }
        return fake;
      },
    },
  ],
  exports: [IdentityService, JwtAuthGuard, AuthTokenService, FakeSmsSender],
})
export class IdentityModule {}
