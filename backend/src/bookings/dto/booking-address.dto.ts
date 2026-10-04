import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class BookingAddressDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Street address is required' })
  @MaxLength(150)
  street: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'City is required' })
  @MaxLength(60)
  city: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  landmark?: string;
}
