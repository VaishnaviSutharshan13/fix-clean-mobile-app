import { BookingStatus } from '../bookings/booking-status.js';
import {
  bookingNotification,
  formatDate,
  formatLKR,
  formatSlot,
  verificationNotification,
  type BookingFacts,
} from './notification-messages.js';
import { NotificationType } from './notification-type.js';

const facts: BookingFacts = {
  reference: 'FC-ABC123',
  serviceName: 'Tap Repair',
  scheduledDate: '2026-10-08',
  timeSlot: '10:00-12:00',
  total: 12500,
  customerName: 'Nadeesha Perera',
  providerName: 'Sunil Fernando',
};

describe('notification messages', () => {
  it('formats dates, slots and prices', () => {
    expect(formatDate('2026-10-08')).toBe('Thu, 8 Oct');
    expect(formatSlot('12:00-14:00')).toBe('12:00 PM – 2:00 PM');
    expect(formatLKR(1250000)).toBe('Rs. 1,250,000');
  });

  it('sends provider decisions to the customer', () => {
    expect(bookingNotification(BookingStatus.Confirmed, facts)).toEqual({
      to: 'customer',
      type: NotificationType.BookingConfirmed,
      title: 'Booking confirmed',
      message:
        'Sunil Fernando accepted your booking. Expected arrival: Thu, 8 Oct, 10:00 AM – 12:00 PM. You can now call the provider.',
    });
    for (const status of [BookingStatus.Declined, BookingStatus.OnTheWay, BookingStatus.Completed]) {
      expect(bookingNotification(status, facts)?.to).toBe('customer');
    }
    expect(bookingNotification(BookingStatus.Completed, facts)?.message).toContain('Rs. 12,500');
  });

  it('sends customer actions to the provider', () => {
    expect(bookingNotification(BookingStatus.Requested, facts)).toMatchObject({
      to: 'provider',
      type: NotificationType.BookingRequested,
      message: 'Nadeesha Perera requested Tap Repair for Thu, 8 Oct, 10:00 AM – 12:00 PM (FC-ABC123).',
    });
    expect(bookingNotification(BookingStatus.Cancelled, facts)).toMatchObject({
      to: 'provider',
      type: NotificationType.BookingCancelled,
    });
  });

  it('describes the verification outcome, with the optional reason', () => {
    expect(verificationNotification(true).type).toBe(NotificationType.ProviderVerified);
    expect(verificationNotification(false).message).toBe('Your provider application was not approved.');
    expect(verificationNotification(false, 'Missing ID').message).toBe(
      'Your provider application was not approved. Reason: Missing ID',
    );
  });
});
