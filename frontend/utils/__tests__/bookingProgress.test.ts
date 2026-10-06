import { describe, expect, it } from 'vitest';

import type { Booking, BookingStatus } from '../../types/booking';
import { detectStatusChange, getArrivalInfo, getStatusChangeNotice } from '../bookingProgress';

// 2026-10-04 09:30 Sri Lanka time
const NOW = new Date('2026-10-04T04:00:00Z');

function makeBooking(status: BookingStatus, history: BookingStatus[] = [status]): Booking {
  return {
    id: 'b1',
    reference: 'FC-ABC123',
    status,
    statusHistory: history.map((s, i) => ({ status: s, changedAt: new Date(Date.UTC(2026, 9, 4, 3, i * 10)).toISOString() })),
    service: { id: 's1', name: 'Tap Repair', category: 'plumbing' },
    scheduledDate: '2026-10-05',
    timeSlot: '10:00-12:00',
    address: { street: '25 Kandy Road', city: 'Jaffna', landmark: '' },
    problemDescription: 'Leaking tap',
    pricing: { servicePrice: 2000, visitFee: 500, total: 2500, currency: 'LKR' },
    paymentMethod: 'cash_on_service',
    provider: { id: 'p1', name: 'Sunil Fernando', headline: 'Plumber', serviceArea: 'Jaffna', avatarUrl: null },
    canModify: status === 'requested',
    canCancel: status === 'requested' || status === 'confirmed',
    createdAt: '2026-10-04T03:00:00.000Z',
    updatedAt: '2026-10-04T03:00:00.000Z',
  };
}

describe('detectStatusChange', () => {
  it('never notifies on the first load', () => {
    expect(detectStatusChange(undefined, 'confirmed')).toBeNull();
  });

  it('ignores polls where the status did not change', () => {
    expect(detectStatusChange('requested', 'requested')).toBeNull();
  });

  it.each<[BookingStatus, BookingStatus]>([
    ['requested', 'confirmed'],
    ['confirmed', 'on_the_way'],
    ['on_the_way', 'completed'],
    ['requested', 'declined'],
    ['confirmed', 'cancelled'],
  ])('reports %s → %s', (from, to) => {
    expect(detectStatusChange(from, to)).toBe(to);
  });
});

describe('getStatusChangeNotice', () => {
  it('describes a confirmation with the scheduled arrival window', () => {
    const notice = getStatusChangeNotice(makeBooking('confirmed'));
    expect(notice).toMatchObject({ title: 'Booking confirmed', tone: 'success' });
    expect(notice?.message).toContain('Sunil Fernando accepted your booking');
    expect(notice?.message).toContain('Expected arrival: Mon, 5 Oct, 10:00 AM – 12:00 PM');
  });

  it('describes on the way, completed, declined and cancelled', () => {
    expect(getStatusChangeNotice(makeBooking('on_the_way'))?.title).toBe('Provider on the way');
    expect(getStatusChangeNotice(makeBooking('completed'))?.message).toContain('Rs. 2,500');
    expect(getStatusChangeNotice(makeBooking('declined'))).toMatchObject({ title: 'Booking declined', tone: 'danger' });
    expect(getStatusChangeNotice(makeBooking('cancelled'))?.title).toBe('Booking cancelled');
  });

  it('has nothing to announce for a requested booking', () => {
    expect(getStatusChangeNotice(makeBooking('requested'))).toBeNull();
  });
});

describe('getArrivalInfo', () => {
  it('shows the requested window while waiting for the provider', () => {
    expect(getArrivalInfo(makeBooking('requested'), NOW)).toEqual({
      kind: 'requested',
      title: 'Requested arrival window',
      value: 'Tomorrow · Mon, 5 Oct · 10:00 AM – 12:00 PM',
      detail: "Waiting for Sunil Fernando to confirm. You'll be notified here when they respond.",
    });
  });

  it('labels the confirmed window as the expected arrival, based on the schedule', () => {
    const info = getArrivalInfo(makeBooking('confirmed', ['requested', 'confirmed']), NOW);
    expect(info).toMatchObject({ kind: 'expected', title: 'Expected arrival' });
    expect(info?.detail).toMatch(/^Sunil Fernando confirmed on .+\. Based on your scheduled arrival window\.$/);
  });

  it('never claims live tracking while the provider is on the way', () => {
    const info = getArrivalInfo(makeBooking('on_the_way', ['requested', 'confirmed', 'on_the_way']), NOW);
    expect(info?.value).toBe('Expected within 10:00 AM – 12:00 PM');
    expect(info?.detail).toContain('Live location tracking is not available');
  });

  it('shows completion details', () => {
    const info = getArrivalInfo(makeBooking('completed', ['requested', 'confirmed', 'on_the_way', 'completed']), NOW);
    expect(info).toMatchObject({ kind: 'completed', title: 'Service completed' });
    expect(info?.detail).toBe('Pay Rs. 2,500 in cash to Sunil Fernando.');
  });

  it('shows nothing for cancelled or declined bookings', () => {
    expect(getArrivalInfo(makeBooking('cancelled'), NOW)).toBeNull();
    expect(getArrivalInfo(makeBooking('declined'), NOW)).toBeNull();
  });

  it('uses Today / In N days relative to Sri Lanka time', () => {
    const today = { ...makeBooking('requested'), scheduledDate: '2026-10-04' };
    const later = { ...makeBooking('requested'), scheduledDate: '2026-10-08' };
    expect(getArrivalInfo(today, NOW)?.value).toMatch(/^Today · /);
    expect(getArrivalInfo(later, NOW)?.value).toMatch(/^In 4 days · /);
  });
});
