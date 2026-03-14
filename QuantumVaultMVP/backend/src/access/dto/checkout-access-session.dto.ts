import { IsBase64, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CheckoutAccessSessionDto {
  @IsString()
  sessionToken: string;

  @IsUUID()
  credentialId: string;

  @IsString()
  @MaxLength(64)
  deviceKeyAlgorithm: string;

  @IsBase64()
  devicePublicKey: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  agentVersion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  workspaceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  reason?: string;
}
