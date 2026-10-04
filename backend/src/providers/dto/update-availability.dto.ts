import { ArrayMaxSize, ArrayUnique, IsArray, IsBoolean, IsIn, IsInt, Max, Min } from 'class-validator';
import { TIME_SLOTS } from '../../bookings/booking-status.js';

// Manage Availability (FR5): the full availability state, saved together.
export class UpdateAvailabilityDto {
  @IsBoolean({ message: 'Duty status must be on or off' })
  isAvailable: boolean;

  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  workingDays: number[];

  @IsArray()
  @ArrayUnique()
  @IsIn(TIME_SLOTS, { each: true, message: 'Unknown shift window' })
  timeSlots: string[];
}
