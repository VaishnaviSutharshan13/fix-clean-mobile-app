import { describe, expect, it } from 'vitest';

import type { AppNotification, NotificationType } from '../../types/notification';
import { latestUnreadBookingId, latestUnreadNotice } from '../notifications';

function make(id: string, type: NotificationType, minute: number, read = false): AppNotification {
  return {
    id,
    type,
    title: `Title ${id}`,
    message: `Message ${id}`,
    bookingId: 'b1',
    bookingReference: 'FC-ABC123',
    read,
    readAt: read ? '2026-10-04T05:00:00.000Z' : null,
    createdAt: new Date(Date.UTC(2026, 9, 4, 4, minute)).toISOString(),
  };
}

describe('latestUnreadNotice', () => {
  it('returns null when nothing is unread', () => {
    expect(latestUnreadNotice([])).toBeNull();
    expect(latestUnreadNotice([make('n1', 'booking_confirmed', 1, true)])).toBeNull();
  });

  it('shows the newest unread booking update and covers older unread ones', () => {
    const notice = latestUnreadNotice([
      make('n1', 'booking_confirmed', 1),
      make('n3', 'booking_completed', 3, true),
      make('n2', 'booking_on_the_way', 2),
    ]);
    expect(notice).toEqual({
      status: 'on_the_way',
      tone: 'info',
      title: 'Title n2',
      message: 'Message n2',
      ids: ['n1', 'n2'],
    });
  });

  it('maps each customer booking type to its banner status and tone', () => {
    expect(latestUnreadNotice([make('a', 'booking_confirmed', 1)])).toMatchObject({ status: 'confirmed', tone: 'success' });
    expect(latestUnreadNotice([make('a', 'booking_completed', 1)])).toMatchObject({ status: 'completed', tone: 'success' });
    expect(latestUnreadNotice([make('a', 'booking_declined', 1)])).toMatchObject({ status: 'declined', tone: 'danger' });
    expect(latestUnreadNotice([make('a', 'booking_cancelled', 1)])).toMatchObject({ status: 'cancelled', tone: 'danger' });
  });

  it('ignores provider-only types and notifications already dismissed on screen', () => {
    expect(latestUnreadNotice([make('a', 'booking_requested', 1), make('b', 'provider_verified', 2)])).toBeNull();
    const items = [make('n1', 'booking_confirmed', 1), make('n2', 'booking_on_the_way', 2)];
    expect(latestUnreadNotice(items, new Set(['n1', 'n2']))).toBeNull();
    expect(latestUnreadNotice(items, new Set(['n2']))).toMatchObject({ ids: ['n1'], status: 'confirmed' });
  });
});

describe('latestUnreadBookingId', () => {
  it('returns the booking of the newest unread customer booking update', () => {
    const items = [
      { ...make('n1', 'booking_confirmed', 1), bookingId: 'b1' },
      { ...make('n2', 'booking_on_the_way', 3), bookingId: 'b2' },
      { ...make('n3', 'booking_completed', 5, true), bookingId: 'b3' },
    ];
    expect(latestUnreadBookingId(items)).toBe('b2');
  });

  it('ignores read, provider-only and booking-less notifications', () => {
    expect(latestUnreadBookingId([])).toBeNull();
    expect(
      latestUnreadBookingId([
        make('a', 'booking_confirmed', 1, true),
        make('b', 'booking_requested', 2),
        { ...make('c', 'booking_declined', 3), bookingId: null },
      ]),
    ).toBeNull();
  });
});
