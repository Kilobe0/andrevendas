import { IsString, IsNumber, IsOptional, IsBoolean, IsEnum, IsArray, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ArtworkStatus } from './artwork.schema';

export class ArtworkVariantDto {
  @IsString() name: string;
  @IsString() image: string;
  @IsOptional() @IsEnum(ArtworkStatus) status?: ArtworkStatus;
}

// O slug não é aceito da API: é sempre derivado do título pelo serviço.
export class CreateArtworkDto {
  @IsString() title: string;
  @IsOptional() @IsString() description?: string;
  @IsString() material: string;
  @IsString() dimensions: string;
  @IsOptional() @IsNumber() @Min(0) weight?: number;
  @IsOptional() @IsNumber() year?: number;
  @IsNumber() @Min(0) price: number;
  @IsOptional() @IsNumber() @Min(0) quantity?: number;
  @IsOptional() @IsEnum(ArtworkStatus) status?: ArtworkStatus;
  @IsOptional() @IsBoolean() featured?: boolean;
  @IsOptional() @IsArray() images?: string[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ArtworkVariantDto) variants?: ArtworkVariantDto[];
  @IsString() category: string;
}

export class UpdateArtworkDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() material?: string;
  @IsOptional() @IsString() dimensions?: string;
  @IsOptional() @IsNumber() @Min(0) weight?: number;
  @IsOptional() @IsNumber() year?: number;
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsNumber() @Min(0) quantity?: number;
  @IsOptional() @IsEnum(ArtworkStatus) status?: ArtworkStatus;
  @IsOptional() @IsBoolean() featured?: boolean;
  @IsOptional() @IsArray() images?: string[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ArtworkVariantDto) variants?: ArtworkVariantDto[];
  @IsOptional() @IsString() category?: string;
}

export class FilterArtworksDto {
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() material?: string;
  @IsOptional() @IsEnum(ArtworkStatus) status?: ArtworkStatus;
}
