import { Transform } from 'class-transformer';
import { IsEnum, IsMongoId, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ComplaintCategory } from '../complaint-status.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

// Customer complaint about one of their own bookings. The customer and the
// provider are always taken from the JWT and the booking, never from the body.
export class CreateComplaintDto {
  @IsMongoId({ message: 'Please choose the booking this complaint is about' })
  bookingId: string;

  @IsEnum(ComplaintCategory, { message: 'Please choose a complaint category' })
  category: ComplaintCategory;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Subject is required' })
  @MinLength(5, { message: 'Subject must be at least 5 characters' })
  @MaxLength(100, { message: 'Subject must be at most 100 characters' })
  subject: string;

  @Transform(trim)
  @IsString()
  @MinLength(10, { message: 'Please describe the problem (at least 10 characters)' })
  @MaxLength(1000, { message: 'Description must be at most 1000 characters' })
  description: string;
}
