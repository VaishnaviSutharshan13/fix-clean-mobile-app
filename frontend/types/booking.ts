import type { ServiceCategory } from './provider';

export type BookingStatus =
  | 'requested'
  | 'confirmed'
  | 'on_the_way'
  | 'completed'
  | 'declined'
  | 'cancelled';

// Must match backend/src/bookings/booking-status.ts
export const TIME_SLOTS = ['08:00-10:00', '10:00-12:00', '12:00-14:00', '14:00-16:00', '16:00-18:00'] as const;
export type TimeSlot = (typeof TIME_SLOTS)[number];

export interface BookingAddress {
  street: string;
  city: string;
  landmark: string;
}

export interface Booking {
  id: string;
  reference: string;
  status: BookingStatus;
  statusHistory: { status: BookingStatus; changedAt: string; note?: string }[];
  service: { id: string; name: string; category: ServiceCategory };
  scheduledDate: string;
  timeSlot: TimeSlot;
  address: BookingAddress;
  problemDescription: string;
  pricing: { servicePrice: number; visitFee: number; total: number; currency: string };
  paymentMethod: 'cash_on_service';
  cancellationReason?: string;
  provider: { id: string; name: string; headline: string; serviceArea: string; phone?: string };
  canModify: boolean;
  canCancel: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingPayload {
  providerId: string;
  serviceId: string;
  scheduledDate: string;
  timeSlot: TimeSlot;
  address: { street: string; city: string; landmark?: string };
  problemDescription: string;
}

export type UpdateBookingPayload = Partial<Omit<CreateBookingPayload, 'providerId'>>;
