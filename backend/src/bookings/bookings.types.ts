import type { ServiceCategory } from '../providers/schemas/provider-profile.schema.js';
import type { BookingStatus, PaymentMethod } from './booking-status.js';

export interface CustomerBookingView {
  id: string;
  reference: string;
  status: BookingStatus;
  statusHistory: { status: BookingStatus; changedAt: Date; note?: string }[];
  service: { id: string; name: string; category: ServiceCategory };
  scheduledDate: string;
  timeSlot: string;
  address: { street: string; city: string; landmark: string };
  problemDescription: string;
  pricing: { servicePrice: number; visitFee: number; total: number; currency: string };
  paymentMethod: PaymentMethod;
  cancellationReason?: string;
  provider: {
    id: string;
    name: string;
    headline: string;
    serviceArea: string;
    // Only shared once the provider has confirmed the booking.
    phone?: string;
    avatarUrl: string | null;
  };
  canModify: boolean;
  canCancel: boolean;
  createdAt: Date;
  updatedAt: Date;
}
