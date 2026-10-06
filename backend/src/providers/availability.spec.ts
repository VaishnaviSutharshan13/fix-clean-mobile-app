import { TIME_SLOTS } from '../bookings/booking-status.js';
import { nextOpenSlot, type AvailabilityView } from './availability.js';

const all: AvailabilityView = { isAvailable: true, workingDays: [0, 1, 2, 3, 4, 5, 6], timeSlots: [...TIME_SLOTS] };

// 2026-10-06 is a Tuesday (weekday 2).
describe('nextOpenSlot', () => {
  it('returns the first window that has not started yet today', () => {
    expect(nextOpenSlot(all, { date: '2026-10-06', hour: 9 })).toEqual({ date: '2026-10-06', timeSlot: '10:00-12:00' });
    expect(nextOpenSlot(all, { date: '2026-10-06', hour: 7 })).toEqual({ date: '2026-10-06', timeSlot: '08:00-10:00' });
  });

  it('moves to the next working day after the last window', () => {
    expect(nextOpenSlot(all, { date: '2026-10-06', hour: 16 })).toEqual({ date: '2026-10-07', timeSlot: '08:00-10:00' });
    const weekdaysOnly = { ...all, workingDays: [1, 2, 3, 4, 5] };
    // Friday evening → Monday.
    expect(nextOpenSlot(weekdaysOnly, { date: '2026-10-09', hour: 18 })).toEqual({ date: '2026-10-12', timeSlot: '08:00-10:00' });
  });

  it('respects shift windows', () => {
    const afternoons = { ...all, timeSlots: ['14:00-16:00', '16:00-18:00'] };
    expect(nextOpenSlot(afternoons, { date: '2026-10-06', hour: 9 })).toEqual({ date: '2026-10-06', timeSlot: '14:00-16:00' });
  });

  it('is null when off duty or nothing is open', () => {
    expect(nextOpenSlot({ ...all, isAvailable: false }, { date: '2026-10-06', hour: 9 })).toBeNull();
    expect(nextOpenSlot({ ...all, workingDays: [] }, { date: '2026-10-06', hour: 9 })).toBeNull();
  });
});
