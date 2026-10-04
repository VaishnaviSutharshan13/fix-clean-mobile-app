import type { Booking, CreateBookingPayload, UpdateBookingPayload } from '../types/booking';
import { apiRequest } from './api';

// Customer bookings. The customer is identified from the JWT on the server.
export const bookingService = {
  create(payload: CreateBookingPayload): Promise<Booking> {
    return apiRequest<Booking>('/bookings', { method: 'POST', body: payload });
  },

  listMine(scope: 'all' | 'active' = 'all'): Promise<Booking[]> {
    return apiRequest<Booking[]>('/bookings/me', { query: { scope } });
  },

  getMine(bookingId: string): Promise<Booking> {
    return apiRequest<Booking>(`/bookings/me/${encodeURIComponent(bookingId)}`);
  },

  update(bookingId: string, payload: UpdateBookingPayload): Promise<Booking> {
    return apiRequest<Booking>(`/bookings/me/${encodeURIComponent(bookingId)}`, {
      method: 'PATCH',
      body: payload,
    });
  },

  cancel(bookingId: string, reason?: string): Promise<Booking> {
    return apiRequest<Booking>(`/bookings/me/${encodeURIComponent(bookingId)}/cancel`, {
      method: 'PATCH',
      body: reason ? { reason } : {},
    });
  },
};
