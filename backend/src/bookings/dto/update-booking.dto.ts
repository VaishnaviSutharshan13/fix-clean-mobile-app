import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { TIME_SLOTS, type TimeSlot } from '../booking-status.js';
import { BookingAddressDto } from './booking-address.dto.js';

// Customers may change the details of a booking that is still "requested".
// The provider cannot be changed — that would be a different booking.
export class UpdateBookingDto {
  @IsOptional()
  @IsMongoId({ message: 'Please choose a valid service' })
  serviceId?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be in YYYY-MM-DD format' })
  scheduledDate?: string;

  @IsOptional()
  @IsIn(TIME_SLOTS, { message: 'Please choose one of the available time windows' })
  timeSlot?: TimeSlot;

  @IsOptional()
  @ValidateNested()
  @Type(() => BookingAddressDto)
  address?: BookingAddressDto;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Please describe the problem' })
  @MaxLength(500, { message: 'Problem description must be at most 500 characters' })
  problemDescription?: string;
}
