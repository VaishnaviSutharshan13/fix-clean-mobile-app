// Next-slot labels for provider cards and profiles (pure, unit-tested).
import { addDays, formatBookingDate, formatTimeSlot } from './dates';

export type NextSlot = { date: string; timeSlot: string } | null;

// True when the provider still has an open arrival window today.
export function isAvailableToday(slot: NextSlot, today: string): boolean {
  return !!slot && slot.date === today;
}

// "Today, 2:00 PM", "Tomorrow, 8:00 AM" or "Thu, 8 Oct, 10:00 AM".
export function formatNextSlot(slot: NextSlot, today: string): string | null {
  if (!slot) return null;
  const start = formatTimeSlot(slot.timeSlot).split(' – ')[0];
  const day =
    slot.date === today ? 'Today' : slot.date === addDays(today, 1) ? 'Tomorrow' : formatBookingDate(slot.date, false);
  return `${day}, ${start}`;
}
