// What a notification is about. Booking types mirror the booking status that
// triggered them; provider_* types come from the admin verification review.
export enum NotificationType {
  BookingRequested = 'booking_requested',
  BookingConfirmed = 'booking_confirmed',
  BookingDeclined = 'booking_declined',
  BookingOnTheWay = 'booking_on_the_way',
  BookingCompleted = 'booking_completed',
  BookingCancelled = 'booking_cancelled',
  ProviderVerified = 'provider_verified',
  ProviderRejected = 'provider_rejected',
}
