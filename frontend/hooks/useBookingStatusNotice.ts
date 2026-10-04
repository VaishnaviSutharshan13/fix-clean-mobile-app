import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Vibration } from 'react-native';

import type { Booking, BookingStatus } from '../types/booking';
import { detectStatusChange, getStatusChangeNotice, type StatusChangeNotice } from '../utils/bookingProgress';

// FR3: shows an in-app notice when a polled booking's status changes.
// - The first load only records the status (no false notification).
// - Each change is reported once; unchanged polls are ignored.
// - Changes the customer made themselves can be acknowledged with markSeen().
export function useBookingStatusNotice(booking: Booking | undefined) {
  const lastSeen = useRef<{ id: string; status: BookingStatus } | null>(null);
  const [notice, setNotice] = useState<StatusChangeNotice | null>(null);

  useEffect(() => {
    if (!booking) return;
    const sameBooking = lastSeen.current?.id === booking.id;
    const previous = sameBooking ? lastSeen.current!.status : undefined;
    lastSeen.current = { id: booking.id, status: booking.status };

    // The screen can be reused for a different booking (e.g. a deep link);
    // never carry a notice over from the previous one.
    if (!sameBooking) setNotice(null);

    if (!detectStatusChange(previous, booking.status)) return;
    const next = getStatusChangeNotice(booking);
    if (!next) return;

    setNotice(next);
    Vibration.vibrate(200);
    AccessibilityInfo.announceForAccessibility(`${next.title}. ${next.message}`);
  }, [booking]);

  const markSeen = useCallback((id: string, status: BookingStatus) => {
    lastSeen.current = { id, status };
  }, []);

  const dismiss = useCallback(() => setNotice(null), []);

  return { notice, dismiss, markSeen };
}
