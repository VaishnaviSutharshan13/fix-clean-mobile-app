import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export const MAX_SERVICES = 10;

export class ServiceItemDto {
  // Present when editing an existing service; keeps its id stable for bookings.
  @IsOptional()
  @IsMongoId({ message: 'Unknown service' })
  id?: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Service name is required' })
  @MinLength(3, { message: 'Service name must be at least 3 characters' })
  @MaxLength(60, { message: 'Service name must be at most 60 characters' })
  name: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200, { message: 'Service description must be at most 200 characters' })
  description?: string;

  // Base price in whole LKR.
  @Type(() => Number)
  @IsInt({ message: 'Service price must be a whole number of rupees' })
  @Min(100, { message: 'Service price must be at least Rs. 100' })
  @Max(1_000_000, { message: 'Service price must be at most Rs. 1,000,000' })
  price: number;
}

// Services & Rates (on Manage Availability): the provider's proposed services,
// approved by an administrator as part of verification.
export class UpdateServicesDto {
  @Type(() => Number)
  @IsInt({ message: 'Visiting fee must be a whole number of rupees' })
  @Min(0, { message: 'Visiting fee cannot be negative' })
  @Max(10_000, { message: 'Visiting fee must be at most Rs. 10,000' })
  visitFee: number;

  @IsArray()
  @ArrayMinSize(1, { message: 'Add at least one service' })
  @ArrayMaxSize(MAX_SERVICES, { message: `You can list up to ${MAX_SERVICES} services` })
  @ValidateNested({ each: true })
  @Type(() => ServiceItemDto)
  services: ServiceItemDto[];
}
