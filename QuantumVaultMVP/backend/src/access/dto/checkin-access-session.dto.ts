import { IsBase64, IsOptional, IsString, MaxLength } from 'class-validator';

export class CheckinAccessSessionDto {
  @IsString()
  sessionToken: string;

  @IsString()
  checkoutBundleId: string;

  @IsBase64()
  contentBase64: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  contentSha256?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  mediaType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  agentVersion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  editor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  reason?: string;
}
