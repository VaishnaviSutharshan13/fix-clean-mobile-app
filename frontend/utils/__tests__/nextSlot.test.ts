import { describe, expect, it } from 'vitest';

import { formatNextSlot, isAvailableToday } from '../nextSlot';

const TODAY = '2026-10-06';

describe('next slot labels', () => {
  it('formats today, tomorrow and later dates', () => {
    expect(formatNextSlot({ date: TODAY, timeSlot: '14:00-16:00' }, TODAY)).toBe('Today, 2:00 PM');
    expect(formatNextSlot({ date: '2026-10-07', timeSlot: '08:00-10:00' }, TODAY)).toBe('Tomorrow, 8:00 AM');
    expect(formatNextSlot({ date: '2026-10-08', timeSlot: '10:00-12:00' }, TODAY)).toBe('Thu, 8 Oct, 10:00 AM');
    expect(formatNextSlot(null, TODAY)).toBeNull();
  });

  it('is available today only when the next open window is today', () => {
    expect(isAvailableToday({ date: TODAY, timeSlot: '16:00-18:00' }, TODAY)).toBe(true);
    expect(isAvailableToday({ date: '2026-10-07', timeSlot: '08:00-10:00' }, TODAY)).toBe(false);
    expect(isAvailableToday(null, TODAY)).toBe(false);
  });
});
