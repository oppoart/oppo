import { IsString, IsOptional, IsArray, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProfileDto {
  @ApiProperty({ description: 'Profile name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Artist mediums' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediums?: string[];

  @ApiPropertyOptional({ description: 'Artist bio' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ description: 'Artist statement' })
  @IsOptional()
  @IsString()
  artistStatement?: string;

  @ApiPropertyOptional({ description: 'Skills' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({ description: 'Interests' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @ApiPropertyOptional({ description: 'Experience description' })
  @IsOptional()
  @IsString()
  experience?: string;

  @ApiPropertyOptional({ description: 'Location' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Website URL' })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({ description: 'Portfolio URL' })
  @IsOptional()
  @IsUrl()
  portfolioUrl?: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: 'Profile name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Artist mediums' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediums?: string[];

  @ApiPropertyOptional({ description: 'Artist bio' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ description: 'Artist statement' })
  @IsOptional()
  @IsString()
  artistStatement?: string;

  @ApiPropertyOptional({ description: 'Skills' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({ description: 'Interests' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @ApiPropertyOptional({ description: 'Experience description' })
  @IsOptional()
  @IsString()
  experience?: string;

  @ApiPropertyOptional({ description: 'Location' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Website URL' })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({ description: 'Portfolio URL' })
  @IsOptional()
  @IsUrl()
  portfolioUrl?: string;
}
