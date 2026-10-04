import type { ServiceCategory } from '../providers/schemas/provider-profile.schema.js';
import type { BookingStatus, PaymentMethod } from './booking-status.js';

// What a provider may see about one of their bookings. The exact address and
// the customer's phone are only included once the booking is confirmed (NFR5).
export interface ProviderBookingView {
  id: string;
  reference: string;
  status: BookingStatus;
  statusHistory: { status: BookingStatus; changedAt: Date; note?: string }[];
  service: { id: string; name: string; category: ServiceCategory };
  scheduledDate: string;
  timeSlot: string;
  problemDescription: string;
  pricing: { servicePrice: number; visitFee: number; total: number; currency: string };
  paymentMethod: PaymentMethod;
  customer: { name: string; phone?: string };
  location: { city: string; street?: string; landmark?: string };
  // True once the exact address and phone are shared with the provider.
  contactShared: boolean;
  cancellationReason?: string;
  actions: { accept: boolean; decline: boolean; startTrip: boolean; complete: boolean };
  createdAt: Date;
  updatedAt: Date;
}

export interface ProviderDashboardView {
  pendingRequests: number;
  todayJobs: number;
  todayCompleted: number;
  todayEarnings: number;
  activeJobs: number;
  completedJobs: number;
  nextJob: ProviderBookingView | null;
  upcomingJobs: ProviderBookingView[];
  recentRequests: ProviderBookingView[];
}
