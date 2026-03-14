import { IsOptional, IsString } from 'class-validator';

export class CloseAccessSessionDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
