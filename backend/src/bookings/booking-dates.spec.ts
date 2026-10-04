import { isRealCalendarDate, sriLankaNow, validateSchedule } from './booking-dates.js';

// 2026-10-04 09:30 in Sri Lanka (UTC+5:30) = 04:00 UTC
const NOW = new Date('2026-10-04T04:00:00Z');

describe('booking dates', () => {
  it('computes Sri Lanka local date and hour regardless of server timezone', () => {
    expect(sriLankaNow(NOW)).toEqual({ date: '2026-10-04', hour: 9, minute: 30 });
    // 20:00 UTC is already the next day in Sri Lanka
    expect(sriLankaNow(new Date('2026-10-04T20:00:00Z')).date).toBe('2026-10-05');
  });

  it('rejects impossible calendar dates', () => {
    expect(isRealCalendarDate('2026-02-30')).toBe(false);
    expect(isRealCalendarDate('2026-02-28')).toBe(true);
  });

  it('rejects past dates and dates too far ahead', () => {
    expect(validateSchedule('2026-10-03', '10:00-12:00', NOW)).toMatch(/past/);
    expect(validateSchedule('2026-12-31', '10:00-12:00', NOW)).toMatch(/60 days/);
  });

  it('rejects time windows that have already started today', () => {
    expect(validateSchedule('2026-10-04', '08:00-10:00', NOW)).toMatch(/already started/);
    expect(validateSchedule('2026-10-04', '10:00-12:00', NOW)).toBeNull();
  });

  it('accepts a valid future slot', () => {
    expect(validateSchedule('2026-10-05', '08:00-10:00', NOW)).toBeNull();
  });
});
