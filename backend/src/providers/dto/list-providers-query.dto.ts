import { Transform, Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ServiceCategory } from '../schemas/provider-profile.schema.js';

export const PROVIDER_SORTS = ['rating', 'price', 'experience'] as const;
export type ProviderSort = (typeof PROVIDER_SORTS)[number];

export class ListProvidersQueryDto {
  @IsOptional()
  @IsEnum(ServiceCategory, { message: 'category must be plumbing, electrical or cleaning' })
  category?: ServiceCategory;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(60)
  search?: string;

  @IsOptional()
  @IsIn(PROVIDER_SORTS)
  sort?: ProviderSort;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
