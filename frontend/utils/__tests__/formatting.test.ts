import { describe, expect, it } from 'vitest';

import { addDays, daysBetween, formatBookingDate, formatDateTime, formatTimeSlot, sriLankaToday } from '../dates';
import { formatLKR, formatLKRCompact } from '../money';

describe('date formatting (Sri Lanka time, engine independent)', () => {
  it('formats calendar dates', () => {
    expect(formatBookingDate('2026-10-05')).toBe('Mon, 5 Oct 2026');
    expect(formatBookingDate('2026-10-05', false)).toBe('Mon, 5 Oct');
  });

  it('formats arrival windows', () => {
    expect(formatTimeSlot('08:00-10:00')).toBe('8:00 AM – 10:00 AM');
    expect(formatTimeSlot('12:00-14:00')).toBe('12:00 PM – 2:00 PM');
  });

  it('converts timestamps to Sri Lanka time (UTC+05:30)', () => {
    expect(formatDateTime('2026-10-04T04:00:00.000Z')).toBe('4 Oct, 9:30 AM');
    expect(formatDateTime('2026-10-04T19:00:00.000Z')).toBe('5 Oct, 12:30 AM');
  });

  it('computes today in Sri Lanka, not the device timezone', () => {
    expect(sriLankaToday(new Date('2026-10-04T18:29:00Z'))).toEqual({ date: '2026-10-04', hour: 23 });
    expect(sriLankaToday(new Date('2026-10-04T18:31:00Z'))).toEqual({ date: '2026-10-05', hour: 0 });
  });

  it('does calendar arithmetic', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(daysBetween('2026-10-04', '2026-10-08')).toBe(4);
  });
});

describe('formatLKR', () => {
  it('uses Rs. with thousands separators', () => {
    expect(formatLKR(2500)).toBe('Rs. 2,500');
    expect(formatLKR(500)).toBe('Rs. 500');
    expect(formatLKR(1234567)).toBe('Rs. 1,234,567');
  });
});

describe('formatLKRCompact', () => {
  it('keeps large totals short enough for narrow KPI tiles', () => {
    expect(formatLKRCompact(950)).toBe('Rs. 950');
    expect(formatLKRCompact(15_400)).toBe('Rs. 15k');
    expect(formatLKRCompact(999_600)).toBe('Rs. 1M');
    expect(formatLKRCompact(3_040_800)).toBe('Rs. 3M');
    expect(formatLKRCompact(3_250_000)).toBe('Rs. 3.3M');
  });
});
