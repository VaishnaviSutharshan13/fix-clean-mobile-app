import { IsMongoId, IsOptional } from 'class-validator';

export class ListNotificationsQueryDto {
  // Only notifications about this booking (Track Booking). The booking is not
  // looked up: results are always limited to the caller's own notifications.
  @IsOptional()
  @IsMongoId({ message: 'bookingId must be a valid id' })
  bookingId?: string;
}
