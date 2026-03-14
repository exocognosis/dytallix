import { IsIn, IsOptional, IsString } from 'class-validator';

export class ViewAccessSessionDto {
  @IsString()
  sessionToken: string;

  @IsOptional()
  @IsString()
  @IsIn(['inline', 'download'])
  mode?: 'inline' | 'download';
}
