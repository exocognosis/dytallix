import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class SetLegalHoldDto {
  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}
