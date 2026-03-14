import { AccessAction } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class RequestAccessDto {
  @IsUUID()
  pipelineAssetId: string;

  @IsEnum(AccessAction)
  action: AccessAction;

  @IsOptional()
  @IsInt()
  @Min(300)
  @Max(86400)
  ttlSeconds?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
