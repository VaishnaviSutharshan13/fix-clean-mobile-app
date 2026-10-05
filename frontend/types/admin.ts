import type { BookingStatus } from './booking';
import type { Availability, ProviderServiceItem, ServiceCategory, VerificationChecks, VerificationStatus } from './provider';
import type { UserRole } from './user';

// Shapes returned by the Admin API (backend/src/admin/admin.types.ts).

export type ComplaintStatus = 'open' | 'in_review' | 'resolved';
export type ComplaintCategory = 'service_quality' | 'no_show' | 'pricing' | 'behaviour' | 'damage' | 'other';

export interface AdminList<T, K extends string> {
  items: T[];
  counts: Record<K | 'all', number>;
}

export interface PersonRef {
  id: string;
  name: string;
}

export interface AdminProviderListItem {
  id: string;
  name: string;
  category: ServiceCategory;
  headline: string;
  serviceArea: string;
  experienceYears: number;
  verificationStatus: VerificationStatus;
  servicesCount: number;
  startingPrice: number | null;
  verificationChecks: VerificationChecks;
  accountActive: boolean;
  submittedAt: string;
  reviewedAt: string | null;
}

export interface AdminProviderDetails extends AdminProviderListItem {
  email: string;
  phone: string;
  bio: string;
  visitFee: number;
  services: ProviderServiceItem[];
  availability: Availability;
  availabilityUpdatedAt: string | null;
  rejectionReason: string | null;
  verifiedAt: string | null;
  reviewedBy: string | null;
  servicesUpdatedAt: string | null;
  servicesChangedSinceApproval: boolean;
  bookingStats: { total: number; active: number; completed: number };
  approval: { ready: boolean; problems: string[] };
}

export interface AdminUserListItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  provider: { verificationStatus: VerificationStatus; category: ServiceCategory; serviceArea: string } | null;
}

export interface AdminUserDetails extends AdminUserListItem {
  suspendedAt: string | null;
  bookingStats: { total: number; active: number; completed: number; cancelledOrDeclined: number };
  complaintCount: number;
  canChangeStatus: boolean;
}

export interface AdminBookingListItem {
  id: string;
  reference: string;
  status: BookingStatus;
  service: { name: string; category: ServiceCategory };
  scheduledDate: string;
  timeSlot: string;
  city: string;
  total: number;
  customer: PersonRef;
  provider: PersonRef;
  lastUpdate: { status: BookingStatus; changedAt: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineEntry<S extends string> {
  status: S;
  changedAt: string;
  note?: string;
  by: { name: string; role: UserRole } | null;
}

export interface AdminBookingDetails extends AdminBookingListItem {
  problemDescription: string;
  pricing: { servicePrice: number; visitFee: number; total: number; currency: string };
  paymentMethod: string;
  cancellationReason: string | null;
  statusHistory: TimelineEntry<BookingStatus>[];
  complaints: { id: string; reference: string; status: ComplaintStatus }[];
}

export interface AdminComplaintListItem {
  id: string;
  reference: string;
  status: ComplaintStatus;
  category: ComplaintCategory;
  subject: string;
  description: string;
  customer: PersonRef;
  provider: PersonRef;
  booking: { id: string; reference: string; status: BookingStatus; serviceName: string } | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface AdminComplaintDetails extends AdminComplaintListItem {
  resolutionNote: string | null;
  statusHistory: TimelineEntry<ComplaintStatus>[];
  allowedTransitions: ComplaintStatus[];
}

export interface AdminDashboard {
  users: { total: number; customers: number; providers: number; admins: number; suspended: number };
  providers: { pending: number; verified: number; rejected: number; bookable: number };
  bookings: {
    total: number;
    active: number;
    completed: number;
    cancelledOrDeclined: number;
    byStatus: Record<BookingStatus, number>;
  };
  complaints: { open: number; inReview: number; resolved: number; unresolved: number };
  pendingVerifications: AdminProviderListItem[];
  recentBookings: AdminBookingListItem[];
  generatedAt: string;
}

export type ProviderStatusFilter = VerificationStatus | 'all';
export type CheckKey = keyof VerificationChecks;
