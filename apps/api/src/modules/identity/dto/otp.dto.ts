import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RequestOtpDto {
  @IsString()
  @MinLength(10)
  @MaxLength(20)
  mobile!: string;
}

export class VerifyOtpDto {
  @IsString()
  @MinLength(10)
  @MaxLength(20)
  mobile!: string;

  @IsString()
  @Matches(/^\d{4,8}$/)
  code!: string;
}

export class LoginOptionsDto {
  @IsString()
  @MinLength(10)
  @MaxLength(20)
  mobile!: string;
}

export class PasswordLoginDto {
  @IsString()
  @MinLength(10)
  @MaxLength(20)
  mobile!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}

export class SetPasswordDto {
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  /** Required when a password already exists. */
  @IsOptional()
  @IsString()
  @MaxLength(128)
  currentPassword?: string;
}

export class TwoFactorToggleDto {
  @IsBoolean()
  enabled!: boolean;
}

export class TwoFactorVerifyDto {
  @IsString()
  @MinLength(16)
  @MaxLength(128)
  challengeToken!: string;

  @IsString()
  @Matches(/^\d{4,8}$/)
  code!: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  jobTitle?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string | null;
}
