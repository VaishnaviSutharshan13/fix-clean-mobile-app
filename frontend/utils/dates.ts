import type { TimeSlot } from '../types/booking';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Sri Lanka is UTC+05:30 all year (no daylight saving). Formatting is done by
// hand so output is identical on Hermes (Android/iOS), browsers and Node,
// whose Intl/toLocale* implementations format dates differently.
const SRI_LANKA_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function toSriLankaClock(date: Date): Date {
  // A Date whose UTC fields hold the Sri Lanka wall-clock time.
  return new Date(date.getTime() + SRI_LANKA_OFFSET_MS);
}

// "2026-10-06" → "Tue, 6 Oct 2026" (dates are calendar dates, no timezone shift).
export function formatBookingDate(isoDate: string, withYear = true): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d!));
  const base = `${WEEKDAYS[date.getUTCDay()]}, ${d} ${MONTHS[m! - 1]}`;
  return withYear ? `${base} ${y}` : base;
}

// "10:00-12:00" → "10:00 AM – 12:00 PM"
export function formatTimeSlot(slot: TimeSlot | string): string {
  return slot
    .split('-')
    .map((part) => {
      const [h, m] = part.split(':').map(Number);
      const suffix = h! >= 12 ? 'PM' : 'AM';
      const hour12 = h! % 12 === 0 ? 12 : h! % 12;
      return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
    })
    .join(' – ');
}

// ISO timestamp → "4 Oct, 9:30 AM" in Sri Lanka time.
export function formatDateTime(iso: string): string {
  const t = toSriLankaClock(new Date(iso));
  const h = t.getUTCHours();
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const minutes = String(t.getUTCMinutes()).padStart(2, '0');
  return `${t.getUTCDate()} ${MONTHS[t.getUTCMonth()]}, ${hour12}:${minutes} ${h >= 12 ? 'PM' : 'AM'}`;
}

export function formatRelative(iso: string, now = new Date()): string {
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}

// Today's date and hour in Sri Lanka time (matches the server's booking rules).
export function sriLankaToday(now = new Date()): { date: string; hour: number } {
  const t = toSriLankaClock(now);
  return { date: t.toISOString().slice(0, 10), hour: t.getUTCHours() };
}

export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d! + days));
  return date.toISOString().slice(0, 10);
}

// Whole days from `fromIso` to `toIso` (calendar dates, "YYYY-MM-DD").
export function daysBetween(fromIso: string, toIso: string): number {
  const toUtc = (v: string) => {
    const [y, m, d] = v.split('-').map(Number);
    return Date.UTC(y!, m! - 1, d!);
  };
  return Math.round((toUtc(toIso) - toUtc(fromIso)) / 86_400_000);
}
