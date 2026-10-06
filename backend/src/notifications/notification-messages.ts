import { BookingStatus } from '../bookings/booking-status.js';
import { NotificationType } from './notification-type.js';

// Pure text builders for notifications (unit-tested in notification-messages.spec.ts).
// Customer texts match the Track Booking banner (frontend/utils/bookingProgress.ts).

export interface BookingFacts {
  reference: string;
  serviceName: string;
  scheduledDate: string; // YYYY-MM-DD
  timeSlot: string; // "10:00-12:00"
  total: number;
  customerName: string;
  providerName: string;
}

export interface NotificationContent {
  // Who receives it: the booking's customer or its provider.
  to: 'customer' | 'provider';
  type: NotificationType;
  title: string;
  message: string;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "2026-10-08" → "Thu, 8 Oct"
export function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d!));
  return `${WEEKDAYS[date.getUTCDay()]}, ${d} ${MONTHS[m! - 1]}`;
}

// "10:00-12:00" → "10:00 AM – 12:00 PM"
export function formatSlot(slot: string): string {
  return slot
    .split('-')
    .map((part) => {
      const [h, m] = part.split(':').map(Number);
      const hour12 = h! % 12 === 0 ? 12 : h! % 12;
      return `${hour12}:${String(m).padStart(2, '0')} ${h! >= 12 ? 'PM' : 'AM'}`;
    })
    .join(' – ');
}

export function formatLKR(amount: number): string {
  return `Rs. ${String(Math.round(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

// The notification for a booking that has just moved to `status`, or null if
// that status doesn't notify anyone.
export function bookingNotification(status: BookingStatus, b: BookingFacts): NotificationContent | null {
  const when = `${formatDate(b.scheduledDate)}, ${formatSlot(b.timeSlot)}`;
  switch (status) {
    case BookingStatus.Requested:
      return {
        to: 'provider',
        type: NotificationType.BookingRequested,
        title: 'New booking request',
        message: `${b.customerName} requested ${b.serviceName} for ${when} (${b.reference}).`,
      };
    case BookingStatus.Confirmed:
      return {
        to: 'customer',
        type: NotificationType.BookingConfirmed,
        title: 'Booking confirmed',
        message: `${b.providerName} accepted your booking. Expected arrival: ${when}. You can now call the provider.`,
      };
    case BookingStatus.OnTheWay:
      return {
        to: 'customer',
        type: NotificationType.BookingOnTheWay,
        title: 'Provider on the way',
        message: `${b.providerName} is on the way for your ${formatSlot(b.timeSlot)} arrival window.`,
      };
    case BookingStatus.Completed:
      return {
        to: 'customer',
        type: NotificationType.BookingCompleted,
        title: 'Service completed',
        message: `${b.providerName} marked the job as completed. Please pay ${formatLKR(b.total)} in cash.`,
      };
    case BookingStatus.Declined:
      return {
        to: 'customer',
        type: NotificationType.BookingDeclined,
        title: 'Booking declined',
        message: `${b.providerName} couldn't take this booking. You can choose another provider.`,
      };
    case BookingStatus.Cancelled:
      return {
        to: 'provider',
        type: NotificationType.BookingCancelled,
        title: 'Booking cancelled',
        message: `${b.customerName} cancelled booking ${b.reference} for ${when}.`,
      };
    default:
      return null;
  }
}

export function verificationNotification(
  verified: boolean,
  reason?: string,
): Omit<NotificationContent, 'to'> {
  return verified
    ? {
        type: NotificationType.ProviderVerified,
        title: 'Profile verified',
        message: 'Your provider profile has been approved. Customers can now find and book you.',
      }
    : {
        type: NotificationType.ProviderRejected,
        title: 'Verification not approved',
        message: `Your provider application was not approved.${reason ? ` Reason: ${reason}` : ''}`,
      };
}
