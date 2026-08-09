import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBusinessDto {
  @ApiProperty({ example: 'Acme Co' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;
}

export class UpdateBusinessDto {
  @ApiPropertyOptional({ example: 'Acme Co' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;
}
