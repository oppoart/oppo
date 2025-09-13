import { IsString, IsOptional, IsUrl, IsEnum, IsObject, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SourceType {
  WEBSITE = 'website',
  SOCIAL = 'social',
  RSS = 'rss',
  API = 'api',
}

export class ScanSourceDto {
  @ApiProperty({ description: 'URL of the source to scan' })
  @IsUrl()
  sourceUrl: string;

  @ApiPropertyOptional({ 
    description: 'Type of source',
    enum: SourceType,
    default: SourceType.WEBSITE 
  })
  @IsOptional()
  @IsEnum(SourceType)
  sourceType?: SourceType = SourceType.WEBSITE;
}

export class AddSourceDto {
  @ApiProperty({ description: 'Human-readable name for the source' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Type of source', enum: SourceType })
  @IsEnum(SourceType)
  type: SourceType;

  @ApiPropertyOptional({ description: 'Base URL for the source' })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional({ description: 'Whether the source is enabled' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;

  @ApiPropertyOptional({ description: 'Source-specific configuration' })
  @IsOptional()
  @IsObject()
  config?: any;
}

export class UpdateSourceDto {
  @ApiPropertyOptional({ description: 'Human-readable name for the source' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Base URL for the source' })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional({ description: 'Whether the source is enabled' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'Source-specific configuration' })
  @IsOptional()
  @IsObject()
  config?: any;
}
