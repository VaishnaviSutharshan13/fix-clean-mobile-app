import type { BookingStatus, TimeSlot } from './booking';
import type { ServiceCategory } from './provider';

// A booking as the assigned provider sees it. `location.street`,
// `location.landmark` and `customer.phone` are only sent by the API once the
// booking is confirmed (NFR5).
export interface ProviderJob {
  id: string;
  reference: string;
  status: BookingStatus;
  statusHistory: { status: BookingStatus; changedAt: string; note?: string }[];
  service: { id: string; name: string; category: ServiceCategory };
  scheduledDate: string;
  timeSlot: TimeSlot;
  problemDescription: string;
  pricing: { servicePrice: number; visitFee: number; total: number; currency: string };
  paymentMethod: 'cash_on_service';
  customer: { name: string; phone?: string };
  location: { city: string; street?: string; landmark?: string };
  contactShared: boolean;
  cancellationReason?: string;
  actions: { accept: boolean; decline: boolean; startTrip: boolean; complete: boolean };
  createdAt: string;
  updatedAt: string;
}

export interface ProviderDashboard {
  pendingRequests: number;
  todayJobs: number;
  todayCompleted: number;
  todayEarnings: number;
  activeJobs: number;
  completedJobs: number;
  nextJob: ProviderJob | null;
  upcomingJobs: ProviderJob[];
  recentRequests: ProviderJob[];
}

export type ProviderJobScope = 'requests' | 'active' | 'history' | 'all';
export type ProviderJobAction = 'accept' | 'decline' | 'on-the-way' | 'complete';
