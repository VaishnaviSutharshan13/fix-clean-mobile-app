import { Transform, Type } from 'class-transformer';
import { IsIn, IsMongoId, IsNotEmpty, IsString, Matches, MaxLength, ValidateNested } from 'class-validator';
import { TIME_SLOTS, type TimeSlot } from '../booking-status.js';
import { BookingAddressDto } from './booking-address.dto.js';

// The customer comes from the JWT and prices are calculated on the server,
// so neither can be supplied here.
export class CreateBookingDto {
  @IsMongoId({ message: 'Please choose a valid provider' })
  providerId: string;

  @IsMongoId({ message: 'Please choose a valid service' })
  serviceId: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be in YYYY-MM-DD format' })
  scheduledDate: string;

  @IsIn(TIME_SLOTS, { message: 'Please choose one of the available time windows' })
  timeSlot: TimeSlot;

  @ValidateNested()
  @Type(() => BookingAddressDto)
  address: BookingAddressDto;

  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Please describe the problem' })
  @MaxLength(500, { message: 'Problem description must be at most 500 characters' })
  problemDescription: string;
}
