import { ArrayUnique, IsArray, IsOptional, IsString, MinLength } from 'class-validator';

export class CheckoutBodyDto {
  @IsString()
  @MinLength(1)
  planCode!: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  moduleCodes?: string[];
}

export class ConfirmPaymentBodyDto {
  @IsString()
  @MinLength(1)
  paymentId!: string;

  @IsOptional()
  @IsString()
  gatewayRef?: string;
}
