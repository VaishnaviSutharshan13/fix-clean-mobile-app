import { describe, expect, it } from 'vitest';

import type { ProviderJob } from '../../types/providerJob';
import { jobStageLabel, mapsSearchUrl } from '../providerJob';
import {
  filterJobsByDay,
  formatCompactLKR,
  isShiftOn,
  offDaysNotice,
  relativeDayLabel,
  SHIFTS,
  toggleDay,
  toggleShift,
} from '../providerSchedule';

const [morning, afternoon, evening] = SHIFTS;
const ALL = ['08:00-10:00', '10:00-12:00', '12:00-14:00', '14:00-16:00', '16:00-18:00'];

function job(partial: Partial<ProviderJob>): ProviderJob {
  return {
    id: 'j1',
    reference: 'FC-ABC123',
    status: 'requested',
    statusHistory: [],
    service: { id: 's1', name: 'Tap Repair', category: 'plumbing' },
    scheduledDate: '2026-10-05',
    timeSlot: '10:00-12:00',
    problemDescription: 'Leak',
    pricing: { servicePrice: 2000, visitFee: 500, total: 2500, currency: 'LKR' },
    paymentMethod: 'cash_on_service',
    customer: { name: 'Nadeesha Perera', avatarUrl: null },
    location: { city: 'Jaffna' },
    contactShared: false,
    actions: { accept: true, decline: true, startTrip: false, complete: false },
    createdAt: '',
    updatedAt: '',
    ...partial,
  };
}

describe('shift windows (Manage Availability)', () => {
  it('maps every customer arrival window to exactly one shift', () => {
    expect(SHIFTS.flatMap((s) => s.slots)).toEqual(ALL);
  });

  it('detects and toggles whole shifts, keeping chronological order', () => {
    expect(isShiftOn(ALL, morning)).toBe(true);
    const noMorning = toggleShift(ALL, morning);
    expect(noMorning).toEqual(['12:00-14:00', '14:00-16:00', '16:00-18:00']);
    expect(isShiftOn(noMorning, morning)).toBe(false);
    expect(toggleShift(noMorning, morning)).toEqual(ALL);
    expect(toggleShift(['16:00-18:00'], afternoon)).toEqual(['12:00-14:00', '14:00-16:00', '16:00-18:00']);
    expect(isShiftOn(['14:00-16:00'], afternoon)).toBe(false); // partially on counts as off
    expect(toggleShift(ALL, evening)).not.toContain('16:00-18:00');
  });
});

describe('working days', () => {
  it('toggles days and keeps them sorted', () => {
    expect(toggleDay([1, 2, 3], 0)).toEqual([0, 1, 2, 3]);
    expect(toggleDay([0, 1, 2], 1)).toEqual([0, 2]);
  });

  it('describes days off', () => {
    expect(offDaysNotice([0, 1, 2, 3, 4, 5, 6])).toBeNull();
    expect(offDaysNotice([1, 2, 3, 4, 5, 6])).toBe("Sunday off — customers can't request bookings on that day.");
    expect(offDaysNotice([1, 2, 3, 4, 5])).toBe(
      "Saturday and Sunday off — customers can't request bookings on those days.",
    );
    expect(offDaysNotice([])).toMatch(/No working days/);
  });
});

describe('booking requests helpers', () => {
  const jobs = [
    job({ id: 'a', scheduledDate: '2026-10-04' }),
    job({ id: 'b', scheduledDate: '2026-10-05' }),
    job({ id: 'c', scheduledDate: '2026-10-09' }),
  ];

  it('filters requests by Today / Tomorrow', () => {
    expect(filterJobsByDay(jobs, 'all', '2026-10-04')).toHaveLength(3);
    expect(filterJobsByDay(jobs, 'today', '2026-10-04').map((j) => j.id)).toEqual(['a']);
    expect(filterJobsByDay(jobs, 'tomorrow', '2026-10-04').map((j) => j.id)).toEqual(['b']);
  });

  it('labels relative days and compact earnings', () => {
    expect(relativeDayLabel('2026-10-04', '2026-10-04')).toBe('Today');
    expect(relativeDayLabel('2026-10-05', '2026-10-04')).toBe('Tomorrow');
    expect(relativeDayLabel('2026-10-09', '2026-10-04')).toBe('');
    expect(formatCompactLKR(7500)).toBe('Rs. 7.5k');
    expect(formatCompactLKR(3000)).toBe('Rs. 3k');
    expect(formatCompactLKR(0)).toBe('Rs. 0');
  });
});

describe('customer location helpers', () => {
  it('only builds a maps link once the address is shared', () => {
    expect(mapsSearchUrl(job({}))).toBeNull();
    expect(mapsSearchUrl(job({ location: { city: 'Jaffna', street: '25 Kandy Road' } }))).toBe(
      'https://www.google.com/maps/search/?api=1&query=25%20Kandy%20Road%2C%20Jaffna%2C%20Sri%20Lanka',
    );
  });

  it('labels each job stage', () => {
    expect(jobStageLabel(job({ status: 'confirmed' }))).toBe('CONFIRMED • READY TO DEPART');
    expect(jobStageLabel(job({ status: 'on_the_way' }))).toBe('ON THE WAY TO CUSTOMER');
    expect(jobStageLabel(job({ status: 'cancelled' }))).toBe('CANCELLED BY CUSTOMER');
  });
});
