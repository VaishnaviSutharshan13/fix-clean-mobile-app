// Pure notification helpers (no React Native imports, unit-tested in
// utils/__tests__/notifications.test.ts).
import type { BookingStatus } from '../types/booking';
import type { AppNotification, NotificationType } from '../types/notification';
import type { NoticeTone, StatusChangeNotice } from './bookingProgress';

// Customer-facing booking notifications and how the Track Booking banner shows them.
const BOOKING_NOTICES: Partial<Record<NotificationType, { status: BookingStatus; tone: NoticeTone }>> = {
  booking_confirmed: { status: 'confirmed', tone: 'success' },
  booking_on_the_way: { status: 'on_the_way', tone: 'info' },
  booking_completed: { status: 'completed', tone: 'success' },
  booking_declined: { status: 'declined', tone: 'danger' },
  booking_cancelled: { status: 'cancelled', tone: 'danger' },
};

export interface StoredNotice extends StatusChangeNotice {
  // Every unread notification the banner stands for (marked read on dismiss).
  ids: string[];
}

// The newest unread booking notification as a banner notice. Older unread
// updates for the same booking are superseded by it, so they are included in
// `ids` and marked read together.
export function latestUnreadNotice(items: AppNotification[], hiddenIds: ReadonlySet<string> = new Set()): StoredNotice | null {
  const unread = items.filter((n) => !n.read && !hiddenIds.has(n.id) && BOOKING_NOTICES[n.type]);
  const newest = unread.reduce<AppNotification | null>(
    (best, n) => (!best || n.createdAt > best.createdAt ? n : best),
    null,
  );
  if (!newest) return null;
  const meta = BOOKING_NOTICES[newest.type]!;
  return {
    status: meta.status,
    tone: meta.tone,
    title: newest.title,
    message: newest.message,
    ids: unread.map((n) => n.id),
  };
}
