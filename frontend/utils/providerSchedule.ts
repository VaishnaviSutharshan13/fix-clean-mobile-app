// Pure helpers for the Provider screens (unit-tested in utils/__tests__).
import type { ProviderJob } from '../types/providerJob';
import { addDays } from './dates';

// Manage Availability "Shift Windows" (Figma: Morning / Afternoon / Evening).
// Each shift covers the customer arrival windows offered on Book Service.
export const SHIFTS = [
  { key: 'morning', label: 'Morning Slot', range: '08:00 AM – 12:00 PM', slots: ['08:00-10:00', '10:00-12:00'] },
  { key: 'afternoon', label: 'Afternoon Slot', range: '12:00 PM – 04:00 PM', slots: ['12:00-14:00', '14:00-16:00'] },
  { key: 'evening', label: 'Evening Slot', range: '04:00 PM – 06:00 PM', slots: ['16:00-18:00'] },
] as const;

export type Shift = (typeof SHIFTS)[number];

const ALL_SLOTS = SHIFTS.flatMap((s) => s.slots) as string[];

export function isShiftOn(timeSlots: string[], shift: Shift): boolean {
  return shift.slots.every((slot) => timeSlots.includes(slot));
}

// Turns a whole shift on or off; result stays in chronological order.
export function toggleShift(timeSlots: string[], shift: Shift): string[] {
  const on = isShiftOn(timeSlots, shift);
  const next = new Set(timeSlots);
  for (const slot of shift.slots) {
    if (on) next.delete(slot);
    else next.add(slot);
  }
  return ALL_SLOTS.filter((slot) => next.has(slot));
}

// Working Days row in Figma order (Monday first). Values are getUTCDay() numbers.
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
export const WEEKDAY_LETTER: Record<number, string> = { 0: 'S', 1: 'M', 2: 'T', 3: 'W', 4: 'T', 5: 'F', 6: 'S' };
export const WEEKDAY_NAME: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

export function toggleDay(days: number[], day: number): number[] {
  const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day];
  return [...next].sort((a, b) => a - b);
}

// "Sunday off — customers can't request bookings on that day."
export function offDaysNotice(days: number[]): string | null {
  const off = WEEKDAY_ORDER.filter((d) => !days.includes(d)).map((d) => WEEKDAY_NAME[d]);
  if (off.length === 0) return null;
  if (off.length === 7) return 'No working days selected — customers cannot book you.';
  const list = off.length === 1 ? off[0] : `${off.slice(0, -1).join(', ')} and ${off[off.length - 1]}`;
  return `${list} off — customers can't request bookings on ${off.length === 1 ? 'that day' : 'those days'}.`;
}

export type JobDayFilter = 'all' | 'today' | 'tomorrow';

export function filterJobsByDay(jobs: ProviderJob[], filter: JobDayFilter, today: string): ProviderJob[] {
  if (filter === 'all') return jobs;
  const target = filter === 'today' ? today : addDays(today, 1);
  return jobs.filter((job) => job.scheduledDate === target);
}

// "Today", "Tomorrow" or "" for the Booking Requests date line.
export function relativeDayLabel(scheduledDate: string, today: string): string {
  if (scheduledDate === today) return 'Today';
  if (scheduledDate === addDays(today, 1)) return 'Tomorrow';
  return '';
}

// "Rs. 7.5k" style compact earnings for the dashboard KPI card.
export function formatCompactLKR(amount: number): string {
  if (amount >= 1000) {
    const k = amount / 1000;
    return `Rs. ${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return `Rs. ${amount}`;
}
