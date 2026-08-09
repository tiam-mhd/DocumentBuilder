import { IsString, Matches, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestOtpDto {
  @ApiProperty({ example: '09121234567' })
  @IsString()
  @MinLength(10)
  @MaxLength(20)
  @Matches(/^[0-9+\-\s()]+$/, { message: 'mobile must contain digits' })
  mobile!: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '09121234567' })
  @IsString()
  @MinLength(10)
  @MaxLength(20)
  mobile!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'code must be 6 digits' })
  code!: string;
}
