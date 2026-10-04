// Pure booking-progress logic for the Customer screens (no React Native
// imports, so it is unit-tested in utils/__tests__).
//
// FR3: customers track Requested → Confirmed → On the Way → Completed and are
// notified when the status changes. Arrival information is derived only from
// real booking data (the scheduled arrival window and the status history) —
// there is no live GPS, so no live ETA is ever invented.
import type { Booking, BookingStatus } from '../types/booking';
import { daysBetween, formatBookingDate, formatDateTime, formatTimeSlot, sriLankaToday } from './dates';
import { formatLKR } from './money';

export type NoticeTone = 'success' | 'info' | 'warning' | 'danger';

export interface StatusChangeNotice {
  status: BookingStatus;
  title: string;
  message: string;
  tone: NoticeTone;
}

// Returns the new status when it differs from the previously seen one.
// `previous` is undefined on the first load, which must never notify.
export function detectStatusChange(
  previous: BookingStatus | undefined,
  next: BookingStatus,
): BookingStatus | null {
  if (previous === undefined || previous === next) return null;
  return next;
}

export function getStatusChangeNotice(booking: Booking): StatusChangeNotice | null {
  const provider = booking.provider.name;
  const when = `${formatBookingDate(booking.scheduledDate, false)}, ${formatTimeSlot(booking.timeSlot)}`;

  switch (booking.status) {
    case 'confirmed':
      return {
        status: 'confirmed',
        title: 'Booking confirmed',
        message: `${provider} accepted your booking. Expected arrival: ${when}. You can now call the provider.`,
        tone: 'success',
      };
    case 'on_the_way':
      return {
        status: 'on_the_way',
        title: 'Provider on the way',
        message: `${provider} is on the way for your ${formatTimeSlot(booking.timeSlot)} arrival window.`,
        tone: 'info',
      };
    case 'completed':
      return {
        status: 'completed',
        title: 'Service completed',
        message: `${provider} marked the job as completed. Please pay ${formatLKR(booking.pricing.total)} in cash.`,
        tone: 'success',
      };
    case 'declined':
      return {
        status: 'declined',
        title: 'Booking declined',
        message: `${provider} couldn't take this booking. You can choose another provider.`,
        tone: 'danger',
      };
    case 'cancelled':
      return {
        status: 'cancelled',
        title: 'Booking cancelled',
        message: 'This booking has been cancelled.',
        tone: 'danger',
      };
    default:
      return null;
  }
}

export type ArrivalKind = 'requested' | 'expected' | 'en_route' | 'completed';

export interface ArrivalInfo {
  kind: ArrivalKind;
  title: string;
  // Main line, e.g. "Mon, 5 Oct · 10:00 AM – 12:00 PM"
  value: string;
  // Secondary line explaining where the information comes from.
  detail: string;
}

function relativeDay(scheduledDate: string, now: Date): string | null {
  const diff = daysBetween(sriLankaToday(now).date, scheduledDate);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff > 1) return `In ${diff} days`;
  return null;
}

function reachedAt(booking: Booking, status: BookingStatus): string | undefined {
  return booking.statusHistory.find((h) => h.status === status)?.changedAt;
}

// Arrival / dispatch information for Booking Confirmation and Track Booking.
// Returns null for cancelled or declined bookings (no visit will happen).
export function getArrivalInfo(booking: Booking, now = new Date()): ArrivalInfo | null {
  const window = formatTimeSlot(booking.timeSlot);
  const date = formatBookingDate(booking.scheduledDate, false);
  const relative = relativeDay(booking.scheduledDate, now);
  const scheduled = `${relative ? `${relative} · ` : ''}${date} · ${window}`;
  const provider = booking.provider.name;

  switch (booking.status) {
    case 'requested':
      return {
        kind: 'requested',
        title: 'Requested arrival window',
        value: scheduled,
        detail: `Waiting for ${provider} to confirm. You'll be notified here when they respond.`,
      };
    case 'confirmed': {
      const at = reachedAt(booking, 'confirmed');
      return {
        kind: 'expected',
        title: 'Expected arrival',
        value: scheduled,
        detail: `${provider} confirmed${at ? ` on ${formatDateTime(at)}` : ''}. Based on your scheduled arrival window.`,
      };
    }
    case 'on_the_way': {
      const at = reachedAt(booking, 'on_the_way');
      return {
        kind: 'en_route',
        title: 'Provider on the way',
        value: `Expected within ${window}`,
        detail: `${provider} set off${at ? ` at ${formatDateTime(at)}` : ''}. Live location tracking is not available.`,
      };
    }
    case 'completed': {
      const at = reachedAt(booking, 'completed');
      return {
        kind: 'completed',
        title: 'Service completed',
        value: at ? formatDateTime(at) : date,
        detail: `Pay ${formatLKR(booking.pricing.total)} in cash to ${provider}.`,
      };
    }
    default:
      return null;
  }
}
