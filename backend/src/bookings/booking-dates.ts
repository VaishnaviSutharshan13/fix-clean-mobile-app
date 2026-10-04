import { TimeSlot } from './booking-status.js';

const SRI_LANKA_TZ = 'Asia/Colombo';
export const MAX_DAYS_AHEAD = 60;

// Today's date and the current hour in Sri Lanka, independent of server timezone.
export function sriLankaNow(now = new Date()): { date: string; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SRI_LANKA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    hour: Number(get('hour')),
    minute: Number(get('minute')),
  };
}

export function isRealCalendarDate(value: string): boolean {
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d!));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m! - 1 && date.getUTCDate() === d;
}

function daysBetween(from: string, to: string): number {
  const toUtc = (v: string) => {
    const [y, m, d] = v.split('-').map(Number);
    return Date.UTC(y!, m! - 1, d!);
  };
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000);
}

// Returns a user-facing error message, or null when the slot can be booked.
export function validateSchedule(date: string, slot: TimeSlot, now = new Date()): string | null {
  if (!isRealCalendarDate(date)) return 'Please choose a valid date';

  const today = sriLankaNow(now);
  const diff = daysBetween(today.date, date);
  if (diff < 0) return 'The booking date cannot be in the past';
  if (diff > MAX_DAYS_AHEAD) return `Bookings can be made up to ${MAX_DAYS_AHEAD} days in advance`;

  if (diff === 0) {
    const slotStartHour = Number(slot.slice(0, 2));
    if (slotStartHour <= today.hour) return 'That time window has already started. Please choose a later one';
  }
  return null;
}
